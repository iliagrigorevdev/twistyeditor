
#ifndef COACH_H
#define COACH_H

#include "Environment.h"
#include "Network.h"

class Coach {
public:
  Coach(const Config &config, EnvironmentPtr environment, NetworkPtr network);

  void step();

  Action randomAction(int actionLength);

  Config config;
  EnvironmentPtr environment;
  NetworkPtr network;
  ReplayBufferPtr replayBuffer;
  std::default_random_engine randomGenerator;
  std::uniform_real_distribution<float> actionDistribution;
  int advance;
};

#endif // COACH_H
