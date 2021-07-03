
#ifndef TWISTYENV_H
#define TWISTYENV_H

#include "GoalPhysicsEnv.h"

class TwistyEnv : public GoalPhysicsEnv {
public:
  TwistyEnv(const String &data);

  virtual void reset() override;

  virtual void update() override;

  virtual void applyForces(const Action &action) override;
  virtual float react(const Action &action, float timeStep) override;

  void parseData(const String &data);
  void validateData() const;

  struct Prism {
    btTransform transform;
  };
  struct Link {
    float mass;
    btVector3 inertia;
    btTransform transform;
    std::vector<Prism> prisms;
  };
  struct Joint {
    int baseIndex;
    int targetIndex;
    float lowerAngle;
    float upperAngle;
    float power;
    btTransform transform;
  };

  String name;
  int environmentSteps;
  float gravity;
  float targetDistance;
  float groundFriction;
  float prismFriction;
  float groundRestitution;
  float prismRestitution;
  float advanceReward;
  float aliveReward;
  float forwardReward;
  float jointAtLimitCost;
  float driveCost;
  float stallTorqueCost;
  std::vector<Link> links;
  std::vector<Joint> joints;
  int activeJointCount;
  int baseLinkIndex;

  btCollisionObject *groundObject;
  std::vector<btRigidBody*> bodies;
  std::vector<btGeneric6DofSpring2Constraint*> constraints;
};

#endif // TWISTYENV_H
