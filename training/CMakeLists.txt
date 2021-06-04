cmake_minimum_required(VERSION 3.10)

project(Training)

set(CMAKE_CXX_STANDARD 17)

set(TORCH_INCLUDE_PATH ${PROJECT_SOURCE_DIR}/extern/pytorch/build/install/include)
set(TORCH_INCLUDES
  ${TORCH_INCLUDE_PATH}
  ${TORCH_INCLUDE_PATH}/torch/csrc/api/include
)

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

add_library(Training STATIC
  src/Coach.cpp
  src/Environment.cpp
  src/Model.cpp
  src/Network.cpp
  src/ReplayBuffer.cpp
  src/Training.cpp
  env/GoalPhysicsEnv.cpp
  env/PhysicsEnv.cpp
  env/TwistyEnv.cpp
)
target_include_directories(Training PUBLIC
  ${TORCH_INCLUDES}
  ${PROJECT_SOURCE_DIR}/extern/bullet/src
  ${PROJECT_SOURCE_DIR}/src
  ${PROJECT_SOURCE_DIR}/env
)
target_link_libraries(Training PUBLIC
  BulletDynamics
  BulletCollision
  LinearMath
)
target_compile_options(Training PRIVATE -Wall -Wextra -Wpedantic -Wno-sign-compare -Wno-unused-parameter)
