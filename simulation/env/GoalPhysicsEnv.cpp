
#include "GoalPhysicsEnv.h"

static const float aliveDistance = 50;
static const float targetStartDistance = 30;
static const float targetReachedDistance = 5;
static const btVector3 gravity(0, -9.81, 0);
static const float groundFriction = 0.8;

GoalPhysicsEnv::GoalPhysicsEnv()
    : groundObject(nullptr)
    , baseBody(nullptr)
    , target(0, 0, 0)
    , prevDistance(0) {
  dynamicsWorld->setGravity(gravity);

  groundObject = createGround(groundFriction);
}

void GoalPhysicsEnv::reset() {
  PhysicsEnv::reset();

  baseBody = nullptr;

  resetTarget();
}

void GoalPhysicsEnv::resetTarget() {
  std::uniform_real_distribution<float> angleDistribution(0, SIMD_2_PI);
  const auto angle = angleDistribution(getRandomGenerator());
  const btVector3 &startPosition = (baseBody != nullptr
                                    ? baseBody->getWorldTransform().getOrigin()
                                    : btVector3(0, 0, 0));
  target.setX(startPosition.x() + targetStartDistance * std::cos(angle));
  target.setY(0);
  target.setZ(startPosition.z() + targetStartDistance * std::sin(angle));
  prevDistance = targetStartDistance;
}

GoalPhysicsEnv::GoalInfo GoalPhysicsEnv::goalInfo() const {
  const auto &position = baseBody->getWorldTransform().getOrigin();
  const auto &basis = baseBody->getWorldTransform().getBasis();
  const auto &axisX = basis[0];
  const auto &axisY = basis[1];
  const auto &axisZ = basis[2];
  const auto yaw = std::atan2(axisZ.x(), axisX.x());
  const auto pitch = std::atan2(-axisY.x(), std::sqrt(axisY.y() * axisY.y() + axisY.z() * axisY.z()));
  const auto roll = std::atan2(axisY.z(), axisY.y());
  const auto goalAngle = std::atan2(target.z() - position.z(), target.x() - position.x());
  const auto angleToGoal = goalAngle - yaw;
  const auto cosYaw = std::cos(yaw);
  const auto sinYaw = std::sin(yaw);
  const btMatrix3x3 invYawRotation(cosYaw, 0, sinYaw, 0, 1, 0, -sinYaw, 0, cosYaw);
  const auto linearVelocity = invYawRotation * baseBody->getLinearVelocity();
  const auto angularVelocity = invYawRotation * baseBody->getAngularVelocity();
  return {angleToGoal, pitch, roll, linearVelocity, angularVelocity};
}

float GoalPhysicsEnv::react(const Action &action, float timeStep) {
  const auto distance = baseBody->getWorldTransform().getOrigin().distance(target);
  const auto reward = (prevDistance - distance) / timeStep;
  prevDistance = distance;

  if (distance < targetReachedDistance) {
    resetTarget();
  } else if (distance > aliveDistance) {
    done = true;
  }

  return reward;
}
