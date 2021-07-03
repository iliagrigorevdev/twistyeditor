
#include "PhysicsEnv.h"

static const float defaultTimeStep = 0.01;
static const int defaultFrameSteps = 4;

PhysicsEnv::PhysicsEnv()
    : timeStep(defaultTimeStep)
    , frameSteps(defaultFrameSteps) {
  collisionConfiguration = new btDefaultCollisionConfiguration();
  dispatcher = new btCollisionDispatcher(collisionConfiguration);
  overlappingPairCache = new btDbvtBroadphase();
  solver = new btSequentialImpulseConstraintSolver();
  dynamicsWorld = new btDiscreteDynamicsWorld(dispatcher, overlappingPairCache,
                                              solver, collisionConfiguration);
}

PhysicsEnv::~PhysicsEnv() {
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

void PhysicsEnv::putShape(const String &name, btCollisionShape *shape) {
  const auto result = shapes.find(name);
  if (result != shapes.end()) {
    EXCEPT("Shape '" + name + "' already exists");
  }
  shapes[name] = shape;
}

btCollisionShape* PhysicsEnv::getShape(const String &name, bool required) const {
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

btCollisionObject* PhysicsEnv::createStatic(const String &shapeName, const btTransform &transform,
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

btCollisionObject* PhysicsEnv::createGround(float friction, float restitution) {
  auto *groundShape = new btStaticPlaneShape({0, 1, 0}, 0);
  putShape("ground", groundShape);
  return createStatic("ground", btTransform::getIdentity(), staticGroup, staticMask, friction, restitution);
}

btRigidBody* PhysicsEnv::createBody(const String &shapeName, const btTransform &transform,
                                    int group, int mask, float mass, float friction, float restitution,
                                    float rollingFriction, float spinningFriction) {
  auto *shape = getShape(shapeName);
  btVector3 inertia;
  shape->calculateLocalInertia(mass, inertia);
  return createBody(shape, transform, group, mask, mass, inertia,
                    friction, restitution, rollingFriction, spinningFriction);
}

btRigidBody* PhysicsEnv::createBody(const String &shapeName, const btTransform &transform,
                                    int group, int mask, float mass, const btVector3 &inertia,
                                    float friction, float restitution,
                                    float rollingFriction, float spinningFriction) {
  auto *shape = getShape(shapeName);
  return createBody(shape, transform, group, mask, mass, inertia,
                    friction, restitution, rollingFriction, spinningFriction);
}

btRigidBody* PhysicsEnv::createBody(btCollisionShape *shape, const btTransform &transform,
                                    int group, int mask, float mass, const btVector3 &inertia,
                                    float friction, float restitution,
                                    float rollingFriction, float spinningFriction) {
  btRigidBody::btRigidBodyConstructionInfo info(mass, nullptr, shape, inertia);
  info.m_startWorldTransform = transform;
  info.m_friction = friction;
  info.m_restitution = restitution;
  info.m_rollingFriction = rollingFriction;
  info.m_spinningFriction = spinningFriction;
  auto *body = new btRigidBody(info);
  body->setActivationState(DISABLE_DEACTIVATION);
  dynamicsWorld->addRigidBody(body, group, mask);
  return body;
}

btGeneric6DofSpring2Constraint*
PhysicsEnv::constrainBody(btRigidBody *body, const btTransform &frame,
                          const btVector3 &lowerLinearLimit, const btVector3 &upperLinearLimit,
                          const btVector3 &lowerAngularLimit, const btVector3 &upperAngularLimit,
                          bool disableCollisionsBetweenLinkedBodies, RotateOrder rotateOrder) {
  auto *constraint = new btGeneric6DofSpring2Constraint(*body, frame, rotateOrder);
  limitConstraint(constraint, lowerLinearLimit, upperLinearLimit, lowerAngularLimit, upperAngularLimit);
  dynamicsWorld->addConstraint(constraint, disableCollisionsBetweenLinkedBodies);
  return constraint;
}

btGeneric6DofSpring2Constraint*
PhysicsEnv::constrainBodies(btRigidBody *body1, btRigidBody *body2,
                            const btTransform &frame1, const btTransform &frame2,
                            const btVector3 &lowerLinearLimit, const btVector3 &upperLinearLimit,
                            const btVector3 &lowerAngularLimit, const btVector3 &upperAngularLimit,
                            bool disableCollisionsBetweenLinkedBodies, RotateOrder rotateOrder) {
  auto *constraint = new btGeneric6DofSpring2Constraint(*body1, *body2, frame1, frame2, rotateOrder);
  limitConstraint(constraint, lowerLinearLimit, upperLinearLimit, lowerAngularLimit, upperAngularLimit);
  dynamicsWorld->addConstraint(constraint, disableCollisionsBetweenLinkedBodies);
  return constraint;
}

void PhysicsEnv::limitConstraint(btGeneric6DofSpring2Constraint *constraint,
                                 const btVector3 &lowerLinearLimit, const btVector3 &upperLinearLimit,
                                 const btVector3 &lowerAngularLimit, const btVector3 &upperAngularLimit) {
  constraint->setLinearLowerLimit(lowerLinearLimit);
  constraint->setLinearUpperLimit(upperLinearLimit);
  constraint->setAngularLowerLimit(lowerAngularLimit);
  constraint->setAngularUpperLimit(upperAngularLimit);
}

void PhysicsEnv::removeObject(btCollisionObject *&object) {
  btRigidBody *body = btRigidBody::upcast(object);
  if ((body != nullptr) && (body->getMotionState() != nullptr)) {
    delete body->getMotionState();
  }
  dynamicsWorld->removeCollisionObject(object);
  delete object;
  object = nullptr;
}

void PhysicsEnv::resetWorld(bool keepStaticObjects) {
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

void PhysicsEnv::reset() {
  Environment::reset();

  resetWorld(true);
}

float PhysicsEnv::act(const Action &action) {
  for (int i = 0; i < frameSteps; i++) {
    applyForces(action);
    dynamicsWorld->stepSimulation(timeStep, 0);
  }
  return react(action, frameSteps * timeStep);
}
