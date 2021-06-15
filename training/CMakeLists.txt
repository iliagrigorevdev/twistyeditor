cmake_minimum_required(VERSION 3.10)

project(Training)

set(CMAKE_CXX_STANDARD 17)

if(EMSCRIPTEN)
  set(TORCH_INCLUDE_PATH ${PROJECT_SOURCE_DIR}/extern/pytorch/build/install/include)
else()
  include(ExternalProject)
  ExternalProject_Add(Torch
    PREFIX extern/pytorch
    SOURCE_DIR ../extern/pytorch
    INSTALL_DIR extern/pytorch/install
    CMAKE_ARGS
      -DCMAKE_INSTALL_PREFIX=<INSTALL_DIR>
      -DPYTHON_EXECUTABLE=${PYTHON_EXECUTABLE}
      -DCAFFE2_CUSTOM_PROTOC_EXECUTABLE=${PROJECT_SOURCE_DIR}/extern/pytorch/build_host_protoc/bin/protoc
      -DCAFFE2_CMAKE_BUILDING_WITH_MAIN_REPO=OFF
      -DBUILD_SHARED_LIBS=OFF
      -DUSE_DISTRIBUTED=OFF
      -DATEN_NO_TEST=ON
      -DBUILD_PYTHON=OFF
      -DBUILD_CAFFE2=OFF
      -DUSE_CUDA=OFF
      -DUSE_ROCM=OFF
      -DUSE_FBGEMM=OFF
      -DUSE_KINETO=OFF
      -DUSE_NUMPY=OFF
      -DUSE_OPENMP=OFF
      -DUSE_MKLDNN=OFF
      -DUSE_NNPACK=OFF
      -DUSE_QNNPACK=OFF
      -DUSE_PYTORCH_QNNPACK=OFF
      -DUSE_XNNPACK=OFF
      -DONNX_ML=OFF
  )
  set(TORCH_BUILD_PATH ${CMAKE_BINARY_DIR}/extern/pytorch)
  set(TORCH_INSTALL_PATH ${TORCH_BUILD_PATH}/install)
  set(TORCH_INCLUDE_PATH ${TORCH_INSTALL_PATH}/include)
  set(TORCH_LIBRARY_PATH ${TORCH_INSTALL_PATH}/lib)
  set(TORCH_LIBRARY_EXT_PATH ${TORCH_BUILD_PATH}/src/Torch-build/lib)
  set(TORCH_LIBRARIES
    -Wl,--whole-archive
    ${TORCH_LIBRARY_PATH}/libtorch.a
    ${TORCH_LIBRARY_PATH}/libtorch_cpu.a
    -Wl,--no-whole-archive
    ${TORCH_LIBRARY_PATH}/libc10.a
    ${TORCH_LIBRARY_PATH}/libCaffe2_perfkernels_avx512.a
    ${TORCH_LIBRARY_PATH}/libCaffe2_perfkernels_avx2.a
    ${TORCH_LIBRARY_PATH}/libCaffe2_perfkernels_avx.a
    ${TORCH_LIBRARY_PATH}/libcaffe2_protos.a
    ${TORCH_LIBRARY_PATH}/libprotobuf.a
    ${TORCH_LIBRARY_PATH}/libprotoc.a
    ${TORCH_LIBRARY_EXT_PATH}/libonnx.a
    ${TORCH_LIBRARY_EXT_PATH}/libonnx_proto.a
    -Wl,--whole-archive
    ${TORCH_LIBRARY_PATH}/libclog.a
    -Wl,--no-whole-archive
    ${TORCH_LIBRARY_PATH}/libcpuinfo.a
    ${TORCH_LIBRARY_PATH}/libsleef.a
  )
endif()
set(TORCH_INCLUDES
  ${TORCH_INCLUDE_PATH}
  ${TORCH_INCLUDE_PATH}/torch/csrc/api/include
)
set(TORCH_CXX_FLAGS "-D_GLIBCXX_USE_CXX11_ABI=1")
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
else()
  add_executable(Training
    ${TRAINING_SOURCES}
    src/Training_standalone.cpp
  )
endif()

target_include_directories(Training PUBLIC
  ${TORCH_INCLUDES}
  ${PROJECT_SOURCE_DIR}/extern/bullet/src
  ${PROJECT_SOURCE_DIR}/src
  ${PROJECT_SOURCE_DIR}/env
)
if(NOT EMSCRIPTEN)
  target_include_directories(Training PUBLIC ${RAPIDJSON_INCLUDE_PATH})
endif()
target_link_libraries(Training PUBLIC
  BulletDynamics
  BulletCollision
  LinearMath
)
if(NOT EMSCRIPTEN)
  add_dependencies(Training Torch)
  target_link_libraries(Training PUBLIC
    ${TORCH_LIBRARIES}
    rt dl pthread stdc++fs
  )
endif()
target_compile_options(Training PRIVATE -Wall -Wextra -Wpedantic -Wno-sign-compare -Wno-unused-parameter)
