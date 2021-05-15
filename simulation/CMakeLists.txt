cmake_minimum_required(VERSION 3.10)

project(Simulation)

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

add_library(Simulation STATIC
  src/Environment.cpp
  src/Simulation.cpp
  env/GoalPhysicsEnv.cpp
  env/PhysicsEnv.cpp
  env/TwistyEnv.cpp
)
target_include_directories(Simulation PUBLIC
  ${PROJECT_SOURCE_DIR}/extern/bullet/src
  ${PROJECT_SOURCE_DIR}/src
  ${PROJECT_SOURCE_DIR}/env
)
target_link_libraries(Simulation PUBLIC BulletDynamics)
target_link_libraries(Simulation PUBLIC BulletCollision)
target_link_libraries(Simulation PUBLIC LinearMath)
target_compile_options(Simulation PRIVATE -Wall -Wextra -Wpedantic -Wno-sign-compare -Wno-unused-parameter)
