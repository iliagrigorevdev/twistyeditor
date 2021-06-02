cd extern/pytorch
$(pwd)/scripts/build_host_protoc.sh
cmake -B build \
  -DCMAKE_INSTALL_PREFIX=$(pwd)/build/install \
  -DPYTHON_EXECUTABLE="$(which python3)" \
  -DCAFFE2_CUSTOM_PROTOC_EXECUTABLE=$(pwd)/build_host_protoc/bin/protoc \
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
cmake --build . --target install -- -j 4
cd ../../..

cmake -B build -DCMAKE_PREFIX_PATH=$(pwd)/extern/pytorch/build/install/share/cmake/Torch
cd build
cmake --build . -- -j 4
cd ..

# emcmake cmake -B build
# cd build
# emmake make
# emcc \
#   -O3 \
#   --bind \
#   -s MODULARIZE \
#   -s 'EXPORT_NAME=Training' \
#   -o ../../public/training.js \
#   -Wl,--whole-archive \
#   libTraining.a \
#   extern/bullet/src/BulletDynamics/libBulletDynamics.a \
#   extern/bullet/src/BulletCollision/libBulletCollision.a \
#   extern/bullet/src/LinearMath/libLinearMath.a \
#   -Wl,--no-whole-archive
# cd ..
