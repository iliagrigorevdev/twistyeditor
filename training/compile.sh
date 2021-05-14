emcmake cmake -B build
cd build
emmake make
emcc \
  -O3 \
  --bind \
  -s MODULARIZE \
  -s 'EXPORT_NAME=Training' \
  -o ../../public/training.js \
  -Wl,--whole-archive \
  libTraining.a \
  extern/bullet/src/BulletDynamics/libBulletDynamics.a \
  extern/bullet/src/BulletCollision/libBulletCollision.a \
  extern/bullet/src/LinearMath/libLinearMath.a \
  -Wl,--no-whole-archive
cd ..
