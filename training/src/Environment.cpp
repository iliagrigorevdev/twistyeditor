
#ifndef ENVIRONMENT_CPP
#define ENVIRONMENT_CPP

#include "Types.h"

class Environment {
public:
  Environment() = default;
  virtual ~Environment() = default;

  const Observation& getObservation() const {
    return observation;
  }

  int getActionLength() const {
    return actionLength;
  }

  bool isDone() const {
    return done;
  }

  int getMoveNumber() const {
    return moveNumber;
  }

  void init(int observationLength, int actionLength, int moveCountMax) {
    this->observation = Observation(0.0, observationLength);
    this->actionLength = actionLength;
    this->moveCountMax = moveCountMax;
    this->seed = std::chrono::system_clock::now().time_since_epoch().count();
  }

  void restart() {
    reset();

    update();
  }

  virtual void reset() {
    moveNumber = 0;
    done = false;
  }

  virtual void update() = 0;

  float step(const Action &action) {
    if (action.size() != actionLength) {
      EXCEPT("Invalid action length: " + std::to_string(action.size()));
    }
    if (done) {
      EXCEPT("Environment done");
    }

    const auto reward = act(action);
    moveNumber++;

    update();

    return reward;
  }

  virtual float act(const Action &action) = 0;

  virtual void print() const {
    std::cout << "Observation:";
    for (const auto o : observation) {
      std::cout << " " << o;
    }
    std::cout << std::endl;
  }

  bool timeout() const {
    return (moveNumber >= moveCountMax);
  }

  RandomGenerator& getRandomGenerator() {
    if (randomGenerator == nullptr) {
      randomGenerator = std::make_shared<RandomGenerator>(seed);
    }
    return *randomGenerator;
  }

  Action randomAction() {
    std::uniform_real_distribution<float> actionDistribution(-1, 1);
    Action action(0.0, actionLength);
    for (auto &value : action) {
      value = actionDistribution(getRandomGenerator());
    }
    return action;
  }

protected:
  Observation observation;
  int actionLength = 0;
  int moveCountMax = 0;
  RandomGeneratorPtr randomGenerator;
  int seed = 0;
  int moveNumber = 0;
  bool done = true;
};

#endif // ENVIRONMENT_CPP
