
#include "Types.h"
#include "Config.h"
#include "TwistyEnv.h"
#include "Network.h"
#include "Coach.h"

#define RAPIDJSON_HAS_STDSTRING 1
#include "rapidjson/document.h"
#include <rapidjson/ostreamwrapper.h>
#include <rapidjson/writer.h>
#include "rapidjson/error/en.h"

#include <chrono>
#include <filesystem>
#include <fstream>
#include <streambuf>

static const int epochs = 100;
static const int epochSteps = 4000;
static const int totalSteps = epochs * epochSteps;
static const int trainingStartSteps = 1000;
static const int trainingInterval = 50;

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
  if (argc < 2) {
    std::cerr << "Usage: " << argv[0] << " FILEPATH" << std::endl;
    return 1;
  }

  const std::filesystem::path inputFilePath(argv[1]);

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
      !document["config"].HasMember("learningRate") ||
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
  config.learningRate = document["config"]["learningRate"].GetFloat();
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

  const auto environment = std::make_shared<TwistyEnv>(shapeData);

  const auto observationLength = environment->observation.size();
  if ((observationLength == 0) || (environment->actionLength == 0)) {
    return 1;
  }

  const auto network = std::make_shared<Network>(config, observationLength, environment->actionLength);

  if (!document["checkpoint"]["data"].IsNull()) {
    const String checkpointData(document["checkpoint"]["data"].GetString(),
                                document["checkpoint"]["data"].GetStringLength());
    network->load(checkpointData);
    std::cout << "Load checkpoint" << std::endl;
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

  for (int t = 0; t < totalSteps; t++) {
    const auto reward = coach.step();
    playCurrentValue += reward;
    playMoveCount++;

    if (environment->done || environment->timeout()) {
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

      const auto checkpointData = network->save();
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
