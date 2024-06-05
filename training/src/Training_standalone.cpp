
#include "Types.h"
#include "Config.h"

#include "TwistyEnv.cpp"
#include "Network.cpp"
#include "ReplayBuffer.cpp"

#define RAPIDJSON_HAS_STDSTRING 1
#include "rapidjson/document.h"
#include <rapidjson/ostreamwrapper.h>
#include <rapidjson/writer.h>
#include "rapidjson/error/en.h"

#include <chrono>
#include <filesystem>
#include <fstream>
#include <streambuf>
#include <ranges>
#include <future>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Weverything"
#include "OpenGLWindow/SimpleOpenGL3App.h"
#include "ExampleBrowser/OpenGLGuiHelper.h"
#include "LinearMath/btVector3.h"
#pragma clang diagnostic pop

typedef std::shared_ptr<twistyenv::TwistyEnv> TwistyEnvPtr;
typedef Array<TwistyEnvPtr> TwistyEnvPtrs;

static const int epochs = 1000;
static const int epochSteps = 4000;
static const int totalSteps = epochs * epochSteps;
static const int trainingStartSteps = 1000;
static const int trainingInterval = 50;

static const int frameTime = 40;
static const float cameraDistance = 10;
static const float cameraYaw = 190;
static const float cameraPitch = -45;

static rapidjson::Document loadDocument(const String &filePath) {
  std::ifstream file(filePath);
  String content;
  file.seekg(0, std::ios::end);   
  content.reserve(file.tellg());
  file.seekg(0, std::ios::beg);
  content.assign(std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>());
  file.close();
  rapidjson::Document document;
  if (document.Parse(content).HasParseError()) {
    std::cerr << "Input is not a valid JSON (offset "
              << document.GetErrorOffset() << "): "
              << rapidjson::GetParseError_En(document.GetParseError())
              << std::endl;
    exit(1);
  }
  return document;
}

static void saveDocument(const rapidjson::Document &document, const String &filePath) {
  std::ofstream file(filePath);
  rapidjson::OStreamWrapper stream(file);
  rapidjson::Writer<rapidjson::OStreamWrapper> writer(stream);
  document.Accept(writer);
  file.close();
}

