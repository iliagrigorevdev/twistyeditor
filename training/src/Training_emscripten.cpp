
#include "Types.h"
#include "Config.h"

#include "TwistyEnv.cpp"
#include "Network.cpp"
#include "Coach.cpp"

#include <emscripten/bind.h>
#include <emscripten/val.h>

struct Vector {
  float x, y, z;
};

struct Quaternion {
  float x, y, z, w;
};

struct Transform {
  Vector position;
  Quaternion orientation;
};

struct StepResult {
  float reward;
  bool done;
};

struct State {
  Vector goalPosition;
  Array<Transform> transforms;
};

typedef std::shared_ptr<twistyenv::TwistyEnv> TwistyEnvPtr;

static TwistyEnvPtr environment;
static NetworkPtr network;
static CoachPtr coach;

void create(const Config &config, const String &data) {
  environment = std::make_shared<twistyenv::TwistyEnv>(data);
  const auto observationLength = environment->getObservation().size();
  if ((observationLength == 0) || (environment->getActionLength() == 0)) {
    network.reset();
    coach.reset();
    return;
  }

  network = std::make_shared<Network>(config, observationLength,
                                      environment->getActionLength());
  coach = std::make_shared<Coach>(config,
                                  std::make_shared<twistyenv::TwistyEnv>(data),
                                  network);
}

StepResult step() {
  if (coach == nullptr) {
    return {0, false};
  }
  const auto reward = coach->step();
  const auto done = coach->getEnvironment()->isDone() || coach->getEnvironment()->timeout();
  return {reward, done};
}

ActorCriticLosses train() {
  if (coach == nullptr) {
    return {0, 0};
  }
  return coach->train();
}

String save() {
  if (network == nullptr) {
    return "";
  }
  return network->save();
}

void load(const String &data) {
  if (network == nullptr) {
    return;
  }
  network->load(data);
}

State evaluate() {
  if (environment->isDone() || environment->timeout()) {
    environment->restart();
  }
  const auto action = (network == nullptr
                       ? environment->randomAction()
                       : network->predict(environment->getObservation()));
  environment->step(action);

  State state;
  state.goalPosition.x = environment->getTarget().x();
  state.goalPosition.y = environment->getTarget().y();
  state.goalPosition.z = environment->getTarget().z();
  for (const auto *body : environment->getBodies()) {
    const auto &transform = body->getWorldTransform();
    const auto &position = transform.getOrigin();
    const auto orientation = transform.getRotation();
    state.transforms.push_back({
      {position.x(), position.y(), position.z()},
      {orientation.x(), orientation.y(), orientation.z(), orientation.w()}
    });
  }
  return state;
}

EMSCRIPTEN_BINDINGS(Training) {
  emscripten::value_object<Config>("Config")
    .field("discount", &Config::discount)
    .field("batchSize", &Config::batchSize)
    .field("randomSteps", &Config::randomSteps)
    .field("replayBufferSize", &Config::replayBufferSize)
    .field("actorLearningRate", &Config::actorLearningRate)
    .field("criticLearningRate", &Config::criticLearningRate)
    .field("regularization", &Config::regularization)
    .field("interpolation", &Config::interpolation)
    .field("hiddenLayerSizes", &Config::hiddenLayerSizes);

  emscripten::value_object<Vector>("Vector")
    .field("x", &Vector::x)
    .field("y", &Vector::y)
    .field("z", &Vector::z);

  emscripten::value_object<Quaternion>("Quaternion")
    .field("x", &Quaternion::x)
    .field("y", &Quaternion::y)
    .field("z", &Quaternion::z)
    .field("w", &Quaternion::w);

  emscripten::value_object<Transform>("Transform")
    .field("position", &Transform::position)
    .field("orientation", &Transform::orientation);

  emscripten::value_object<StepResult>("StepResult")
    .field("reward", &StepResult::reward)
    .field("done", &StepResult::done);

  emscripten::value_object<ActorCriticLosses>("ActorCriticLosses")
    .field("lossP", &ActorCriticLosses::first)
    .field("lossV", &ActorCriticLosses::second);

  emscripten::value_object<State>("State")
    .field("goalPosition", &State::goalPosition)
    .field("transforms", &State::transforms);

  emscripten::register_vector<int>("IntArray");
  emscripten::register_vector<Transform>("Transforms");

  emscripten::function("create", &create);
  emscripten::function("step", &step);
  emscripten::function("train", &train);
  emscripten::function("save", &save);
  emscripten::function("load", &load);
  emscripten::function("evaluate", &evaluate);
}
