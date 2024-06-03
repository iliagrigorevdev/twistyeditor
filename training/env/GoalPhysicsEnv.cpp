
#ifndef GOALPHYSICSENV_CPP
#define GOALPHYSICSENV_CPP

#include "PhysicsEnv.cpp"

namespace goalphysicsenv {

struct GoalInfo {
  float angleToGoal;
  float pitch;
  float roll;
  btVector3 linearVelocity;
  btVector3 angularVelocity;
};

static const float defaultTargetDistance = 30;

class GoalPhysicsEnv : public physicsenv::PhysicsEnv {
public:
  GoalPhysicsEnv()
      : baseBody(nullptr)
      , target(0, 0, 0)
      , aliveDistance(0)
      , targetStartDistance(0)
      , targetReachedDistance(0)
      , prevDistance(0) {
    setTargetDistance(defaultTargetDistance);
  }

  const btRigidBody* getBaseBody() const {
    return baseBody;
  }

  const btVector3& getTarget() const {
    return target;
  }

  void setTargetDistance(float distance) {
    targetStartDistance = distance;
    aliveDistance = 2 * distance;
    targetReachedDistance = 0.1 * distance;
  }

  virtual void reset() override {
    PhysicsEnv::reset();

    baseBody = nullptr;

    resetTarget();
  }

  void resetTarget() {
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

  GoalInfo goalInfo() const {
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

  virtual float react(const Action &action, float timeStep) override {
    auto origin = baseBody->getWorldTransform().getOrigin();
    origin.setY(0); // same as target
    const auto distance = origin.distance(target);
    const auto reward = (prevDistance - distance) / timeStep;
    prevDistance = distance;

    if (distance < targetReachedDistance) {
      resetTarget();
    } else if (distance > aliveDistance) {
      done = true;
    }

    return reward;
  }

protected:
  btRigidBody *baseBody;
  btVector3 target;
  float aliveDistance;
  float targetStartDistance;
  float targetReachedDistance;
  float prevDistance;
};

}

#endif // GOALPHYSICSENV_CPP
