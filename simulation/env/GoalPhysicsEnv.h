
#ifndef GOALPHYSICSENV_H
#define GOALPHYSICSENV_H

#include "PhysicsEnv.h"

class GoalPhysicsEnv : public PhysicsEnv {
public:
  struct GoalInfo {
    float angleToGoal;
    float pitch;
    float roll;
    btVector3 linearVelocity;
    btVector3 angularVelocity;
  };

  GoalPhysicsEnv();

  virtual void reset() override;

  void resetTarget();

  GoalInfo goalInfo() const;

  virtual float react(const Action &action, float timeStep) override;

  btCollisionObject *groundObject;
  btRigidBody *baseBody;
  btVector3 target;
  float prevDistance;
};

#endif // GOALPHYSICSENV_H
