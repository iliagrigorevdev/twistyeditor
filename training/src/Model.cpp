
#ifndef MODEL_CPP
#define MODEL_CPP

#include "Types.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Weverything"
#include <torch/torch.h>
#pragma clang diagnostic pop

namespace model {

static const float logStdMin = -20;
static const float logStdMax = 2;

static torch::nn::Sequential mlpNet(const IntArray &hiddenLayerSizes, int inputLength, int outputLength) {
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

class Actor : public torch::nn::Cloneable<Actor> {
public:
  Actor(const IntArray &hiddenLayerSizes, int observationLength, int actionLength)
      : hiddenLayerSizes(hiddenLayerSizes)
      , observationLength(observationLength)
      , actionLength(actionLength) {
    reset();
  }

  void reset() {
    net = register_module("net", mlpNet(hiddenLayerSizes, observationLength, 0));
    muLayer = register_module("muLayer", torch::nn::Linear(hiddenLayerSizes.back(), actionLength));
    logStdLayer = register_module("logStdLayer", torch::nn::Linear(hiddenLayerSizes.back(), actionLength));
  }

  std::pair<torch::Tensor, torch::Tensor> forward(torch::Tensor observation, bool withLogProb) {
    const auto netOut = net->forward(observation);
    const auto mu = muLayer->forward(netOut);
    auto sample = mu;
    torch::Tensor logProb;
    if (withLogProb) {
      auto logStd = logStdLayer->forward(netOut);
      logStd = torch::clamp(logStd, logStdMin, logStdMax);
      const auto std = torch::exp(logStd);
      sample += torch::randn(mu.sizes(), mu.device()) * std;
      logProb = -0.5 * (torch::square((sample - mu) / (std + 1e-9)) + 2 * logStd + std::log(2 * M_PI));
      logProb -= (2 * (std::log(2) - sample - torch::softplus(-2 * sample)));
      logProb = logProb.sum(1, true);
    }
    sample = torch::tanh(sample);
    return {sample, logProb};
  }

  Action predict(const Observation &observation) {
    torch::NoGradGuard noGradGuard;

    const auto inputObservation = torch::from_blob(
        reinterpret_cast<void*>(const_cast<float*>(&observation[0])),
        {1, static_cast<int>(observation.size())}, torch::kFloat32);

    const auto [sample, _] = forward(inputObservation, false);
    const auto sampleAccessor = sample.accessor<float, 2>();
    Action action(0.0, actionLength);
    for (int i = 0; i < actionLength; i++) {
      action[i] = sampleAccessor[0][i];
    }

    return action;
  }

private:
  IntArray hiddenLayerSizes;
  int observationLength;
  int actionLength;

  torch::nn::Sequential net = nullptr;
  torch::nn::Linear muLayer = nullptr;
  torch::nn::Linear logStdLayer = nullptr;
};

class Critic : public torch::nn::Cloneable<Critic> {
public:
  Critic(const IntArray &hiddenLayerSizes, int observationLength, int actionLength)
      : hiddenLayerSizes(hiddenLayerSizes)
      , observationLength(observationLength)
      , actionLength(actionLength) {
    reset();
  }

  void reset() {
    q1 = register_module("q1", mlpNet(hiddenLayerSizes, observationLength + actionLength, 1));
    q2 = register_module("q2", mlpNet(hiddenLayerSizes, observationLength + actionLength, 1));
  }

  std::pair<torch::Tensor, torch::Tensor>
  forward(torch::Tensor observation, torch::Tensor action) {
    const auto observationAction = torch::cat({observation, action}, 1);
    return {q1->forward(observationAction), q2->forward(observationAction)};
  }

private:
  IntArray hiddenLayerSizes;
  int observationLength;
  int actionLength;

  torch::nn::Sequential q1 = nullptr;
  torch::nn::Sequential q2 = nullptr;
};

class Model : public torch::nn::Cloneable<Model> {
public:
  Model(const IntArray &hiddenLayerSizes, int observationLength, int actionLength)
      : hiddenLayerSizes(hiddenLayerSizes)
      , observationLength(observationLength)
      , actionLength(actionLength) {
    reset();
  }

  ActorPtr getActor() const {
    return actor;
  }

  CriticPtr getCritic() const {
    return critic;
  }

  void reset() {
    actor = register_module("actor", std::make_shared<Actor>(
      hiddenLayerSizes, observationLength, actionLength));
    critic = register_module("critic", std::make_shared<Critic>(
      hiddenLayerSizes, observationLength, actionLength));
  }

private:
  IntArray hiddenLayerSizes;
  int observationLength;
  int actionLength;

  ActorPtr actor;
  CriticPtr critic;
};

}

#endif // MODEL_CPP
