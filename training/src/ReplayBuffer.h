
#ifndef REPLAYBUFFER_H
#define REPLAYBUFFER_H

#include "Config.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Weverything"
#include <torch/torch.h>
#pragma clang diagnostic pop

class ReplayBuffer {
public:
  ReplayBuffer(const Config &config);

  void append(SamplePtr sample);
  std::tuple<torch::Tensor, torch::Tensor, torch::Tensor, torch::Tensor, torch::Tensor> sampleBatch();

  Config config;
  int cursor;
  int length;
  bool cudaAvailable;

  torch::Tensor observations;
  torch::Tensor nextObservations;
  torch::Tensor actions;
  torch::Tensor reward;
  torch::Tensor undone;
};

#endif // REPLAYBUFFER_H
