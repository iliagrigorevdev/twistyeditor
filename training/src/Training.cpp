
#include "Types.h"
#include "Config.h"
#include "TwistyEnv.h"
#include "Network.h"
#include "Coach.h"

#include <emscripten/bind.h>
#include <emscripten/val.h>

static Config config; // TODO config from JS
static EnvironmentPtr environment;
static NetworkPtr network;

void create(const String &data) {
  environment = std::make_shared<TwistyEnv>(data);

  const auto observationLength = environment->observation.size();
  if ((observationLength > 0) && (environment->actionLength > 0)) {
    network = std::make_shared<Network>(config, observationLength, environment->actionLength);
  } else {
    network.reset();
  }
}

void run() {
  if (network == nullptr) {
    return;
  }

  config.epochCount = 1; // XXX performance test
  Coach coach(config, environment, network);

  coach.run();
}

EMSCRIPTEN_BINDINGS(Training) {
  emscripten::function("create", &create);
  emscripten::function("run", &run);
}
