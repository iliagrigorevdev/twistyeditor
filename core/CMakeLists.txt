CMAKE_MINIMUM_REQUIRED(VERSION 3.18)

PROJECT(TwistyEditor)

SET(CMAKE_CXX_STANDARD 14)
SET(CMAKE_CXX_STANDARD_REQUIRED True)

FIND_PACKAGE(Python3)
SET(Python ${Python3_EXECUTABLE} CACHE STRING "Python path")
SET(EmscriptenRoot $ENV{EMSDK}/upstream/emscripten CACHE STRING "Emscripten path")
SET(CmakeToolchainFile ${EmscriptenRoot}/cmake/Modules/Platform/Emscripten.cmake)
SET(WebidlBinderScript ${EmscriptenRoot}/tools/webidl_binder.py)
SET(TwistyEditorIdlFile ${CMAKE_CURRENT_SOURCE_DIR}/TwistyEditor.idl)
SET(TwistyEditorHeaderFile ${CMAKE_CURRENT_SOURCE_DIR}/TwistyEditor.h)

SET(BulletPath Bullet)
SET(TwistyEditorIncludes
  ${BulletPath}
  ./
)
SET(TwistyEditorSources
  Simulation.cpp
)

ADD_LIBRARY(TwistyEditor ${TwistyEditorSources})

TARGET_INCLUDE_DIRECTORIES(TwistyEditor PRIVATE ${TwistyEditorIncludes})

ADD_SUBDIRECTORY(${BulletPath} Bullet)

TARGET_LINK_LIBRARIES(TwistyEditor BulletDynamics)
TARGET_LINK_LIBRARIES(TwistyEditor BulletCollision)
TARGET_LINK_LIBRARIES(TwistyEditor LinearMath)

SET(EmccArgs
  --llvm-lto 1
  --post-js glue.js
  -O3
  -s ALLOW_MEMORY_GROWTH=0
  -s ALLOW_TABLE_GROWTH=1
  -s EXPORTED_RUNTIME_METHODS=["UTF8ToString"]
  -s EXTRA_EXPORTED_RUNTIME_METHODS=["addFunction"]
  -s EXPORT_NAME="TwistyEditor"
  -s MODULARIZE=1
  -s NO_EXIT_RUNTIME=1
  -s NO_FILESYSTEM=1
  -s TOTAL_MEMORY=67108864
  -s AGGRESSIVE_VARIABLE_ELIMINATION=1
  -s ELIMINATE_DUPLICATE_FUNCTIONS=1
  -s LEGACY_VM_SUPPORT=1
  -s SINGLE_FILE=1
  -s WASM=0
)

SET(EmccGlueArgs
  -c
  -I${BulletPath}
  -include${TwistyEditorHeaderFile}
)

ADD_CUSTOM_COMMAND(
  OUTPUT glue.cpp glue.js
  BYPRODUCTS parser.out WebIDLGrammar.pkl
  COMMAND ${Python} ${WebidlBinderScript} ${TwistyEditorIdlFile} glue
  DEPENDS ${TwistyEditorIdlFile}
  COMMENT "Generating bindings"
  VERBATIM
)
ADD_CUSTOM_COMMAND(
  OUTPUT glue.o
  COMMAND emcc glue.cpp ${EmccGlueArgs} -o glue.o
  DEPENDS glue.cpp ${TwistyEditorHeaderFile}
  COMMENT "Building bindings"
  VERBATIM
)
ADD_CUSTOM_TARGET(TwistyEditorBindings ALL DEPENDS glue.js glue.o)

ADD_CUSTOM_COMMAND(
  OUTPUT TwistyEditor.js
  COMMAND emcc glue.o TwistyEditor ${EmccArgs} -o TwistyEditor.js
  DEPENDS TwistyEditorBindings TwistyEditor
  COMMENT "Building javascript"
  VERBATIM
)
ADD_CUSTOM_TARGET(TwistyEditorJavascript ALL DEPENDS TwistyEditor.js)
