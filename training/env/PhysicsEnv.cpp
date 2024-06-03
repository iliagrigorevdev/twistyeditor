
#ifndef PHYSICSENV_CPP
#define PHYSICSENV_CPP

#include "Environment.cpp"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Weverything"
#include "btBulletDynamicsCommon.h"
#pragma clang diagnostic pop

namespace physicsenv {

static const float defaultTimeStep = 0.01;
static const int defaultFrameSteps = 4;

static const int staticGroup = 1;
static const int dynamicGroup = 2;
static const int staticMask = -1 ^ staticGroup;
static const int dynamicMask = -1;

class PhysicsEnv : public Environment {
public:
  PhysicsEnv()
      : timeStep(defaultTimeStep)
      , frameSteps(defaultFrameSteps) {
    collisionConfiguration = new btDefaultCollisionConfiguration();
    dispatcher = new btCollisionDispatcher(collisionConfiguration);
    overlappingPairCache = new btDbvtBroadphase();
    solver = new btSequentialImpulseConstraintSolver();
    dynamicsWorld = new btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
  }

  PhysicsEnv(const PhysicsEnv &env) = delete;

  virtual ~PhysicsEnv() {
    resetWorld(false);

    for (const auto &shapeEntry : shapes) {
      delete shapeEntry.second;
    }

    delete dynamicsWorld;
    delete solver;
    delete overlappingPairCache;
    delete dispatcher;
    delete collisionConfiguration;
  }

  const Map<String, btCollisionShape*>& getShapes() const {
    return shapes;
  }

  btDiscreteDynamicsWorld* getDynamicsWorld() const {
    return dynamicsWorld;
  }

  void putShape(const String &name, btCollisionShape *shape) {
    const auto result = shapes.find(name);
    if (result != shapes.end()) {
      EXCEPT("Shape '" + name + "' already exists");
    }
    shapes[name] = shape;
  }

  btCollisionShape* getShape(const String &name, bool required = true) const {
    const auto result = shapes.find(name);
    if (result == shapes.end()) {
      if (required) {
        EXCEPT("Shape '" + name + "' not found");
      } else {
        return nullptr;
      }
    }
    return result->second;
  }

  btCollisionObject* createStatic(const String &shapeName, const btTransform &transform,
      int group, int mask, float friction, float restitution) {
    auto *shape = getShape(shapeName);
    btRigidBody::btRigidBodyConstructionInfo info(0, nullptr, shape);
    info.m_startWorldTransform = transform;
    info.m_friction = friction;
    info.m_restitution = restitution;
    auto *body = new btRigidBody(info);
    dynamicsWorld->addRigidBody(body, group, mask);
    return body;
  }

  btCollisionObject* createGround(float friction, float restitution) {
    auto *groundShape = new btStaticPlaneShape({0, 1, 0}, 0);
    putShape("ground", groundShape);
    return createStatic("ground", btTransform::getIdentity(), staticGroup, staticMask, friction, restitution);
  }

  btRigidBody* createBody(const String &shapeName, const btTransform &transform,
      int group, int mask, float mass, float friction, float restitution) {
    auto *shape = getShape(shapeName);
    btVector3 inertia;
    shape->calculateLocalInertia(mass, inertia);
    return createBody(shape, transform, group, mask, mass, inertia, friction, restitution);
  }

  btRigidBody* createBody(const String &shapeName, const btTransform &transform,
      int group, int mask, float mass, const btVector3 &inertia,
      float friction, float restitution) {
    auto *shape = getShape(shapeName);
    return createBody(shape, transform, group, mask, mass, inertia, friction, restitution);
  }

  btRigidBody* createBody(btCollisionShape *shape, const btTransform &transform,
      int group, int mask, float mass, const btVector3 &inertia,
      float friction, float restitution) {
    btRigidBody::btRigidBodyConstructionInfo info(mass, nullptr, shape, inertia);
    info.m_startWorldTransform = transform;
    info.m_friction = friction;
    info.m_restitution = restitution;
    auto *body = new btRigidBody(info);
    body->setActivationState(DISABLE_DEACTIVATION);
    dynamicsWorld->addRigidBody(body, group, mask);
    return body;
  }

