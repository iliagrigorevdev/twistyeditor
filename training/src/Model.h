
#ifndef MODEL_H
#define MODEL_H

#include "Types.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Weverything"
#include <torch/torch.h>
#pragma clang diagnostic pop

class Actor : public torch::nn::Cloneable<Actor> {
public:
  Actor(const IntArray &hiddenLayerSizes, int observationLength, int actionLength);

  void reset() override;

  torch::Tensor forward(torch::Tensor observation, bool deterministic);

  IntArray hiddenLayerSizes;
  int observationLength;
  int actionLength;

  torch::nn::Sequential net = nullptr;
  torch::nn::Linear muLayer = nullptr;
  torch::nn::Linear logStdLayer = nullptr;
};

class Critic : public torch::nn::Cloneable<Critic> {
public:
  Critic(const IntArray &hiddenLayerSizes, int observationLength, int actionLength);

  void reset() override;

  std::pair<torch::Tensor, torch::Tensor>
  forward(torch::Tensor observation, torch::Tensor action);

  IntArray hiddenLayerSizes;
  int observationLength;
  int actionLength;

  torch::nn::Sequential q1 = nullptr;
  torch::nn::Sequential q2 = nullptr;
};

class Model : public torch::nn::Cloneable<Model> {
public:
  Model(const IntArray &hiddenLayerSizes, int observationLength, int actionLength);

  void reset() override;

  IntArray hiddenLayerSizes;
  int observationLength;
  int actionLength;

  ActorPtr actor;
  CriticPtr critic;
};

#endif // MODEL_H
