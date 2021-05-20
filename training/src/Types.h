
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
class Network;

template<typename K, typename V> using Map = std::map<K, V>;

typedef std::string String;

typedef std::vector<int> IntArray;

typedef std::valarray<float> FloatValArray;

typedef FloatValArray Observation;
typedef FloatValArray Action;

typedef std::mt19937 RandomGenerator;

typedef std::shared_ptr<Environment> EnvironmentPtr;
typedef std::shared_ptr<RandomGenerator> RandomGeneratorPtr;
typedef std::shared_ptr<Actor> ActorPtr;
typedef std::shared_ptr<Critic> CriticPtr;
typedef std::shared_ptr<Network> NetworkPtr;

#define EXCEPT(message) std::cerr << (message) << std::endl; throw std::runtime_error(message);

#endif // TYPES_H
