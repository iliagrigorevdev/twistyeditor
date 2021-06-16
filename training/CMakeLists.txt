cmake_minimum_required(VERSION 3.10)

project(Training)

set(CMAKE_CXX_STANDARD 17)

if(EMSCRIPTEN)
  set(TORCH_INCLUDE_PATH ${PROJECT_SOURCE_DIR}/extern/pytorch/build/install/include)
  set(TORCH_INCLUDES
    ${TORCH_INCLUDE_PATH}
    ${TORCH_INCLUDE_PATH}/torch/csrc/api/include
  )
  set(TORCH_CXX_FLAGS "-D_GLIBCXX_USE_CXX11_ABI=1")
else()
  find_package(Torch REQUIRED)
endif()
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${TORCH_CXX_FLAGS}")

if(NOT EMSCRIPTEN)
  set(RAPIDJSON_INCLUDE_PATH ${PROJECT_SOURCE_DIR}/extern/rapidjson/include)
endif()

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

set(TRAINING_SOURCES
  src/Coach.cpp
  src/Environment.cpp
  src/Model.cpp
  src/Network.cpp
  src/ReplayBuffer.cpp
  env/GoalPhysicsEnv.cpp
  env/PhysicsEnv.cpp
  env/TwistyEnv.cpp
)

if(EMSCRIPTEN)
  add_library(Training STATIC
    ${TRAINING_SOURCES}
    src/Training_emscripten.cpp
  )
  target_include_directories(Training PUBLIC ${TORCH_INCLUDES})
else()
  add_executable(Training
    ${TRAINING_SOURCES}
    src/Training_standalone.cpp
  )
endif()

target_include_directories(Training PUBLIC
  ${PROJECT_SOURCE_DIR}/extern/bullet/src
  ${PROJECT_SOURCE_DIR}/src
  ${PROJECT_SOURCE_DIR}/env
)
if(NOT EMSCRIPTEN)
  target_include_directories(Training PUBLIC ${RAPIDJSON_INCLUDE_PATH})
  target_link_libraries(Training PUBLIC ${TORCH_LIBRARIES})
  target_link_libraries(Training PUBLIC stdc++fs)

  # The following code block is suggested to be used on Windows.
  # According to https://github.com/pytorch/pytorch/issues/25457,
  # the DLLs need to be copied to avoid memory errors.
  if (MSVC)
    file(GLOB TORCH_DLLS "${TORCH_INSTALL_PREFIX}/lib/*.dll")
    add_custom_command(TARGET Training
                      POST_BUILD
                      COMMAND ${CMAKE_COMMAND} -E copy_if_different
                      ${TORCH_DLLS}
                      $<TARGET_FILE_DIR:Training>)
  endif (MSVC)
endif()
target_link_libraries(Training PUBLIC
  BulletDynamics
  BulletCollision
  LinearMath
)
target_compile_options(Training PRIVATE -Wall -Wextra -Wpedantic -Wno-sign-compare -Wno-unused-parameter)
