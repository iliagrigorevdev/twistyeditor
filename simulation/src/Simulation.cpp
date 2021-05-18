
#include "Types.h"
#include "TwistyEnv.h"

#include <emscripten/bind.h>
#include <emscripten/val.h>

struct Info {
  int observationLength;
  int actionLength;
};

struct Result {
  float reward;
  bool done;
  FloatArray observation;
};

static std::shared_ptr<TwistyEnv> environment;

Info create(const String &data) {
  environment = std::make_shared<TwistyEnv>(data);
  return {
    static_cast<int>(environment->observation.size()),
    environment->actionLength
  };
}

Observation reset() {
  environment->restart();
  return environment->observation;
}

Result step(const FloatArray &action) {
  const auto reward = environment->step(action);
  return {
    reward,
    environment->done || environment->timeout(),
    environment->observation
  };
}

EMSCRIPTEN_BINDINGS(Simulation) {
  emscripten::register_vector<float>("FloatArray");

  emscripten::value_object<Info>("Info")
    .field("observationLength", &Info::observationLength)
    .field("actionLength", &Info::actionLength);

  emscripten::value_object<Result>("Result")
    .field("reward", &Result::reward)
    .field("done", &Result::done)
    .field("observation", &Result::observation);

  emscripten::function("create", &create);
  emscripten::function("reset", &reset);
  emscripten::function("step", &step);
}
