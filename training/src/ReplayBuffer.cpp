
#include "ReplayBuffer.h"

#include <algorithm>
#include <chrono>

ReplayBuffer::ReplayBuffer(const Config &config)
    : config(config)
    , cursor(0)
    , randomGenerator(std::chrono::system_clock::now().time_since_epoch().count()) {
  buffer.reserve(config.replayBufferSize);
}

void ReplayBuffer::append(SamplePtr sample) {
  if (cursor >= buffer.size()) {
    buffer.push_back(sample);
  } else {
    buffer[cursor] = sample;
  }
  cursor = (cursor + 1) % config.replayBufferSize;
}

SamplePtrs ReplayBuffer::sampleBatch() {
  if (buffer.empty()) {
    return {};
  }

  SamplePtrs samples(config.batchSize, nullptr);
  std::uniform_int_distribution<int> indexDistribution(0, static_cast<int>(buffer.size()) - 1);
  for (int i = 0; i < config.batchSize; i++) {
    samples[i] = buffer[indexDistribution(randomGenerator)];
  }
  return samples;
}
