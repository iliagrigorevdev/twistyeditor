
#include "Environment.h"

void Environment::init(int observationLength, int actionLength, int moveCountMax) {
  this->observation = Observation(observationLength, 0.0);
  this->actionLength = actionLength;
  this->moveCountMax = moveCountMax;
  this->seed = std::chrono::system_clock::now().time_since_epoch().count();
}

void Environment::restart() {
  reset();

  update();
}

void Environment::reset() {
  moveNumber = 0;
  done = false;
}

float Environment::step(const Action &action) {
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

void Environment::print() const {
  std::cout << "Observation:";
  for (const auto o : observation) {
    std::cout << " " << o;
  }
  std::cout << std::endl;
}

bool Environment::timeout() const {
  return (moveNumber >= moveCountMax);
}

RandomGenerator& Environment::getRandomGenerator() {
  if (randomGenerator == nullptr) {
    randomGenerator = std::make_shared<RandomGenerator>(seed);
  }
  return *randomGenerator;
}
