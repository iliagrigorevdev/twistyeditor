
#ifndef NETWORK_H
#define NETWORK_H

#include "Types.h"
#include "Config.h"

#include <mlpack/methods/ann/ffn.hpp>
#include <mlpack/methods/ann/loss_functions/empty_loss.hpp>
#include <mlpack/methods/ann/loss_functions/mean_squared_error.hpp>
#include <mlpack/methods/ann/init_rules/gaussian_init.hpp>

class Network {
public:
  typedef mlpack::ann::FFN<mlpack::ann::EmptyLoss<>, mlpack::ann::GaussianInitialization> FFN;
  typedef ens::AdamUpdate Updater;
  typedef Updater::template Policy<arma::mat, arma::mat> UpdatePolicy;

  Network(const Config &config, int observationLength, int actionLength);
  Network(const Config &config, FFN *actor, FFN *critic1, FFN *critic2);
  Network(const Config &config, FFN *actor, FFN *critic1, FFN *critic2,
          FFN *targetCritic1, FFN *targetCritic2);
  ~Network();

  NetworkPtr clone() const;

  Action predict(const Observation &observation);

  ActorCriticLosses train(const SamplePtrs &samples);

  static FFN* createActor(const IntArray &hiddenLayerSizes, int observationLength, int actionLength);
  static FFN* createCritic(const IntArray &hiddenLayerSizes, int observationLength, int actionLength);
  static FFN* createMlpNetwork(const IntArray &hiddenLayerSizes, int inputLength, int outputLength);

  static arma::vec getObservationVecView(const Observation &observation);

  Config config;
  FFN *actor;
  FFN *critic1;
  FFN *critic2;
  FFN *targetCritic1;
  FFN *targetCritic2;

  Updater actorUpdater;
  Updater criticUpdater;
  UpdatePolicy *actorUpdatePolicy;
  UpdatePolicy *criticUpdatePolicy;
  mlpack::ann::MeanSquaredError<> lossFunction;

  arma::vec actionVec;

  arma::mat observationMat;
  arma::mat actionMat;
  arma::rowvec rewardVec;
  arma::mat nextObservationMat;
  arma::irowvec undoneVec;
  arma::mat nextActionMat;
  arma::rowvec q1;
  arma::rowvec q2;
  arma::rowvec nextQ;
  arma::mat lossQ1;
  arma::mat lossQ2;
  arma::mat gradientQ1;
  arma::mat gradientQ2;
};

#endif // NETWORK_H
