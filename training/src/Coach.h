
#ifndef COACH_H
#define COACH_H

#include "Environment.h"
#include "Network.h"

#include <thread>

class Coach {
public:
  Coach(const Config &config, EnvironmentPtr environment, NetworkPtr network);
  ~Coach();

  void start();
  void stop();

  void run();

  Action randomAction(int actionLength);

  Config config;
  EnvironmentPtr environment;
  NetworkPtr network;
  ReplayBufferPtr replayBuffer;
  std::default_random_engine randomGenerator;
  std::uniform_real_distribution<float> actionDistribution;
  std::atomic<bool> running;
  std::thread thread;
};

#endif // COACH_H
