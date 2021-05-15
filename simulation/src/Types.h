
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

template<typename K, typename V> using Map = std::map<K, V>;

typedef std::string String;

typedef std::vector<int> IntArray;
typedef std::vector<float> FloatArray;

typedef FloatArray Observation;
typedef FloatArray Action;

typedef std::mt19937 RandomGenerator;

typedef std::shared_ptr<Environment> EnvironmentPtr;
typedef std::shared_ptr<RandomGenerator> RandomGeneratorPtr;

#define EXCEPT(message) std::cerr << (message) << std::endl; throw std::runtime_error(message);

#endif // TYPES_H
