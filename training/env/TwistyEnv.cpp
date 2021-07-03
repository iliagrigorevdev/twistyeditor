
#include "TwistyEnv.h"

#include <filesystem>

static const float prismHeight = 1;
static const float prismBase = 2 * prismHeight;
static const float prismSide = std::sqrt(prismBase);
static const float prismHalfHeight = prismHeight / 2;
static const float prismHalfBase = prismBase / 2;
static const float prismHalfSide = prismSide / 2;

static const float prismMargin = 0.04;
static const float prismMarginDiag = prismMargin * std::cos(SIMD_PI / 4);

static const float prismCgH = prismHeight / 3;
static const float prismCgDy = prismHalfHeight - prismCgH;

static const float jointLimit = 0.99;

static const int defaultEnvironmentSteps = 1000;
static const float defaultGravity = -9.81;
static const float defaultTargetDistance = 30;
static const float defaultGroundFriction = 0.8;
static const float defaultPrismFriction = 0.8;
static const float defaultGroundRestitution = 0;
static const float defaultPrismRestitution = 0;

static const float defaultAdvanceReward = 1;
static const float defaultAliveReward = 0;
static const float defaultForwardReward = 0;
static const float defaultJointAtLimitCost = -10;
static const float defaultDriveCost = 0;
static const float defaultStallTorqueCost = 0;

static const std::array<btVector3, 6> prismCollisionVertices = {{
  {
    -prismHalfBase + 2 * prismMarginDiag + prismMargin,
    -prismHalfHeight + prismCgDy + prismMargin,
    -prismHalfSide + prismMargin
  },
  {
    -prismHalfBase + 2 * prismMarginDiag + prismMargin,
    -prismHalfHeight + prismCgDy + prismMargin,
    prismHalfSide - prismMargin
  },
  {
    0,
    prismHalfHeight + prismCgDy - 2 * prismMarginDiag,
    -prismHalfSide + prismMargin
  },
  {
    0,
    prismHalfHeight + prismCgDy - 2 * prismMarginDiag,
    prismHalfSide - prismMargin
  },
  {
    prismHalfBase - 2 * prismMarginDiag - prismMargin,
    -prismHalfHeight + prismCgDy + prismMargin,
    -prismHalfSide + prismMargin
  },
  {
    prismHalfBase - 2 * prismMarginDiag - prismMargin,
    -prismHalfHeight + prismCgDy + prismMargin,
    prismHalfSide - prismMargin
  }
}};

template<typename T>
static T readValue(std::istringstream &stream) {
  T value;
  stream >> value;
  return value;
}

static btVector3 readVector(std::istringstream &stream) {
  return {readValue<btScalar>(stream), readValue<btScalar>(stream), readValue<btScalar>(stream)};
}

static btQuaternion readQuaternion(std::istringstream &stream) {
  return {readValue<btScalar>(stream), readValue<btScalar>(stream),
          readValue<btScalar>(stream), readValue<btScalar>(stream)};
}

static btTransform readTransform(std::istringstream &stream) {
  const auto position = readVector(stream);
  auto orientation = readQuaternion(stream);
  orientation.normalize();
  return btTransform(orientation, position);
}

TwistyEnv::TwistyEnv(const String &data)
    : environmentSteps(defaultEnvironmentSteps)
    , gravity(defaultGravity)
    , targetDistance(defaultTargetDistance)
    , groundFriction(defaultGroundFriction)
    , prismFriction(defaultPrismFriction)
    , groundRestitution(defaultGroundRestitution)
    , prismRestitution(defaultPrismRestitution)
    , advanceReward(defaultAdvanceReward)
    , aliveReward(defaultAliveReward)
    , forwardReward(defaultForwardReward)
    , jointAtLimitCost(defaultJointAtLimitCost)
    , driveCost(defaultDriveCost)
    , stallTorqueCost(defaultStallTorqueCost)
    , activeJointCount(0)
    , baseLinkIndex(-1)
    , groundObject(nullptr) {
  parseData(data);
  validateData();

  setTargetDistance(targetDistance);

  dynamicsWorld->setGravity({0, gravity, 0});

  groundObject = createGround(groundFriction, groundRestitution);

  const auto observationLength = 10 + 2 * activeJointCount + links.size();
  Environment::init(observationLength, activeJointCount, environmentSteps);

  auto *prismShape = new btConvexHullShape();
  prismShape->setMargin(prismMargin);
  for (const auto &vertex : prismCollisionVertices) {
    prismShape->addPoint(vertex, false);
  }
  prismShape->recalcLocalAabb();
  putShape("prism", prismShape);
}

