
#ifndef PHYSICSENV_H
#define PHYSICSENV_H

#include "Environment.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Weverything"
#include "btBulletDynamicsCommon.h"
#pragma clang diagnostic pop

class PhysicsEnv : public Environment {
public:
  PhysicsEnv();
  PhysicsEnv(const PhysicsEnv &env) = delete;
  virtual ~PhysicsEnv();

  void putShape(const String &name, btCollisionShape *shape);
  btCollisionShape* getShape(const String &name, bool required = true) const;

  btCollisionObject* createStatic(const String &shapeName, const btTransform &transform,
                                  int group, int mask, float friction);

  btCollisionObject* createGround(float friction);

  btRigidBody* createBody(const String &shapeName, const btTransform &transform,
                          int group, int mask, float mass, float friction,
                          float rollingFriction = 0, float spinningFriction = 0);
  btRigidBody* createBody(const String &shapeName, const btTransform &transform,
                          int group, int mask, float mass, const btVector3 &inertia,
                          float friction, float rollingFriction = 0, float spinningFriction = 0);
  btRigidBody* createBody(btCollisionShape *shape, const btTransform &transform,
                          int group, int mask, float mass, const btVector3 &inertia,
                          float friction, float rollingFriction = 0, float spinningFriction = 0);

  btGeneric6DofSpring2Constraint*
  constrainBody(btRigidBody *body, const btTransform &frame,
                const btVector3 &lowerLinearLimit, const btVector3 &upperLinearLimit,
                const btVector3 &lowerAngularLimit, const btVector3 &upperAngularLimit,
                bool disableCollisionsBetweenLinkedBodies = false,
                RotateOrder rotateOrder = RO_XYZ);
  btGeneric6DofSpring2Constraint*
  constrainBodies(btRigidBody *body1, btRigidBody *body2,
                  const btTransform &frame1, const btTransform &frame2,
                  const btVector3 &lowerLinearLimit, const btVector3 &upperLinearLimit,
                  const btVector3 &lowerAngularLimit, const btVector3 &upperAngularLimit,
                  bool disableCollisionsBetweenLinkedBodies = false,
                  RotateOrder rotateOrder = RO_XYZ);
  void limitConstraint(btGeneric6DofSpring2Constraint *constraint,
                       const btVector3 &lowerLinearLimit, const btVector3 &upperLinearLimit,
                       const btVector3 &lowerAngularLimit, const btVector3 &upperAngularLimit);

  void removeObject(btCollisionObject *&object);

  void resetWorld(bool keepStaticObjects);

  virtual void reset() override;

  virtual float act(const Action &action) override;
  virtual void applyForces(const Action &action) = 0;
  virtual float react(const Action &action, float timeStep) = 0;

  static const int staticGroup = 1;
  static const int dynamicGroup = 2;
  static const int staticMask = -1 ^ staticGroup;
  static const int dynamicMask = -1;

  btDefaultCollisionConfiguration *collisionConfiguration;
  btCollisionDispatcher *dispatcher;
  btBroadphaseInterface *overlappingPairCache;
  btSequentialImpulseConstraintSolver *solver;
  btDiscreteDynamicsWorld *dynamicsWorld;

  Map<String, btCollisionShape*> shapes;
};

#endif // PHYSICSENV_H
