
#include "Types.h"
#include "TwistyEnv.h"

#include <emscripten/bind.h>
#include <emscripten/val.h>

struct Info {
  int observationLength;
  int actionLength;
};

struct State {
  FloatArray observation;
  bool done;
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

State step(const FloatArray &action) {
  environment->step(action);
  return {
    environment->observation,
    environment->done || environment->timeout()
  };
}

EMSCRIPTEN_BINDINGS(Simulation) {
  emscripten::register_vector<float>("FloatArray");

  emscripten::value_object<Info>("Info")
    .field("observationLength", &Info::observationLength)
    .field("actionLength", &Info::actionLength);

  emscripten::value_object<State>("State")
    .field("observation", &State::observation)
    .field("done", &State::done);

  emscripten::function("create", &create);
  emscripten::function("reset", &reset);
  emscripten::function("step", &step);
}