void TwistyEnv::reset() {
  GoalPhysicsEnv::reset();

  bodies.clear();
  constraints.clear();

  auto *prismShape = getShape("prism");

  for (int i = 0; i < links.size(); i++) {
    const auto &link = links[i];

    const auto shapeName = "link" + std::to_string(i);
    auto *linkShape = getShape(shapeName, false);
    if (linkShape == nullptr) {
      auto *shape = new btCompoundShape();
      for (const auto &prism : link.prisms) {
        shape->addChildShape(prism.transform, prismShape);
      }
      putShape(shapeName, shape);
      linkShape = shape;
    }

    auto *body = createBody(shapeName, link.transform, dynamicGroup, dynamicMask,
                            link.mass, link.inertia, prismFriction, prismRestitution);
    body->setUserIndex2(i);
    if (i == baseLinkIndex) {
      baseBody = body;
    }
    bodies.push_back(body);
  }

  for (int i = 0; i < joints.size(); i++) {
    const auto &joint = joints[i];

    auto *baseBody = bodies[joint.baseIndex];
    auto *targetBody = bodies[joint.targetIndex];
    const auto &baseLink = links[joint.baseIndex];
    const auto &targetLink = links[joint.targetIndex];
    const auto baseFrame = baseLink.transform.inverse() * joint.transform;
    const auto targetFrame = targetLink.transform.inverse() * joint.transform;
    auto *constraint = constrainBodies(baseBody, targetBody,
                                       baseFrame, targetFrame,
                                       {0, 0, 0}, {0, 0, 0},
                                       {btRadians(joint.lowerAngle), 0, 0},
                                       {btRadians(joint.upperAngle), 0, 0},
                                       true);
    constraints.push_back(constraint);
  }
}

void TwistyEnv::update() {
  int index = 0;
  const auto [angleToGoal, pitch, roll, linearVelocity, angularVelocity] = goalInfo();
  observation[index++] = std::cos(angleToGoal);
  observation[index++] = std::sin(angleToGoal);
  observation[index++] = pitch;
  observation[index++] = roll;
  observation[index++] = linearVelocity.x();
  observation[index++] = linearVelocity.y();
  observation[index++] = linearVelocity.z();
  observation[index++] = angularVelocity.x();
  observation[index++] = angularVelocity.y();
  observation[index++] = angularVelocity.z();

  // Joint parameters
  for (int i = 0; i < joints.size(); i++) {
    const auto &joint = joints[i];
    if (joint.power == 0) {
      continue;
    }
    auto *constraint = constraints[i];
    const auto &axis = constraint->getCalculatedTransformB().getBasis().getColumn(0);
    const auto &angularVelocity = constraint->getRigidBodyB().getAngularVelocity();
    observation[index++] = -constraint->getAngle(0);
    observation[index++] = (axis * angularVelocity).x();
  }

  // Ground contacts
  for (int i = 0; i < links.size(); i++) {
    observation[index + i] = 0;
  }
  const auto numManifolds = dynamicsWorld->getDispatcher()->getNumManifolds();
  for (int i = 0; i < numManifolds; i++) {
    const auto *contactManifold = dynamicsWorld->getDispatcher()->getManifoldByIndexInternal(i);
    if (contactManifold->getNumContacts() == 0) {
      continue;
    }
    const auto *body0 = contactManifold->getBody0();
    const auto *body1 = contactManifold->getBody1();
    if ((body0 != groundObject) && (body1 != groundObject)) {
      continue;
    }
    const auto *body = (body0 == groundObject ? body1 : body0);
    const auto linkIndex = body->getUserIndex2();
    if (linkIndex == -1) {
      continue;
    }
    if ((linkIndex == baseLinkIndex) && (aliveReward != 0)) {
      done = true;
    }
    observation[index + linkIndex] = 1;
  }
}

void TwistyEnv::applyForces(const Action &action) {
  int actionIndex = 0;
  for (int i = 0; i < joints.size(); i++) {
    const auto &joint = joints[i];
    if (joint.power == 0) {
      continue;
    }
    auto *constraint = constraints[i];
    constraint->calculateTransforms();
    const auto torque = action[actionIndex] * joint.power;
    const auto &axisB = constraint->getCalculatedTransformB().getBasis().getColumn(0);
    const auto &axisA = constraint->getCalculatedTransformA().getBasis().getColumn(0);
    constraint->getRigidBodyB().applyTorque(torque * axisB);
    constraint->getRigidBodyA().applyTorque(-torque * axisA);
    actionIndex++;
  }
}

