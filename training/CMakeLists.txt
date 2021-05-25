cmake_minimum_required(VERSION 3.10)

project(Training)

set(CMAKE_CXX_STANDARD 17)

set(USE_GRAPHICAL_BENCHMARK OFF CACHE BOOL "" FORCE)
set(BUILD_CPU_DEMOS OFF CACHE BOOL "" FORCE)
set(BUILD_CLSOCKET OFF CACHE BOOL "" FORCE)
set(BUILD_ENET OFF CACHE BOOL "" FORCE)
set(BUILD_EGL OFF CACHE BOOL "" FORCE)
set(BUILD_OPENGL3_DEMOS OFF CACHE BOOL "" FORCE)
set(BUILD_BULLET2_DEMOS OFF CACHE BOOL "" FORCE)
set(BUILD_EXTRAS OFF CACHE BOOL "" FORCE)
set(BUILD_UNIT_TESTS OFF CACHE BOOL "" FORCE)
set(INSTALL_LIBS OFF CACHE BOOL "" FORCE)
set(INSTALL_CMAKE_FILES OFF CACHE BOOL "" FORCE)
add_subdirectory(${PROJECT_SOURCE_DIR}/extern/bullet extern/bullet EXCLUDE_FROM_ALL)

add_definitions(-DARMA_DONT_USE_WRAPPER -DMLPACK_STATIC_DEFINE)
add_library(mlpack STATIC
  extern/mlpack/src/mlpack/core/data/detect_file_type.cpp
  extern/mlpack/src/mlpack/core/data/load.cpp
  extern/mlpack/src/mlpack/core/data/load_csv.cpp
  extern/mlpack/src/mlpack/core/util/io.cpp
  extern/mlpack/src/mlpack/core/util/log.cpp
  extern/mlpack/src/mlpack/core/util/prefixedoutstream.cpp
  extern/mlpack/src/mlpack/core/util/singletons.cpp
  extern/mlpack/src/mlpack/core/util/timers.cpp
)
target_include_directories(mlpack PUBLIC
  ${PROJECT_SOURCE_DIR}/extern/cereal/include
  ${PROJECT_SOURCE_DIR}/src
  ${PROJECT_SOURCE_DIR}/src/mlpack
  ${PROJECT_SOURCE_DIR}/extern/armadillo/include
  ${PROJECT_SOURCE_DIR}/extern/mlpack/src
)
#set_target_properties(mlpack PROPERTIES COMPILE_FLAGS "-s USE_BOOST_HEADERS=1")

add_library(Training STATIC
  src/Environment.cpp
  src/Model.cpp
  src/Network.cpp
  src/Training.cpp
  env/GoalPhysicsEnv.cpp
  env/PhysicsEnv.cpp
  env/TwistyEnv.cpp
)
target_include_directories(Training PUBLIC
  ${PROJECT_SOURCE_DIR}/extern/bullet/src
  ${PROJECT_SOURCE_DIR}/extern/ensmallen/include
  ${PROJECT_SOURCE_DIR}/src
  ${PROJECT_SOURCE_DIR}/env
)
target_link_libraries(Training PUBLIC BulletDynamics)
target_link_libraries(Training PUBLIC BulletCollision)
target_link_libraries(Training PUBLIC LinearMath)
target_link_libraries(Training PUBLIC mlpack)
target_compile_options(Training PRIVATE -Wall -Wextra -Wpedantic -Wno-sign-compare -Wno-unused-parameter)
