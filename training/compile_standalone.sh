if [ "$(uname)" == 'Darwin' ]; then
  MAX_JOBS=$(sysctl -n hw.ncpu)
else
  MAX_JOBS=$(nproc)
fi

cmake -DCMAKE_BUILD_TYPE=Release -B build_standalone
cd build_standalone
make "-j${MAX_JOBS}"
cd ..
