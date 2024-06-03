
#include "ReplayBuffer.h"

ReplayBuffer::ReplayBuffer(const Config &config)
    : config(config)
    , cursor(0)
    , length(0)
    , cudaAvailable(torch::cuda::is_available()) {
}

void ReplayBuffer::append(SamplePtr sample) {
  const auto &[observation, action, r, nextObservation, d] = *sample;

  if (length == 0) {
    const auto device = cudaAvailable ? torch::kCUDA : torch::kCPU;
    const auto options = torch::TensorOptions().dtype(torch::kFloat32).device(device);
    observations = torch::empty({config.replayBufferSize, static_cast<int64_t>(observation.size())}, options);
    nextObservations = torch::empty({config.replayBufferSize, static_cast<int64_t>(nextObservation.size())}, options);
    actions = torch::empty({config.replayBufferSize, static_cast<int64_t>(action.size())}, options);
    reward = torch::empty({config.replayBufferSize, 1}, options);
    undone = torch::empty({config.replayBufferSize, 1}, options);
  }

  observations[cursor] = torch::from_blob(
      reinterpret_cast<void*>(const_cast<float*>(&observation[0])),
      {static_cast<int>(observation.size())}, torch::kFloat32);
  nextObservations[cursor] = torch::from_blob(
      reinterpret_cast<void*>(const_cast<float*>(&nextObservation[0])),
      {static_cast<int>(nextObservation.size())}, torch::kFloat32);
  actions[cursor] = torch::from_blob(
      reinterpret_cast<void*>(const_cast<float*>(&action[0])),
      {static_cast<int>(action.size())}, torch::kFloat32);
  reward[cursor][0] = r;
  undone[cursor][0] = d ? 0 : 1;

  cursor = (cursor + 1) % config.replayBufferSize;
  length = std::min(length + 1, config.replayBufferSize);
}

std::tuple<torch::Tensor, torch::Tensor, torch::Tensor, torch::Tensor, torch::Tensor> ReplayBuffer::sampleBatch() {
  if (length == 0) {
    return {};
  }

  const auto indices = torch::randint(length, {config.batchSize});

  return std::make_tuple(observations.index({indices}), nextObservations.index({indices}),
      actions.index({indices}), reward.index({indices}), undone.index({indices}));
}
