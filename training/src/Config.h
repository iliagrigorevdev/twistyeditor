
#ifndef CONFIG_H
#define CONFIG_H

#include "Types.h"

struct Config {
  float timeStep = 0.01;
  int frameSteps = 4;

  float discount = 0.99;
  int batchSize = 100;
  int randomSteps = 10000;
  int replayBufferSize = 1000000;
  float actorLearningRate = 3e-4;
  float criticLearningRate = 1e-3;
  float regularization = 0.2;
  float interpolation = 0.995;
  IntArray hiddenLayerSizes = {64, 64};
};

#endif // CONFIG_H
