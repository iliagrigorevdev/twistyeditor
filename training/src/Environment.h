
#ifndef ENVIRONMENT_H
#define ENVIRONMENT_H

#include "Types.h"

class Environment {
public:
  Environment() = default;
  virtual ~Environment() = default;

  void init(int observationLength, int actionLength, int moveCountMax);

  void restart();
  virtual void reset();

  virtual void update() = 0;

  float step(const Action &action);
  virtual float act(const Action &action) = 0;

  virtual void print() const;

  bool timeout() const;

  RandomGenerator& getRandomGenerator();

  Action randomAction();

  Observation observation;
  int actionLength = 0;
  int moveCountMax = 0;
  RandomGeneratorPtr randomGenerator;
  int seed = 0;
  int moveNumber = 0;
  bool done = true;
};

#endif // ENVIRONMENT_H
