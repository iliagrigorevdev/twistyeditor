
#include "Types.h"
#include "Config.h"
#include "TwistyEnv.h"
#include "Network.h"
#include "Coach.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Weverything"
#include "OpenGLWindow/SimpleOpenGL3App.h"
#include "ExampleBrowser/OpenGLGuiHelper.h"
#include "LinearMath/btVector3.h"
#pragma clang diagnostic pop

#define RAPIDJSON_HAS_STDSTRING 1
#include "rapidjson/document.h"
#include <rapidjson/ostreamwrapper.h>
#include <rapidjson/writer.h>
#include "rapidjson/error/en.h"

#include <chrono>
#include <filesystem>
#include <fstream>
#include <streambuf>

static const int frameTime = 40;
static const float cameraDistance = 10;
static const float cameraYaw = 190;
static const float cameraPitch = -45;

static rapidjson::Document loadDocument(const String &filePath) {
  std::ifstream file(filePath);
  String content;
  file.seekg(0, std::ios::end);   
  content.reserve(file.tellg());
  file.seekg(0, std::ios::beg);
  content.assign(std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>());
  file.close();
  rapidjson::Document document;
  if (document.Parse(content).HasParseError()) {
    std::cerr << "Input is not a valid JSON (offset "
              << document.GetErrorOffset() << "): "
              << rapidjson::GetParseError_En(document.GetParseError())
              << std::endl;
    exit(1);
  }
  return document;
}

int main(int argc, char* argv[]) {
  if (argc < 2) {
    std::cerr << "Usage: " << argv[0] << " FILEPATH" << std::endl;
    return 1;
  }

  const std::filesystem::path inputFilePath(argv[1]);

  auto document = loadDocument(inputFilePath.string());
  if (!document.HasMember("shapeData")) {
    std::cerr << "Shape data not found" << std::endl;
    return 1;
  }
  if (!document.HasMember("checkpoint")) {
    std::cerr << "Checkpoint not found" << std::endl;
    return 1;
  }
  if (!document["checkpoint"].HasMember("data") || document["checkpoint"]["data"].IsNull()) {
    std::cerr << "Checkpoint data not found or empty" << std::endl;
    return 1;
  }

  const String shapeData = document["shapeData"].GetString();
  const String checkpointData(document["checkpoint"]["data"].GetString(),
                              document["checkpoint"]["data"].GetStringLength());

  const auto environment = std::make_shared<TwistyEnv>(shapeData);

  const auto observationLength = environment->observation.size();
  if ((observationLength == 0) || (environment->actionLength == 0)) {
    return 1;
  }

  Config config;
  const auto network = std::make_shared<Network>(config, observationLength, environment->actionLength);
  network->load(checkpointData);

  auto *app = new SimpleOpenGL3App("Playing", 1600, 1600);
  static auto *guiHelper = new OpenGLGuiHelper(app, false);
  guiHelper->setUpAxis(1);

  auto lastTime = std::chrono::steady_clock::now();
  while (!app->m_window->requestedExit()) {
    if (environment->done || environment->timeout()) {
      guiHelper->removeAllGraphicsInstances();
      environment->restart();
      guiHelper->autogenerateGraphicsObjects(environment->dynamicsWorld);
    }

    const auto action = network->predict(environment->observation);
    environment->step(action);

    const auto &cameraTarget = environment->baseBody->getWorldTransform().getOrigin();
    guiHelper->resetCamera(cameraDistance, cameraYaw, cameraPitch,
                          cameraTarget.x(), cameraTarget.y(), cameraTarget.z());
    guiHelper->syncPhysicsToGraphics(environment->dynamicsWorld);
    guiHelper->render(environment->dynamicsWorld);
    app->swapBuffer();

    const auto elapsedTime = std::chrono::duration_cast<std::chrono::milliseconds>
                              (std::chrono::steady_clock::now() - lastTime).count();
    if (elapsedTime < frameTime) {
      std::this_thread::sleep_for(std::chrono::milliseconds(frameTime - elapsedTime));
    }
    lastTime = std::chrono::steady_clock::now();
  }

  delete guiHelper;
  delete app;

  return 0;
}
