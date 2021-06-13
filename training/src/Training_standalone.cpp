
#include "Types.h"
#include "Config.h"
#include "TwistyEnv.h"
#include "Network.h"
#include "Coach.h"

#include <chrono>
#include <filesystem>
#include <fstream>

static const int epochs = 100;
static const int epochSteps = 4000;
static const int totalSteps = epochs * epochSteps;
static const int trainingStartSteps = 1000;
static const int trainingInterval = 50;
static const String modelFolder = "../models";
static const String extension = "pt";

static String modelFilename(const Config &config, const String &name) {
  String networkText;
  for (const auto hiddenLayerSize : config.hiddenLayerSizes) {
    if (networkText.empty()) {
      networkText = "_";
    }
    networkText += "l" + std::to_string(hiddenLayerSize);
  }
  return name + networkText + "." + extension;
}

void saveCheckpoint(const Config &config, const String &name, NetworkPtr network) {
  if (!std::filesystem::exists(modelFolder)) {
    std::filesystem::create_directory(modelFolder);
  }
  const auto modelFilepath = std::filesystem::path(modelFolder) /
                             modelFilename(config, name);
  auto file = std::ofstream(modelFilepath);
  network->save(file);
  file.close();
}

int main(int argc, char* argv[]) {
  // TODO read data from file specified as argument
  const String name = "Cannon";
  const auto data = "o Cannon\n"
                    "l 13.0000 7.2261 133.5688 128.4615 -3.461539 2.461539 -0.000000 0.0000 0.0000 0.0030 1.0000\n"
                    "p 3.460694 -0.149279 0.000000 0.0000 0.0000 -0.0030 1.0000\n"
                    "p 4.462705 0.177960 -0.000000 1.0000 -0.0030 -0.0000 0.0000\n"
                    "p 5.460657 -0.161456 0.000000 0.0000 -0.0000 0.0030 -1.0000\n"
                    "p 2.462742 0.190137 0.000000 -1.0000 0.0030 -0.0000 0.0000\n"
                    "p 1.460731 -0.137102 -0.000000 -0.0000 0.0000 0.0030 -1.0000\n"
                    "p 0.462779 0.202314 0.000000 1.0000 -0.0030 0.0000 -0.0000\n"
                    "p -0.539232 -0.124924 -0.000000 0.0000 -0.0000 -0.0030 1.0000\n"
                    "p -1.537184 0.214491 0.000000 -1.0000 0.0030 -0.0000 0.0000\n"
                    "p -2.539195 -0.112747 -0.000000 -0.0000 0.0000 0.0030 -1.0000\n"
                    "p -2.539195 -0.112747 1.414214 -0.0000 0.0000 0.0030 -1.0000\n"
                    "p -2.539195 -0.112747 -1.414214 -0.0000 0.0000 0.0030 -1.0000\n"
                    "p -3.537147 0.226669 0.000000 1.0000 -0.0030 0.0000 -0.0000\n"
                    "p -4.539158 -0.100570 -0.000000 0.0000 -0.0000 -0.0030 1.0000\n"
                    "l 16.0000 26.3194 23.6528 34.6667 -0.000000 2.000000 2.504336 0.0000 0.0000 0.3827 0.9239\n"
                    "p 0.235702 0.235702 -1.090123 0.0000 0.0000 -0.3827 0.9239\n"
                    "p -0.000001 1.178511 -0.854420 -0.6533 0.2706 0.6533 -0.2706\n"
                    "p -0.235702 -0.235702 -1.090123 0.9239 -0.3827 -0.0000 0.0000\n"
                    "p 0.000000 -1.178511 -0.854420 -0.2706 0.6533 0.2706 -0.6533\n"
                    "p 0.235702 1.414214 0.088389 -0.2706 -0.6533 0.6533 -0.2706\n"
                    "p -0.235703 1.414213 0.559793 -0.2706 0.6533 0.6533 0.2706\n"
                    "p -1.178512 1.178511 0.324091 -0.0000 0.0000 -0.9239 0.3827\n"
                    "p 1.178511 1.178512 0.324091 -0.0000 0.0000 -0.9239 -0.3827\n"
                    "p 1.414213 0.235703 0.559793 0.2706 0.6533 0.2706 0.6533\n"
                    "p 1.414213 -0.235702 0.088389 0.6533 0.2706 -0.6533 -0.2706\n"
                    "p 1.178512 -1.178511 0.324091 0.0000 -0.0000 0.3827 0.9239\n"
                    "p 0.235703 -1.414213 0.559793 -0.6533 -0.2706 0.2706 -0.6533\n"
                    "p -0.235702 -1.414214 0.088388 -0.6533 0.2706 0.2706 0.6533\n"
                    "p -1.178511 -1.178512 0.324090 0.0000 0.0000 0.3827 -0.9239\n"
                    "p -1.414214 0.235702 0.088389 0.2706 -0.6533 0.2706 -0.6533\n"
                    "p -1.414213 -0.235703 0.559794 -0.6533 0.2706 0.6533 -0.2706\n"
                    "l 16.0000 26.3194 23.6528 34.6667 0.000000 2.000000 -2.504337 0.0000 0.0000 0.3827 0.9239\n"
                    "p 0.235702 0.235703 1.090123 0.0000 0.0000 -0.3827 0.9239\n"
                    "p -0.235702 -0.235703 1.090123 0.9239 -0.3827 -0.0000 0.0000\n"
                    "p -0.000002 1.178511 0.854421 -0.6533 0.2706 -0.6533 0.2706\n"
                    "p 0.000002 -1.178511 0.854421 0.2706 -0.6533 0.2706 -0.6533\n"
                    "p 0.235700 1.414214 -0.088388 0.2706 0.6533 0.6533 -0.2706\n"
                    "p 1.178510 1.178513 -0.324090 -0.0000 0.0000 0.9239 0.3827\n"
                    "p -0.235704 1.414213 -0.559793 -0.2706 0.6533 -0.6533 -0.2706\n"
                    "p -1.178513 1.178510 -0.324090 0.0000 -0.0000 -0.9239 0.3827\n"
                    "p -1.414214 0.235700 -0.088388 0.2706 -0.6533 -0.2706 0.6533\n"
                    "p -1.414213 -0.235704 -0.559793 0.6533 -0.2706 0.6533 -0.2706\n"
                    "p -1.178510 -1.178513 -0.324091 -0.0000 -0.0000 0.3827 -0.9239\n"
                    "p -0.235700 -1.414214 -0.088388 -0.6533 0.2706 -0.2706 -0.6533\n"
                    "p 0.235704 -1.414213 -0.559793 -0.6533 -0.2706 -0.2706 0.6533\n"
                    "p 1.178513 -1.178510 -0.324091 -0.0000 0.0000 0.3827 0.9239\n"
                    "p 1.414214 -0.235700 -0.088389 0.6533 0.2706 0.6533 0.2706\n"
                    "p 1.414213 0.235704 -0.559793 0.2706 0.6533 -0.2706 -0.6533\n"
                    "j 0 1 -180.00 180.00 1000.00 0.000000 2.416667 0.707107 0.0000 -0.7071 0.0000 0.7071\n"
                    "j 0 2 -180.00 180.00 1000.00 0.000000 2.416667 -0.707107 0.0000 0.7071 0.0000 0.7071\n"
                    "b 0";
  const auto environment = std::make_shared<TwistyEnv>(data);

  const auto observationLength = environment->observation.size();
  if ((observationLength == 0) || (environment->actionLength == 0)) {
    return 1;
  }

  Config config;
  const auto network = std::make_shared<Network>(config, observationLength, environment->actionLength);

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

      saveCheckpoint(config, name, network);

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
