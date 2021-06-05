emcmake cmake -B build
cd build
emmake make -j 4
emcc \
  -O3 \
  --bind \
  -s MODULARIZE \
  -s 'EXPORT_NAME=Training' \
  -s 'ALLOW_MEMORY_GROWTH=1' \
  -o ../../public/training.js \
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