int main(int argc, char* argv[]) {
  auto testEnabled = false;
  auto printTestData = false;
  auto actorCount = 1;
  auto inputFileName = "";
  for (auto i = 1; i < argc; i++) {
    if (strcmp(argv[i], "-p") == 0) {
      printTestData = true;
    } else if (strcmp(argv[i], "-t") == 0) {
      testEnabled = true;
    } else if (strncmp(argv[i], "-a", 2) == 0) {
      actorCount = std::max(atoi(argv[i] + 2), 1);
    } else {
      inputFileName = argv[i];
    }
  }
  if (strlen(inputFileName) == 0) {
    std::cerr << "Usage: " << argv[0] << " FILEPATH" << std::endl;
    return 1;
  }

  const std::filesystem::path inputFilePath(inputFileName);

  auto document = loadDocument(inputFilePath.string());
  if (!document.HasMember("shapeData")) {
    std::cerr << "Shape data not found" << std::endl;
    return 1;
  }
  if (!document.HasMember("checkpoint")) {
    std::cerr << "Checkpoint not found" << std::endl;
    return 1;
  }
  if (!document["checkpoint"].HasMember("data")) {
    std::cerr << "Checkpoint data not found" << std::endl;
    return 1;
  }
  if (!document["checkpoint"].HasMember("time")) {
    std::cerr << "Checkpoint time not found" << std::endl;
    return 1;
  }
  if (!document.HasMember("config") ||
      !document["config"].HasMember("discount") ||
      !document["config"].HasMember("batchSize") ||
      !document["config"].HasMember("randomSteps") ||
      !document["config"].HasMember("replayBufferSize") ||
      !document["config"].HasMember("actorLearningRate") ||
      !document["config"].HasMember("criticLearningRate") ||
      !document["config"].HasMember("regularization") ||
      !document["config"].HasMember("interpolation") ||
      !document["config"].HasMember("hiddenLayerSizes")) {
    std::cerr << "Invalid config" << std::endl;
    return 1;
  }

  Config config;
  config.discount = document["config"]["discount"].GetFloat();
  config.batchSize = document["config"]["batchSize"].GetInt();
  config.randomSteps = document["config"]["randomSteps"].GetInt();
  config.replayBufferSize = document["config"]["replayBufferSize"].GetInt();
  config.actorLearningRate = document["config"]["actorLearningRate"].GetFloat();
  config.criticLearningRate = document["config"]["criticLearningRate"].GetFloat();
  config.regularization = document["config"]["regularization"].GetFloat();
  config.interpolation = document["config"]["interpolation"].GetFloat();
  config.hiddenLayerSizes.clear();
  for (const auto &value : document["config"]["hiddenLayerSizes"].GetArray()) {
    config.hiddenLayerSizes.push_back(value.GetInt());
  }

  std::filesystem::path outputFileName = inputFilePath.stem();
  outputFileName += "_out";
  outputFileName += inputFilePath.extension();
  auto outputFilePath = inputFilePath;
  outputFilePath.replace_filename(outputFileName);

  const String shapeData = document["shapeData"].GetString();

  TwistyEnvPtrs environments(actorCount);
  std::ranges::generate(environments, [&shapeData]() {
    return std::make_shared<twistyenv::TwistyEnv>(shapeData);
  });

  const auto observationLength = environments[0]->getObservation().size();
  if ((observationLength == 0) || (environments[0]->getActionLength() == 0)) {
    return 1;
  }

  const auto network = std::make_shared<Network>(config, observationLength, environments[0]->getActionLength());

  const auto replayBuffer = std::make_shared<ReplayBuffer>(config);

  if (!document["checkpoint"]["data"].IsNull()) {
    const String checkpointData(document["checkpoint"]["data"].GetString(),
                                document["checkpoint"]["data"].GetStringLength());
    network->load(checkpointData);
    std::cout << "Load checkpoint" << std::endl;
  }

  std::mutex mutex;
  auto checkpointNetwork = network->clone();

  // Testing
  std::thread testThread;
  if (testEnabled) {
    const auto testEnvironment = std::make_shared<twistyenv::TwistyEnv>(shapeData);

    testThread = std::thread([&mutex, &checkpointNetwork, testEnvironment, inputFilePath, printTestData]() {
      auto *app = new SimpleOpenGL3App(inputFilePath.stem().c_str(), 1600, 1600);
      auto *guiHelper = new OpenGLGuiHelper(app, false);
      guiHelper->setUpAxis(1);

      NetworkPtr testNetwork;
      std::unique_lock<std::mutex> lock(mutex, std::defer_lock);
      auto lastTime = std::chrono::steady_clock::now();

      while (!app->m_window->requestedExit()) {
        auto networkChanged = false;
        lock.lock();
        if (testNetwork != checkpointNetwork) {
          testNetwork = checkpointNetwork;
          networkChanged = true;
        }
        lock.unlock();

        if (networkChanged || testEnvironment->isDone() || testEnvironment->timeout()) {
          guiHelper->removeAllGraphicsInstances();

          testEnvironment->restart();
          for (const auto &shapeEntry : testEnvironment->getShapes()) {
            shapeEntry.second->setUserIndex(-1);
          }
          for (int i = 0; i < testEnvironment->getDynamicsWorld()->getNumCollisionObjects(); i++) {
            btCollisionObject *object = testEnvironment->getDynamicsWorld()->getCollisionObjectArray()[i];
            object->setUserIndex(-1);
          }

          guiHelper->autogenerateGraphicsObjects(testEnvironment->getDynamicsWorld());
        }

        const auto action = testNetwork->predict(testEnvironment->getObservation());
        if (printTestData) {
          std::cout << std::endl << testEnvironment->getMoveNumber() << std::endl;
          std::cout << std::fixed << std::showpos << std::setprecision(1);
          std::cout << "#";
          for (const auto o : testEnvironment->getObservation()) {
            std::cout << " " << o;
          }
          std::cout << std::endl;
          std::cout << "/";
          for (const auto a : action) {
            std::cout << " " << a;
          }
          std::cout << std::endl;
        }
        const auto reward = testEnvironment->step(action);
        if (printTestData) {
          std::cout << "= " << reward << std::endl;
          std::cout << std::resetiosflags(std::ios_base::fixed | std::ios_base::floatfield) << std::noshowpos;
        }

        const auto &cameraTarget = testEnvironment->getBaseBody()->getWorldTransform().getOrigin();
        guiHelper->resetCamera(cameraDistance, cameraYaw, cameraPitch,
                              cameraTarget.x(), cameraTarget.y(), cameraTarget.z());
        guiHelper->syncPhysicsToGraphics(testEnvironment->getDynamicsWorld());
        guiHelper->render(testEnvironment->getDynamicsWorld());
        app->swapBuffer();

        const auto elapsedTime = std::chrono::duration_cast<std::chrono::milliseconds>
                                (std::chrono::steady_clock::now() - lastTime).count();
        if (elapsedTime < frameTime) {
          std::this_thread::sleep_for(std::chrono::milliseconds(frameTime - elapsedTime));
        }
        lastTime = std::chrono::steady_clock::now();
      }

      delete guiHelper;
      delete app;
      exit(0);
    });
  }

  float totalValue = 0;
  int64_t playTime = 0;
  int64_t trainTime = 0;
  int trainStepCount = 0;
  ActorCriticLosses trainLosses = {0, 0};

  const auto startRunTime = std::chrono::steady_clock::now();
  auto startEpochTime = startRunTime;
  const auto jobSize = trainingInterval / actorCount;
  const auto jobRest = trainingInterval % actorCount;

  // Training
  for (int t = 0; t < totalSteps; t += trainingInterval) {
    const auto actors = (t < config.randomSteps) ? ActorPtrs() : network->cloneActors(actorCount);

    std::future<std::tuple<ActorCriticLosses, int64_t>> trainingJob;
    if (t >= trainingStartSteps) {
      trainingJob = std::async(std::launch::async, [network, replayBuffer]() {
        const auto startTime = std::chrono::steady_clock::now();
        ActorCriticLosses losses = {0, 0};
        for (int i = 0; i < trainingInterval; i++) {
          const auto l = network->train(replayBuffer->sampleBatch());
          losses.first += l.first;
          losses.second += l.second;
        }
        losses.first /= trainingInterval;
        losses.second /= trainingInterval;
        const auto elapsedTime = std::chrono::duration_cast<std::chrono::microseconds>(
            std::chrono::steady_clock::now() - startTime).count();
        return std::make_tuple(losses, elapsedTime);
      });
    }

    Array<std::future<std::tuple<SamplePtrs, float, int64_t>>> actorJobs(actorCount);
    for (auto i = 0; i < actorCount; i++) {
      const auto n = jobSize + (i == 0 ? jobRest : 0);
      const auto actor = (i < actors.size()) ? actors[i] : nullptr;
      const auto environment = environments[i];
      actorJobs[i] = std::async(std::launch::async, [n, actor, environment]() {
        const auto startTime = std::chrono::steady_clock::now();
        SamplePtrs samples;
        float value = 0;
        for (auto s = 0; s < n; s++) {
          if (environment->isDone() || environment->timeout()) {
            environment->restart();
          }
          auto observation = environment->getObservation();
          auto action = (actor == nullptr) ? environment->randomAction() : actor->predict(observation);
          const auto reward = environment->step(action);
          auto nextObservation = environment->getObservation();
          samples.push_back(std::make_shared<Sample>(std::move(observation),
              std::move(action), reward, std::move(nextObservation), environment->isDone()));
          value += reward;
        }
        const auto elapsedTime = std::chrono::duration_cast<std::chrono::microseconds>(
            std::chrono::steady_clock::now() - startTime).count();
        return std::make_tuple(samples, value, elapsedTime);
      });
    }

    if (trainingJob.valid()) {
      const auto &[losses, elapsedTime] = trainingJob.get();
      trainLosses.first += losses.first;
      trainLosses.second += losses.second;
      trainTime += elapsedTime;
      trainStepCount += trainingInterval;
    }

    int64_t actorElapsedTimeMin = 0;
    for (auto &actorJob : actorJobs) {
      const auto &[samples, value, elapsedTime] = actorJob.get();
      for (const auto &sample : samples) {
        replayBuffer->append(sample);
      }
      totalValue += value;
      actorElapsedTimeMin = std::max(elapsedTime, actorElapsedTimeMin);
    }
    playTime += actorElapsedTimeMin;

    if (((t + trainingInterval) % epochSteps == 0)) {
      const auto epochNumber = (t + trainingInterval) / epochSteps;

      {
        std::lock_guard<std::mutex> lock(mutex);
        checkpointNetwork = network->clone();
      }
      const auto checkpointData = checkpointNetwork->save();
      const auto checkpointTime = std::chrono::duration_cast<std::chrono::microseconds>
                                  (std::chrono::system_clock::now().time_since_epoch()).count();
      document["checkpoint"]["data"].SetString(checkpointData, document.GetAllocator());
      document["checkpoint"]["time"].SetInt64(checkpointTime);
      saveDocument(document, outputFilePath.string());

      const auto currentTime = std::chrono::steady_clock::now();
      const auto epochTime = std::chrono::duration_cast<std::chrono::microseconds>
                             (currentTime - startEpochTime).count();
      const auto totalTime = std::chrono::duration_cast<std::chrono::seconds>
                             (currentTime - startRunTime).count();
      startEpochTime = currentTime;

      std::cout << std::endl;
      std::cout << "Epoch " << epochNumber << std::endl;
      std::cout << "Value     : " << totalValue << std::endl;
      std::cout << "LossP     : " << (trainStepCount > 0 ? trainLosses.first / trainStepCount : trainLosses.first) << std::endl;
      std::cout << "LossV     : " << (trainStepCount > 0 ? trainLosses.second / trainStepCount : trainLosses.second) << std::endl;
      std::cout << "PlayTime  : " << playTime / 1000 << std::endl;
      std::cout << "TrainTime : " << trainTime / 1000 << std::endl;
      std::cout << "EpochTime : " << epochTime / 1000 << std::endl;
      std::cout << "TotalTime : " << totalTime / 60 << ":" << std::setfill('0') << std::setw(2) << totalTime % 60 << std::endl;

      totalValue = 0;
      playTime = 0;
      trainTime = 0;
      trainStepCount = 0;
      trainLosses = {0, 0};
    }
  }
}
