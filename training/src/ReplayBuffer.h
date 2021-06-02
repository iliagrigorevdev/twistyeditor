
#ifndef REPLAYBUFFER_H
#define REPLAYBUFFER_H

#include "Config.h"

class ReplayBuffer {
public:
  ReplayBuffer(const Config &config);

  void append(SamplePtr sample);
  SamplePtrs sampleBatch();

  Config config;
  int cursor;
  SamplePtrs buffer;
  std::default_random_engine randomGenerator;
};

#endif // REPLAYBUFFER_H
