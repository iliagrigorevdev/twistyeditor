
#include "Network.h"
#include "Model.h"

Network::Network(const Config &config, int observationLength, int actionLength)
    : Network(config,
              std::make_shared<Actor>(config.hiddenLayerSizes, observationLength, actionLength),
              std::make_shared<Critic>(config.hiddenLayerSizes, observationLength, actionLength)) {
}

Network::Network(const Config &config, ActorPtr actor, CriticPtr critic)
    : Network(config, actor, critic, critic->clone()) {
}

Network::Network(const Config &config, ActorPtr actor, CriticPtr critic, CriticPtr targetCritic)
    : config(config)
    , actor(actor)
    , critic(critic)
    , targetCritic(targetCritic) {
}

NetworkPtr Network::clone() const {
  return std::make_shared<Network>(config, actor->clone(), critic->clone(), targetCritic->clone());
}
