
#ifndef COACH_CPP
#define COACH_CPP

#include "Environment.cpp"
#include "Network.cpp"
#include "ReplayBuffer.cpp"

class Coach {
public:
  Coach(const Config &config, EnvironmentPtr environment, NetworkPtr network)
      : config(config)
      , environment(environment)
      , network(network)
      , replayBuffer(std::make_shared<ReplayBuffer>(config))
      , advance(0) {
  }

  EnvironmentPtr getEnvironment() const {
    return environment;
  }

  float step() {
    if (environment->isDone() || environment->timeout()) {
      environment->restart();
    }

    auto observation = environment->getObservation();
    auto action = (advance < config.randomSteps
                  ? environment->randomAction()
                  : network->predict(observation));

    const auto reward = environment->step(action);
    auto nextObservation = environment->getObservation();
    replayBuffer->append(std::make_shared<Sample>(std::move(observation),
                        std::move(action), reward, std::move(nextObservation),
                        environment->isDone()));

    advance++;
    return reward;
  }

  ActorCriticLosses train() {
    return network->train(replayBuffer->sampleBatch());
  }

private:
  Config config;
  EnvironmentPtr environment;
  NetworkPtr network;
  ReplayBufferPtr replayBuffer;
  int advance;
};

#endif // COACH_CPP
