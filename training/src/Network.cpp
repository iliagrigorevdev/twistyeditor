
#include "Network.h"

Network::Network(const Config &config, int observationLength, int actionLength)
    : Network(config,
              createActor(config.hiddenLayerSizes, observationLength, actionLength),
              createCritic(config.hiddenLayerSizes, observationLength, actionLength),
              createCritic(config.hiddenLayerSizes, observationLength, actionLength)) {
}

Network::Network(const Config &config, FFN *actor, FFN *critic1, FFN *critic2)
    : Network(config, actor, critic1, critic2, new FFN(*critic1), new FFN(*critic2)) {
}

Network::Network(const Config &config, FFN *actor, FFN *critic1, FFN *critic2,
                 FFN *targetCritic1, FFN *targetCritic2)
    : config(config)
    , actor(actor)
    , critic1(critic1)
    , critic2(critic2)
    , targetCritic1(targetCritic1)
    , targetCritic2(targetCritic2) {
  actorUpdatePolicy = new UpdatePolicy(actorUpdater, actor->Parameters().n_rows,
                                       actor->Parameters().n_cols);
  criticUpdatePolicy = new UpdatePolicy(criticUpdater, critic1->Parameters().n_rows,
                                        critic1->Parameters().n_cols);
}

Network::~Network() {
  delete actor;
  delete critic1;
  delete critic2;
  delete targetCritic1;
  delete targetCritic2;
  delete actorUpdatePolicy;
  delete criticUpdatePolicy;
}

NetworkPtr Network::clone() const {
  return std::make_shared<Network>(config, new FFN(*actor), new FFN(*critic1), new FFN(*critic2),
                                   new FFN(*targetCritic1), new FFN(*targetCritic2));
}

Action Network::predict(const Observation &observation) {
  const auto observationVecView = getObservationVecView(observation);
  actor->Predict(observationVecView, actionVec);
  return arma::conv_to<Action>::from(actionVec);
}

ActorCriticLosses Network::train(const SamplePtrs &samples) {
  if (samples.empty()) {
    return {0, 0};
  }

  for (int i = 0; i < samples.size(); i++) {
    const auto &[observation, action, reward, nextObservation, done] = *samples[i];
    if (i == 0) {
      observationMat.set_size(observation.size(), samples.size());
      actionMat.set_size(action.size(), samples.size());
      rewardVec.set_size(samples.size());
      nextObservationMat.set_size(nextObservation.size(), samples.size());
      undoneVec.set_size(samples.size());
    }
    observationMat.col(i) = arma::conv_to<arma::colvec>::from(observation);
    actionMat.col(i) = arma::conv_to<arma::colvec>::from(action);
    rewardVec(i) = reward;
    nextObservationMat.col(i) = arma::conv_to<arma::colvec>::from(nextObservation);
    undoneVec(i) = !done;
  }

  actor->Predict(nextObservationMat, nextActionMat);

  const auto nextObservationActionMat = arma::join_vert(nextObservationMat, nextActionMat);
  targetCritic1->Predict(nextObservationActionMat, q1);
  targetCritic2->Predict(nextObservationActionMat, q2);
  nextQ = rewardVec + config.discount * (undoneVec % arma::min(q1, q2));

  const auto observationActionMat = arma::join_vert(observationMat, actionMat);
  critic1->Forward(observationActionMat, q1);
  critic2->Forward(observationActionMat, q2);
  lossFunction.Backward(q1, nextQ, lossQ1);
  lossFunction.Backward(q2, nextQ, lossQ2);
  critic1->Backward(observationActionMat, lossQ1, gradientQ1);
  criticUpdatePolicy->Update(critic1->Parameters(), config.learningRate, gradientQ1);
  critic2->Backward(observationActionMat, lossQ2, gradientQ2);
  criticUpdatePolicy->Update(critic2->Parameters(), config.learningRate, gradientQ2);

  // TODO actor network update

  targetCritic1->Parameters() = config.interpolation * targetCritic1->Parameters() +
                                (1 - config.interpolation) * critic1->Parameters();
  targetCritic2->Parameters() = config.interpolation * targetCritic2->Parameters() +
                                (1 - config.interpolation) * critic2->Parameters();

  return {0, 0}; // XXX losses
}

Network::FFN* Network::createActor(const IntArray &hiddenLayerSizes,
                                   int observationLength, int actionLength) {
  auto *net = createMlpNetwork(hiddenLayerSizes, observationLength, actionLength);
  net->Add<mlpack::ann::TanHLayer<>>();
  net->ResetParameters();
  return net;
}

Network::FFN* Network::createCritic(const IntArray &hiddenLayerSizes,
                                    int observationLength, int actionLength) {
  auto *net = createMlpNetwork(hiddenLayerSizes, observationLength + actionLength, 1);
  net->ResetParameters();
  return net;
}

Network::FFN* Network::createMlpNetwork(const IntArray &hiddenLayerSizes,
                                        int inputLength, int outputLength) {
  if (hiddenLayerSizes.empty()) {
    throw std::runtime_error("Hidden layer sizes must be given");
  }

  auto *net = new FFN(mlpack::ann::EmptyLoss<>(), mlpack::ann::GaussianInitialization(0, 0.1));
  net->Add<mlpack::ann::Linear<>>(inputLength, hiddenLayerSizes.front());
  net->Add<mlpack::ann::ReLULayer<>>();
  for (int i = 0; i < static_cast<int>(hiddenLayerSizes.size()) - 1; i++) {
    net->Add<mlpack::ann::Linear<>>(hiddenLayerSizes[i], hiddenLayerSizes[i + 1]);
    net->Add<mlpack::ann::ReLULayer<>>();
  }
  net->Add<mlpack::ann::Linear<>>(hiddenLayerSizes.back(), outputLength);
  return net;
}

arma::vec Network::getObservationVecView(const Observation &observation) {
  return arma::vec(&const_cast<Observation&>(observation)[0], observation.size(), false);
}
