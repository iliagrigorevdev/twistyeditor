
#include "Types.h"
#include "Config.h"
#include "TwistyEnv.h"
#include "Network.h"

#include <emscripten/bind.h>
#include <emscripten/val.h>

static std::shared_ptr<TwistyEnv> environment;
static NetworkPtr network;

static std::default_random_engine randomGenerator(std::chrono::system_clock::now().time_since_epoch().count());
static std::uniform_real_distribution<float> actionDistribution(-1, 1);

void create(const String &data) {
  environment = std::make_shared<TwistyEnv>(data);
  environment->restart();

  Config config; // TODO config from JS
  network = std::make_shared<Network>(config, environment->observation.size(),
                                      environment->actionLength);
}

bool step() {
  Action action(0.0, environment->actionLength);
  for (auto &value : action) {
    value = actionDistribution(randomGenerator);
  }
  environment->step(action);
  return environment->done || environment->timeout();
}

void restart() {
  return environment->restart();
}

EMSCRIPTEN_BINDINGS(Training) {
  emscripten::function("create", &create);
  emscripten::function("step", &step);
  emscripten::function("restart", &restart);
}
