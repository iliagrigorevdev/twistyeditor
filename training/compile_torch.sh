cd extern/pytorch
$(pwd)/scripts/build_host_protoc.sh
emcmake cmake -B build \
  -DCMAKE_INSTALL_PREFIX=$(pwd)/build/install \
  -DPYTHON_EXECUTABLE="$(which python3)" \
  -DCAFFE2_CUSTOM_PROTOC_EXECUTABLE=$(pwd)/build_host_protoc/bin/protoc \
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
emmake make -j 4
emmake make install
cd ../../..
