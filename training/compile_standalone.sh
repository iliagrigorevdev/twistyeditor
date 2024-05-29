if [ "$(uname)" == 'Darwin' ]; then
  MAX_JOBS=$(sysctl -n hw.ncpu)
else
  MAX_JOBS=$(nproc)
fi

export PATH=$PATH:/usr/local/cuda/bin
export TORCH_CUDA_ARCH_LIST="8.0 8.6 8.9 9.0"
cmake -DCMAKE_BUILD_TYPE=Release -B build_standalone -DCMAKE_PREFIX_PATH=~/Documents/projects/tools/libtorch_cuda/share/cmake/Torch
cd build_standalone
make "-j${MAX_JOBS}"
cd ..