float TwistyEnv::react(const Action &action, float timeStep) {
  auto reward = advanceReward * GoalPhysicsEnv::react(action, timeStep);

  reward += aliveReward;

  if (forwardReward != 0) {
    const auto cosAngleToGoal = observation[0];
    if (cosAngleToGoal > 0) {
      reward += forwardReward;
    }
  }

  float electricityCost = 0;
  int actionIndex = 0;
  for (int i = 0; i < joints.size(); i++) {
    const auto &joint = joints[i];
    if (joint.power == 0) {
      continue;
    }
    auto *constraint = constraints[i];
    constraint->calculateTransforms();
    const auto &axis = constraint->getCalculatedTransformB().getBasis().getColumn(0);
    const auto &angularVelocity = constraint->getRigidBodyB().getAngularVelocity();
    const auto angle = constraint->getAngle(0);
    const auto speed = (axis * angularVelocity).x();
    if ((joint.lowerAngle < joint.upperAngle) &&
        (((angle < 0) && (angle < btRadians(joint.lowerAngle) * jointLimit)) ||
         ((angle > 0) && (angle > btRadians(joint.upperAngle) * jointLimit)))) {
      reward += jointAtLimitCost;
    }
    electricityCost += driveCost * std::abs(action[actionIndex] * speed) +
                       stallTorqueCost * action[actionIndex] * action[actionIndex];
    actionIndex++;
  }
  if (activeJointCount > 0) {
    electricityCost /= activeJointCount;
  }
  reward += electricityCost;

  return reward;
}

void TwistyEnv::parseData(const String &data) {
  if (data.empty()) {
    EXCEPT("Data must be specified");
  }

  String line;
  auto lines = std::istringstream(data);
  while (std::getline(lines, line)) {
    if (line.length() < 2) {
      EXCEPT("Invalid line: '" + line + "'");
    }
    const auto type = line[0];
    std::istringstream stream(line.substr(2));
    switch (type) {
    case 'o':
      stream >> name;
      break;
    case 's':
      timeStep = readValue<float>(stream);
      frameSteps = readValue<int>(stream);
      environmentSteps = readValue<int>(stream);
      gravity = readValue<float>(stream);
      targetDistance = readValue<float>(stream);
      groundFriction = readValue<float>(stream);
      prismFriction = readValue<float>(stream);
      groundRestitution = readValue<float>(stream);
      prismRestitution = readValue<float>(stream);
      break;
    case 'c':
      advanceReward = readValue<float>(stream);
      aliveReward = readValue<float>(stream);
      forwardReward = readValue<float>(stream);
      jointAtLimitCost = readValue<float>(stream);
      driveCost = readValue<float>(stream);
      stallTorqueCost = readValue<float>(stream);
      break;
    case 'l':
      links.push_back({
        readValue<float>(stream), // mass
        readVector(stream), // inertia
        readTransform(stream), // transform
        {} // prisms
      });
      break;
    case 'p':
      if (links.empty()) {
        EXCEPT("No link");
      }
      links.back().prisms.push_back({
        readTransform(stream) // transform
      });
      break;
    case 'j':
      joints.push_back({
        readValue<int>(stream), // base index
        readValue<int>(stream), // target index
        readValue<float>(stream), // lower angle
        readValue<float>(stream), // upper angle
        readValue<float>(stream), // power
        readTransform(stream) // transform
      });
      break;
    case 'b':
      if (baseLinkIndex != -1) {
        EXCEPT("Multiple bases not supported");
      }
      baseLinkIndex = readValue<int>(stream);
      break;
    default:
      EXCEPT("Invalid type: '" + String(1, type) + "'");
    }
  }

  for (const auto &joint : joints) {
    if (joint.power != 0) {
      activeJointCount++;
    }
  }
}

void TwistyEnv::validateData() const {
  if (baseLinkIndex == -1) {
    EXCEPT("No base found");
  }
  if ((baseLinkIndex < 0) || (baseLinkIndex >= links.size())) {
    EXCEPT("Out of range base link index (" + std::to_string(baseLinkIndex) + ")");
  }
  for (int i = 0; i < links.size(); i++) {
    const auto &link = links[i];
    if (link.prisms.empty()) {
      EXCEPT("No prism found for link with index " + std::to_string(i));
    }
  }
  for (int i = 0; i < joints.size(); i++) {
    const auto &joint = joints[i];
    if ((joint.baseIndex < 0) || (joint.baseIndex >= links.size())) {
      EXCEPT("Out of range base index (" +
             std::to_string(joint.baseIndex) +
             ") for joint with index " + std::to_string(i));
    }
    if ((joint.targetIndex < 0) || (joint.targetIndex >= links.size())) {
      EXCEPT("Out of range target index (" +
             std::to_string(joint.targetIndex) +
             ") for joint with index " + std::to_string(i));
    }
  }
}
