if [ "$(uname)" == 'Darwin' ]; then
  MAX_JOBS=$(sysctl -n hw.ncpu)
else
  MAX_JOBS=$(nproc)
fi

cd extern/pytorch
$(pwd)/scripts/build_host_protoc.sh
emcmake cmake -B build \
  -DCMAKE_INSTALL_PREFIX=$(pwd)/build/install \
  -DPYTHON_EXECUTABLE="$(which python3)" \
  -DCAFFE2_CUSTOM_PROTOC_EXECUTABLE=$(pwd)/build_host_protoc/bin/protoc \
  -DSELECTED_OP_LIST=$(pwd)/../../ops.yaml \
  -DBUILD_SHARED_LIBS=OFF \
  -DCAFFE2_CMAKE_BUILDING_WITH_MAIN_REPO=OFF \
  -DUSE_DISTRIBUTED=OFF \
  -DATEN_NO_TEST=ON \
  -DBUILD_PYTHON=OFF \
  -DBUILD_CAFFE2=OFF \
  -DUSE_CUDA=OFF \
  -DUSE_ROCM=OFF \
  -DUSE_FBGEMM=OFF \
  -DUSE_KINETO=OFF \
  -DUSE_NUMPY=OFF \
  -DUSE_OPENMP=OFF \
  -DUSE_MKLDNN=OFF \
  -DUSE_NNPACK=OFF \
  -DUSE_QNNPACK=OFF \
  -DUSE_PYTORCH_QNNPACK=OFF \
  -DUSE_XNNPACK=OFF \
  -DONNX_ML=OFF
cd build
emmake make "-j${MAX_JOBS}"
emmake make install
cd ../../..

mkdir -p ../public/static/js
emcmake cmake -B build_emscripten
cd build_emscripten
emmake make "-j${MAX_JOBS}"
emcc \
  -O3 \
  --bind \
  -s MODULARIZE \
  -s 'EXPORT_NAME=Training' \
  -s 'ALLOW_MEMORY_GROWTH=1' \
  -o ../../public/static/js/training.js \
  -Wl,--whole-archive \
  libTraining.a \
  ../extern/pytorch/build/lib/libc10.a \
  ../extern/pytorch/build/lib/libcaffe2_protos.a \
  ../extern/pytorch/build/lib/libclog.a \
  ../extern/pytorch/build/lib/libcpuinfo.a \
  ../extern/pytorch/build/lib/libprotobuf.a \
  ../extern/pytorch/build/lib/libprotoc.a \
  ../extern/pytorch/build/lib/libtorch.a \
  ../extern/pytorch/build/lib/libtorch_cpu.a \
  extern/bullet/src/BulletDynamics/libBulletDynamics.a \
  extern/bullet/src/BulletCollision/libBulletCollision.a \
  extern/bullet/src/LinearMath/libLinearMath.a \
  -Wl,--no-whole-archive
cd ..
