
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
  int advance;
};

#endif // COACH_H
