
#ifndef TYPES_H
#define TYPES_H

#include <memory>
#include <vector>
#include <array>
#include <map>
#include <iostream>
#include <sstream>
#include <string>
#include <stdexcept>
#include <random>
#include <chrono>

class Environment;
class Network;
class ReplayBuffer;

template<typename K, typename V> using Map = std::map<K, V>;

typedef std::string String;

typedef std::vector<int> IntArray;

typedef std::vector<double> DoubleArray;

typedef DoubleArray Observation;
typedef DoubleArray Action;

typedef std::mt19937 RandomGenerator;

typedef std::pair<double, double> ActorCriticLosses;

typedef std::tuple<Observation, Action, float, Observation, bool> Sample;
typedef std::shared_ptr<Sample> SamplePtr;
typedef std::vector<SamplePtr> SamplePtrs;

typedef std::shared_ptr<Environment> EnvironmentPtr;
typedef std::shared_ptr<RandomGenerator> RandomGeneratorPtr;
typedef std::shared_ptr<Network> NetworkPtr;
typedef std::shared_ptr<ReplayBuffer> ReplayBufferPtr;

#define EXCEPT(message) std::cerr << (message) << std::endl; throw std::runtime_error(message);

#endif // TYPES_H
