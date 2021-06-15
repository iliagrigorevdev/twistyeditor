cmake -B build_standalone -DCMAKE_PREFIX_PATH=../../libtorch/share/cmake/Torch
cd build_standalone
make -j 4
cd ..
