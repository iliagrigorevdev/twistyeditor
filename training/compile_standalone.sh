cd extern/pytorch
$(pwd)/scripts/build_host_protoc.sh
cd ../..

cmake -B build_standalone -DPYTHON_EXECUTABLE="$(which python3)"
cd build_standalone
make -j 4
cd ..
