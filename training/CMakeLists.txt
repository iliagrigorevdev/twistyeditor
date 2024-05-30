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
  set(ENV{CUDACXX} "/usr/local/cuda/bin/nvcc")
  find_package(Torch REQUIRED PATHS ~/Documents/projects/tools/libtorch_cuda/share/cmake/Torch)
endif()
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${TORCH_CXX_FLAGS}")

if(NOT EMSCRIPTEN)
  set(RAPIDJSON_INCLUDE_PATH ${PROJECT_SOURCE_DIR}/extern/rapidjson/include)
endif()

set(BUILD_UNIT_TESTS OFF CACHE BOOL "" FORCE)
add_subdirectory(${PROJECT_SOURCE_DIR}/extern/bullet extern/bullet EXCLUDE_FROM_ALL)

set(CORE_SOURCES
  src/Environment.cpp
  src/Model.cpp
  src/Network.cpp
  env/GoalPhysicsEnv.cpp
  env/PhysicsEnv.cpp
  env/TwistyEnv.cpp
)

set(TRAINING_SOURCES
  ${CORE_SOURCES}
  src/Coach.cpp
  src/ReplayBuffer.cpp
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

  add_executable(Playing
    ${CORE_SOURCES}
    src/Playing.cpp
  )
endif()

target_include_directories(Training PUBLIC
  ${PROJECT_SOURCE_DIR}/extern/bullet/src
  ${PROJECT_SOURCE_DIR}/src
  ${PROJECT_SOURCE_DIR}/env
)
if(NOT EMSCRIPTEN)
  target_include_directories(Training PRIVATE ${RAPIDJSON_INCLUDE_PATH})
  target_link_libraries(Training PRIVATE ${TORCH_LIBRARIES})
  if(LINUX)
    target_link_libraries(Training PRIVATE stdc++fs)
  endif()

  target_include_directories(Playing PRIVATE
    ${PROJECT_SOURCE_DIR}/extern/bullet/src
    ${PROJECT_SOURCE_DIR}/extern/bullet/examples
    ${PROJECT_SOURCE_DIR}/src
    ${PROJECT_SOURCE_DIR}/env
    ${RAPIDJSON_INCLUDE_PATH}
  )
  target_link_libraries(Playing PRIVATE
    ${TORCH_LIBRARIES}
    OpenGLWindow
    BulletExampleBrowserLib
    Bullet3Common
    BulletDynamics
    BulletCollision
    LinearMath
  )
  if(LINUX)
    target_link_libraries(Playing PRIVATE stdc++fs)
  endif()

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
