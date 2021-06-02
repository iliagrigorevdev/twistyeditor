
#include "Model.h"

static const float logStdMin = -20;
static const float logStdMax = 2;

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
  logStdLayer = register_module("logStdLayer", torch::nn::Linear(hiddenLayerSizes.back(), actionLength));
}

std::pair<torch::Tensor, torch::Tensor>
Actor::forward(torch::Tensor observation, bool deterministic, bool withLogProb) {
  const auto netOut = net->forward(observation);
  const auto mu = muLayer->forward(netOut);
  auto logStd = logStdLayer->forward(netOut);
  logStd = torch::clamp(logStd, logStdMin, logStdMax);
  const auto std = torch::exp(logStd);
  auto sample = mu;
  if (!deterministic) {
    sample += torch::randn(mu.sizes(), mu.device()) * std;
  }
  torch::Tensor logProb;
  if (withLogProb) {
    logProb = -0.5 * (torch::square((sample - mu) / (std + 1e-9)) +
              2 * logStd + std::log(2 * M_PI));
    logProb -= (2 * (std::log(2) - sample - torch::softplus(-2 * sample)));
    logProb = logProb.sum(1, true);
  }
  sample = torch::tanh(sample);
  return {sample, logProb};
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
