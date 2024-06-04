
#include "Types.h"
#include "Config.h"

#include "TwistyEnv.cpp"
#include "Network.cpp"
#include "Coach.cpp"

#define RAPIDJSON_HAS_STDSTRING 1
#include "rapidjson/document.h"
#include <rapidjson/ostreamwrapper.h>
#include <rapidjson/writer.h>
#include "rapidjson/error/en.h"

#include <chrono>
#include <filesystem>
#include <fstream>
#include <streambuf>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Weverything"
#include "OpenGLWindow/SimpleOpenGL3App.h"
#include "ExampleBrowser/OpenGLGuiHelper.h"
#include "LinearMath/btVector3.h"
#pragma clang diagnostic pop

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
  auto inputFileName = "";
  for (auto i = 1; i < argc; i++) {
    if (strcmp(argv[i], "-p") == 0) {
      printTestData = true;
    } else if (strcmp(argv[i], "-t") == 0) {
      testEnabled = true;
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

  const auto environment = std::make_shared<twistyenv::TwistyEnv>(shapeData);

  const auto observationLength = environment->getObservation().size();
  if ((observationLength == 0) || (environment->getActionLength() == 0)) {
    return 1;
  }

  const auto network = std::make_shared<Network>(config, observationLength, environment->getActionLength());

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

  Coach coach(config, environment, network);

  int playGameCount = 0;
  int playMoveCount = 0;
  float playCurrentValue = 0;
  float playTotalValue = 0;
  int trainTime = 0;
  int trainStepCount = 0;
  ActorCriticLosses trainLosses = {0, 0};

  const auto startRunTime = std::chrono::steady_clock::now();
  auto startEpochTime = startRunTime;

  // Training
  for (int t = 0; t < totalSteps; t++) {
    const auto reward = coach.step();
    playCurrentValue += reward;
    playMoveCount++;

    if (environment->isDone() || environment->timeout()) {
      playGameCount++;
      playTotalValue += playCurrentValue;
      playCurrentValue = 0;
    }

    if ((t >= trainingStartSteps) && ((t % trainingInterval) == 0)) {
      const auto startTrainTime = std::chrono::steady_clock::now();
      for (int i = 0; i < trainingInterval; i++) {
        const auto losses = coach.train();
        trainLosses.first += losses.first;
        trainLosses.second += losses.second;
        trainStepCount++;
      }
      trainTime += std::chrono::duration_cast<std::chrono::milliseconds>
                   (std::chrono::steady_clock::now() - startTrainTime).count();
    }

    if (((t + 1) % epochSteps == 0)) {
      const auto epochNumber = (t + 1) / epochSteps;

      {
        std::lock_guard<std::mutex> lock(mutex);
        checkpointNetwork = network->clone();
      }
      const auto checkpointData = checkpointNetwork->save();
      const auto checkpointTime = std::chrono::duration_cast<std::chrono::milliseconds>
                                  (std::chrono::system_clock::now().time_since_epoch()).count();
      document["checkpoint"]["data"].SetString(checkpointData, document.GetAllocator());
      document["checkpoint"]["time"].SetInt64(checkpointTime);
      saveDocument(document, outputFilePath.string());

      const auto currentTime = std::chrono::steady_clock::now();
      const auto epochTime = std::chrono::duration_cast<std::chrono::milliseconds>
                             (currentTime - startEpochTime).count();
      const auto totalTime = std::chrono::duration_cast<std::chrono::seconds>
                             (currentTime - startRunTime).count();
      startEpochTime = currentTime;

      std::cout << std::endl;
      std::cout << "Epoch " << epochNumber << std::endl;
      std::cout << "Games     : " << playGameCount << std::endl;
      std::cout << "Moves     : " << (playGameCount > 0 ? playMoveCount / playGameCount : playMoveCount) << std::endl;
      std::cout << "Value     : " << (playGameCount > 0 ? playTotalValue / playGameCount : playTotalValue) << std::endl;
      std::cout << "LossP     : " << (trainStepCount > 0 ? trainLosses.first / trainStepCount : trainLosses.first) << std::endl;
      std::cout << "LossV     : " << (trainStepCount > 0 ? trainLosses.second / trainStepCount : trainLosses.second) << std::endl;
      std::cout << "PlayTime  : " << epochTime - trainTime << std::endl;
      std::cout << "TrainTime : " << trainTime << std::endl;
      std::cout << "EpochTime : " << epochTime << std::endl;
      std::cout << "TotalTime : " << totalTime / 60 << ":" << std::setfill('0') << std::setw(2) << totalTime % 60 << std::endl;

      playGameCount = 0;
      playMoveCount = 0;
      playCurrentValue = 0;
      playTotalValue = 0;
      trainTime = 0;
      trainStepCount = 0;
      trainLosses = {0, 0};
    }
  }
}
