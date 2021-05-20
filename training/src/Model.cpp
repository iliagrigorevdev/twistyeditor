
#include "Model.h"

static mlpack::ann::Sequential<>*
createMlpNetwork(const IntArray &hiddenLayerSizes, int inputLength, int outputLength) {
  if (hiddenLayerSizes.empty()) {
    throw std::runtime_error("Hidden layer sizes must be given");
  }

  auto *net = new mlpack::ann::Sequential<>(true);
  net->Add<mlpack::ann::Linear<>>(inputLength, hiddenLayerSizes.front());
  net->Add<mlpack::ann::ReLULayer<>>();
  for (int i = 0; i < static_cast<int>(hiddenLayerSizes.size()) - 1; i++) {
    net->Add<mlpack::ann::Linear<>>(hiddenLayerSizes[i], hiddenLayerSizes[i + 1]);
    net->Add<mlpack::ann::ReLULayer<>>();
  }
  if (outputLength > 0) {
    net->Add<mlpack::ann::Linear<>>(hiddenLayerSizes.back(), outputLength);
  }
  return net;
}

Actor::Actor(const IntArray &hiddenLayerSizes, int observationLength, int actionLength) {
  auto *net = createMlpNetwork(hiddenLayerSizes, observationLength, 0);

  model = new Model();
  model->Add<mlpack::ann::IdentityLayer<>>();
  model->Add(net);
  model->ResetParameters();
}

Actor::~Actor() {
  delete model;
}

ActorPtr Actor::clone() const {
  // TODO clone
  return nullptr;
}

Critic::Critic(const IntArray &hiddenLayerSizes, int observationLength, int actionLength) {
  auto *q1 = createMlpNetwork(hiddenLayerSizes, observationLength + actionLength, 1);
  auto *q2 = createMlpNetwork(hiddenLayerSizes, observationLength + actionLength, 1);

  model1 = new Model();
  model1->Add<mlpack::ann::IdentityLayer<>>();
  model1->Add(q1);
  model1->ResetParameters();

  model2 = new Model();
  model2->Add<mlpack::ann::IdentityLayer<>>();
  model2->Add(q2);
  model2->ResetParameters();
}

Critic::~Critic() {
  delete model1;
  delete model2;
}

CriticPtr Critic::clone() const {
  // TODO clone
  return nullptr;
}
