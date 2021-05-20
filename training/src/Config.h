
#ifndef CONFIG_H
#define CONFIG_H

#include "Types.h"

struct Config {
  float discount = 0.99;
  int epochCount = 100;
  int epochStepCount = 4000;
  int totalStepCount() const {return epochCount * epochStepCount;}
  int batchSize = 100;
  int randomStepCount = 10000;
  int replaySampleCountMax = 1000000;
  int trainingStartStepCount = 1000;
  int trainingInterval = 50;
  float learningRate = 3e-4;
  float regularization = 0.2;
  float interpolation = 0.995;
  IntArray hiddenLayerSizes = {64, 64};
};

#endif // CONFIG_H
