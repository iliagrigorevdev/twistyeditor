
#include "Coach.h"
#include "ReplayBuffer.h"

Coach::Coach(const Config &config, EnvironmentPtr environment, NetworkPtr network)
    : config(config)
    , environment(environment)
    , network(network)
    , replayBuffer(std::make_shared<ReplayBuffer>(config))
    , advance(0) {
}

void Coach::step() {
  if (environment->done || environment->timeout()) {
    environment->restart();
  }

  auto observation = environment->observation;
  auto action = (advance < config.randomStepCount
                 ? environment->randomAction()
                 : network->predict(observation, false));

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
