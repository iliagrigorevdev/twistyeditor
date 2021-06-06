
#ifndef NETWORK_H
#define NETWORK_H

#include "Types.h"
#include "Config.h"
#include "Model.h"

class Network {
public:
  typedef std::shared_ptr<torch::optim::Optimizer> OptimizerPtr;

  Network(const Config &config, int observationLength, int actionLength);
  Network(const Config &config, ModelPtr model);
  Network(const Config &config, ModelPtr model, CriticPtr targetCritic);

  NetworkPtr clone() const;

  String save() const;
  void load(const String &data);

  Action predict(const Observation &observation, bool deterministic);
  ActorCriticLosses train(const SamplePtrs &samples);

  Config config;
  ModelPtr model;
  CriticPtr targetCritic;
  OptimizerPtr actorOptimizer;
  OptimizerPtr criticOptimizer;
};

#endif // NETWORK_H
