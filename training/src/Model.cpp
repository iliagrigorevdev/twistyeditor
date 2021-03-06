
#include "Model.h"

static torch::nn::Sequential
mlpNet(const IntArray &hiddenLayerSizes, int inputLength, int outputLength) {
  if (hiddenLayerSizes.empty()) {
    throw std::runtime_error("Hidden layer sizes must be given");
  }

  torch::nn::Sequential net;
  net->push_back(torch::nn::Linear(inputLength, hiddenLayerSizes.front()));
  net->push_back(torch::nn::ReLU());
  for (int i = 0; i < static_cast<int>(hiddenLayerSizes.size()) - 1; i++) {
    net->push_back(torch::nn::Linear(hiddenLayerSizes[i], hiddenLayerSizes[i + 1]));
    net->push_back(torch::nn::ReLU());
  }
  if (outputLength > 0) {
    net->push_back(torch::nn::Linear(hiddenLayerSizes.back(), outputLength));
  }
  return net;
}

Actor::Actor(const IntArray &hiddenLayerSizes, int observationLength, int actionLength)
    : hiddenLayerSizes(hiddenLayerSizes)
    , observationLength(observationLength)
    , actionLength(actionLength) {
  reset();
}

void Actor::reset() {
  net = register_module("net", mlpNet(hiddenLayerSizes, observationLength, 0));
  muLayer = register_module("muLayer", torch::nn::Linear(hiddenLayerSizes.back(), actionLength));
}

torch::Tensor Actor::forward(torch::Tensor observation) {
  const auto netOut = net->forward(observation);
  const auto mu = muLayer->forward(netOut);
  const auto sample = torch::tanh(mu);
  return sample;
}

Critic::Critic(const IntArray &hiddenLayerSizes, int observationLength, int actionLength)
    : hiddenLayerSizes(hiddenLayerSizes)
    , observationLength(observationLength)
    , actionLength(actionLength) {
  reset();
}

void Critic::reset() {
  q1 = register_module("q1", mlpNet(hiddenLayerSizes, observationLength + actionLength, 1));
  q2 = register_module("q2", mlpNet(hiddenLayerSizes, observationLength + actionLength, 1));
}

std::pair<torch::Tensor, torch::Tensor>
Critic::forward(torch::Tensor observation, torch::Tensor action) {
  const auto observationAction = torch::cat({observation, action}, 1);
  return {q1->forward(observationAction), q2->forward(observationAction)};
}

Model::Model(const IntArray &hiddenLayerSizes, int observationLength, int actionLength)
    : hiddenLayerSizes(hiddenLayerSizes)
    , observationLength(observationLength)
    , actionLength(actionLength) {
  reset();
}

void Model::reset() {
  actor = register_module("actor", std::make_shared<Actor>(
    hiddenLayerSizes, observationLength, actionLength));
  critic = register_module("critic", std::make_shared<Critic>(
    hiddenLayerSizes, observationLength, actionLength));
}
