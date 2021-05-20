
#ifndef MODEL_H
#define MODEL_H

#include "Types.h"

#include <mlpack/methods/ann/ffn.hpp>
#include <mlpack/methods/ann/loss_functions/empty_loss.hpp>

typedef mlpack::ann::FFN<mlpack::ann::EmptyLoss<>> Model;

class Actor {
public:
  Actor(const IntArray &hiddenLayerSizes, int observationLength, int actionLength);
  ~Actor();

  ActorPtr clone() const;

  Model *model;
};

class Critic {
public:
  Critic(const IntArray &hiddenLayerSizes, int observationLength, int actionLength);
  ~Critic();

  CriticPtr clone() const;

  Model *model1;
  Model *model2;
};

#endif // MODEL_H
