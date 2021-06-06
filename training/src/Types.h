
#ifndef TYPES_H
#define TYPES_H

#include <memory>
#include <valarray>
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
class Actor;
class Critic;
class Model;
class Network;
class ReplayBuffer;
class Coach;

template<typename K, typename V> using Map = std::map<K, V>;
template<typename T> using Array = std::vector<T>;

typedef std::string String;

typedef Array<int> IntArray;

typedef std::valarray<float> FloatValArray;

typedef FloatValArray Observation;
typedef FloatValArray Action;

typedef std::mt19937 RandomGenerator;

typedef std::pair<float, float> ActorCriticLosses;

typedef std::tuple<Observation, Action, float, Observation, bool> Sample;
typedef std::shared_ptr<Sample> SamplePtr;
typedef Array<SamplePtr> SamplePtrs;

typedef std::shared_ptr<Environment> EnvironmentPtr;
typedef std::shared_ptr<Actor> ActorPtr;
typedef std::shared_ptr<Critic> CriticPtr;
typedef std::shared_ptr<Model> ModelPtr;
typedef std::shared_ptr<Network> NetworkPtr;
typedef std::shared_ptr<RandomGenerator> RandomGeneratorPtr;
typedef std::shared_ptr<ReplayBuffer> ReplayBufferPtr;
typedef std::shared_ptr<Coach> CoachPtr;

#define EXCEPT(message) std::cerr << (message) << std::endl; throw std::runtime_error(message);

#endif // TYPES_H
