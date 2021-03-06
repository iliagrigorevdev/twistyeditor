
#ifndef CONFIG_H
#define CONFIG_H

#include "Types.h"

struct Config {
  float discount = 0.99;
  int batchSize = 100;
  int randomSteps = 10000;
  int replayBufferSize = 1000000;
  float learningRate = 3e-4;
  float interpolation = 0.995;
  IntArray hiddenLayerSizes = {64, 64};
};

#endif // CONFIG_H
