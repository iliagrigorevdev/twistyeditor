
#include "Types.h"
#include "Config.h"
#include "TwistyEnv.h"
#include "Network.h"
#include "Coach.h"

#include <emscripten/bind.h>
#include <emscripten/val.h>

static Config config; // TODO config from JS
static CoachPtr coach;

void create(const String &data) {
  coach.reset();

  const auto environment = std::make_shared<TwistyEnv>(data);
  const auto observationLength = environment->observation.size();
  if ((observationLength == 0) || (environment->actionLength == 0)) {
    return;
  }

  const auto network = std::make_shared<Network>(config, observationLength,
                                                 environment->actionLength);
  coach = std::make_shared<Coach>(config, environment, network);
}

void step() {
  if (coach == nullptr) {
    return;
  }

  coach->step();
}

EMSCRIPTEN_BINDINGS(Training) {
  emscripten::function("create", &create);
  emscripten::function("step", &step);
}
