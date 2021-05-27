
#include "Coach.h"
#include "ReplayBuffer.h"

#include <chrono>

Coach::Coach(const Config &config, EnvironmentPtr environment, NetworkPtr network)
    : config(config)
    , environment(environment)
    , network(network)
    , replayBuffer(std::make_shared<ReplayBuffer>(config))
    , randomGenerator(std::chrono::system_clock::now().time_since_epoch().count())
    , actionDistribution(-1, 1) {
}

void Coach::run() {
  int playGameCount = 0;
  int playMoveCount = 0;
  float playValue = 0;
  int trainTime = 0;
  int trainStepCount = 0;
  ActorCriticLosses trainLosses = {0, 0};

  const auto startRunTime = std::chrono::steady_clock::now();
  auto startEpochTime = startRunTime;

  environment->restart();

  const auto totalStepCount = config.totalStepCount();
  for (int t = 0; t < totalStepCount; t++) {
    auto observation = environment->observation;
    auto action = (t < config.randomStepCount
                   ? randomAction(environment->actionLength)
                   : network->predict(observation));

    const auto reward = environment->step(action);
    playValue += reward;
    playMoveCount++;
    auto nextObservation = environment->observation;
    replayBuffer->append(std::make_shared<Sample>(std::move(observation),
                         std::move(action), reward, std::move(nextObservation),
                         environment->done));

    if (environment->done || environment->timeout()) {
      playGameCount++;
      environment->restart();
    }

    if ((t >= config.trainingStartStepCount) && ((t % config.trainingInterval) == 0)) {
      const auto startTrainTime = std::chrono::steady_clock::now();
      for (int i = 0; i < config.trainingInterval; i++) {
        const auto samples = replayBuffer->sampleBatch();
        const auto losses = network->train(samples);
        trainLosses.first += losses.first;
        trainLosses.second += losses.second;
        trainStepCount++;
      }
      trainTime += std::chrono::duration_cast<std::chrono::milliseconds>
                   (std::chrono::steady_clock::now() - startTrainTime).count();
    }

    if (((t + 1) % config.epochStepCount == 0)) {
      const auto epochNumber = (t + 1) / config.epochStepCount;

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
      std::cout << "Value     : " << (playGameCount > 0 ? playValue / playGameCount : playValue) << std::endl;
      std::cout << "LossP     : " << (trainStepCount > 0 ? trainLosses.first / trainStepCount : trainLosses.first) << std::endl;
      std::cout << "LossV     : " << (trainStepCount > 0 ? trainLosses.second / trainStepCount : trainLosses.second) << std::endl;
      std::cout << "PlayTime  : " << epochTime - trainTime << std::endl;
      std::cout << "TrainTime : " << trainTime << std::endl;
      std::cout << "EpochTime : " << epochTime << std::endl;
      std::cout << "TotalTime : " << totalTime / 60 << ":" << std::setfill('0') << std::setw(2) << totalTime % 60 << std::endl;

      playGameCount = 0;
      playMoveCount = 0;
      playValue = 0;
      trainTime = 0;
      trainStepCount = 0;
      trainLosses = {0, 0};
    }
  }
}

Action Coach::randomAction(int actionLength) {
  Action action(actionLength, 0.0);
  for (auto &value : action) {
    value = actionDistribution(randomGenerator);
  }
  return action;
}
