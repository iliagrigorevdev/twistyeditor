
#ifndef NETWORK_H
#define NETWORK_H

#include "Types.h"
#include "Config.h"

class Network {
public:
  Network(const Config &config, int observationLength, int actionLength);
  Network(const Config &config, ActorPtr actor, CriticPtr critic);
  Network(const Config &config, ActorPtr actor, CriticPtr critic, CriticPtr targetCritic);

  NetworkPtr clone() const;

  Config config;
  ActorPtr actor;
  CriticPtr critic;
  CriticPtr targetCritic;
};

#endif // NETWORK_H