  btGeneric6DofSpring2Constraint* constrainBody(btRigidBody *body, const btTransform &frame,
      const btVector3 &lowerLinearLimit, const btVector3 &upperLinearLimit,
      const btVector3 &lowerAngularLimit, const btVector3 &upperAngularLimit,
      bool disableCollisionsBetweenLinkedBodies = false, RotateOrder rotateOrder = RO_XYZ) {
    auto *constraint = new btGeneric6DofSpring2Constraint(*body, frame, rotateOrder);
    limitConstraint(constraint, lowerLinearLimit, upperLinearLimit, lowerAngularLimit, upperAngularLimit);
    dynamicsWorld->addConstraint(constraint, disableCollisionsBetweenLinkedBodies);
    return constraint;
  }

  btGeneric6DofSpring2Constraint* constrainBodies(btRigidBody *body1, btRigidBody *body2,
      const btTransform &frame1, const btTransform &frame2,
      const btVector3 &lowerLinearLimit, const btVector3 &upperLinearLimit,
      const btVector3 &lowerAngularLimit, const btVector3 &upperAngularLimit,
      bool disableCollisionsBetweenLinkedBodies = false, RotateOrder rotateOrder = RO_XYZ) {
    auto *constraint = new btGeneric6DofSpring2Constraint(*body1, *body2, frame1, frame2, rotateOrder);
    limitConstraint(constraint, lowerLinearLimit, upperLinearLimit, lowerAngularLimit, upperAngularLimit);
    dynamicsWorld->addConstraint(constraint, disableCollisionsBetweenLinkedBodies);
    return constraint;
  }

  void limitConstraint(btGeneric6DofSpring2Constraint *constraint,
      const btVector3 &lowerLinearLimit, const btVector3 &upperLinearLimit,
      const btVector3 &lowerAngularLimit, const btVector3 &upperAngularLimit) {
    constraint->setLinearLowerLimit(lowerLinearLimit);
    constraint->setLinearUpperLimit(upperLinearLimit);
    constraint->setAngularLowerLimit(lowerAngularLimit);
    constraint->setAngularUpperLimit(upperAngularLimit);
  }

  void removeObject(btCollisionObject *&object) {
    btRigidBody *body = btRigidBody::upcast(object);
    if ((body != nullptr) && (body->getMotionState() != nullptr)) {
      delete body->getMotionState();
    }
    dynamicsWorld->removeCollisionObject(object);
    delete object;
    object = nullptr;
  }

  void resetWorld(bool keepStaticObjects) {
    for (int i = dynamicsWorld->getNumConstraints() - 1; i >= 0; i--) {
      btTypedConstraint *constraint = dynamicsWorld->getConstraint(i);
      dynamicsWorld->removeConstraint(constraint);
      delete constraint;
    }

    for (int i = dynamicsWorld->getNumCollisionObjects() - 1; i >= 0; i--) {
      btCollisionObject *object = dynamicsWorld->getCollisionObjectArray()[i];
      if (keepStaticObjects && object->isStaticObject()) {
        continue;
      }
      removeObject(object);
    }
  }

  virtual void reset() override {
    Environment::reset();

    resetWorld(true);
  }

  virtual float act(const Action &action) override {
    for (int i = 0; i < frameSteps; i++) {
      applyForces(action);
      dynamicsWorld->stepSimulation(timeStep, 0);
    }
    return react(action, frameSteps * timeStep);
  }

  virtual void applyForces(const Action &action) = 0;

  virtual float react(const Action &action, float timeStep) = 0;

protected:
  btDefaultCollisionConfiguration *collisionConfiguration;
  btCollisionDispatcher *dispatcher;
  btBroadphaseInterface *overlappingPairCache;
  btSequentialImpulseConstraintSolver *solver;
  btDiscreteDynamicsWorld *dynamicsWorld;

  Map<String, btCollisionShape*> shapes;

  float timeStep;
  int frameSteps;
};

}

#endif // PHYSICSENV_CPP
