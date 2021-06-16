if [ "$(uname)" == 'Darwin' ]; then
  MAX_JOBS=$(sysctl -n hw.ncpu)
else
  MAX_JOBS=$(nproc)
fi

cmake -B build_standalone -DCMAKE_PREFIX_PATH=../../libtorch/share/cmake/Torch
cd build_standalone
make "-j${MAX_JOBS}"
cd ..
