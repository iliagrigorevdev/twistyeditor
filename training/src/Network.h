
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

  String save();
  void save(std::ostream &stream);
  void load(const String &data);
  void load(std::istream &stream);

  Action predict(const Observation &observation);
  ActorCriticLosses train(const SamplePtrs &samples);

  Config config;
  ModelPtr model;
  CriticPtr targetCritic;
  OptimizerPtr actorOptimizer;
  OptimizerPtr criticOptimizer;
  bool cudaAvailable;
  bool cudaActive;
};

#endif // NETWORK_H
