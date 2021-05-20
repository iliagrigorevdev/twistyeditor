emcmake cmake -B build
cd build
emmake make
emcc \
  -O3 \
  --bind \
  -s MODULARIZE \
  -s 'EXPORT_NAME=Training' \
  -s 'USE_BOOST_HEADERS=1' \
  -o ../../public/training.js \
  -Wl,--whole-archive \
  libTraining.a \
  extern/bullet/src/BulletDynamics/libBulletDynamics.a \
  extern/bullet/src/BulletCollision/libBulletCollision.a \
  extern/bullet/src/LinearMath/libLinearMath.a \
  libmlpack.a \
  -Wl,--no-whole-archive
cd ..
