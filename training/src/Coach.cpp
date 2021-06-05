
#include "Coach.h"
#include "ReplayBuffer.h"

#include <chrono>

Coach::Coach(const Config &config, EnvironmentPtr environment, NetworkPtr network)
    : config(config)
    , environment(environment)
    , network(network)
    , replayBuffer(std::make_shared<ReplayBuffer>(config))
    , randomGenerator(std::chrono::system_clock::now().time_since_epoch().count())
    , actionDistribution(-1, 1)
    , advance(0) {
}

void Coach::step() {
  if (environment->done || environment->timeout()) {
    environment->restart();
  }

  auto observation = environment->observation;
  auto action = (advance < config.randomStepCount
                 ? randomAction(environment->actionLength)
                 : network->predict(observation, true));

  const auto reward = environment->step(action);
  auto nextObservation = environment->observation;
  replayBuffer->append(std::make_shared<Sample>(std::move(observation),
                       std::move(action), reward, std::move(nextObservation),
                       environment->done));

  if (advance >= config.trainingStartStepCount) {
    const auto samples = replayBuffer->sampleBatch();
    network->train(samples);
  }

  advance++;
}

Action Coach::randomAction(int actionLength) {
  Action action(0.0, actionLength);
  for (auto &value : action) {
    value = actionDistribution(randomGenerator);
  }
  return action;
}
