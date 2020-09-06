import Ammo from 'ammo.js';
import { vec3, quat } from 'gl-matrix';
import { createTransform, multiplyTransforms, inverseTransform } from './Transform';
import RigidInfo, { PRISM_COLLISION_VERTICES } from './RigidInfo';
import { PRISM_MARGIN } from './Prism';

const MAX_SUB_STEPS = 10;
const FIXED_TIME_STEP = 0.01;

const GRAVITY = 9.81;

const FRICTION_GROUND = 3.0;
const FRICTION_PRISM = 0.2;
const RESTITUTION_GROUND = 0.1;
const RESTITUTION_PRISM = 0.3;
const GROUP_GROUND = 0x01;
const GROUP_PRISM = 0x02;
const MASK_GROUND = GROUP_PRISM;
const MASK_PRISM = GROUP_GROUND | GROUP_PRISM;

const MAX_MOTOR_TORQUE = 1000;
const MAX_MOTOR_IMPULSE = MAX_MOTOR_TORQUE * FIXED_TIME_STEP;
const MOTOR_SOFTNESS = 0.9;
const MOTOR_BIAS_FACTOR = 0.3;
const MOTOR_RELAXATION_FACTOR = 1;
const MOTOR_DELTA_TIME = 0.5;
const MOTOR_AXIS = vec3.fromValues(0, 0, 1);
const MOTOR_AXIS_ROTATION = quat.setAxisAngle(quat.create(),
    vec3.fromValues(0, 1, 0), -Math.PI / 2);

class Simulation {
  constructor(shape) {
    this.initialized = false;

    const rigidInfo = new RigidInfo(shape);
    this.initializing = Ammo().then((Ammo) => {
      this.init(Ammo, rigidInfo);
      this.addGroundBody(Ammo);
      this.addShapeBody(Ammo, rigidInfo);
      this.initialized = true;
    });
  }

  init(Ammo, rigidInfo) {
    this.shapeParts = [];
    this.shapeBaseParts = [];
    this.shapeActuators = [];
    this.angleScales = [];
    this.prismIds = [];
    this.prismWorldTransforms = [];
    this.prismLocalTransforms = [];
    this.shapePosition = vec3.create();
    this.bodyBtTransform = new Ammo.btTransform();
    this.bodyTransform = createTransform();
    this.actuatorAxis = vec3.create();
    this.zeroBtVector = new Ammo.btVector3(0, 0, 0);

    this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration);
    this.overlappingPairCache = new Ammo.btDbvtBroadphase();
    this.solver = new Ammo.btSequentialImpulseConstraintSolver();
    this.dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(this.dispatcher,
        this.overlappingPairCache, this.solver, this.collisionConfiguration);

    this.dynamicsWorld.setGravity(new Ammo.btVector3(0, -GRAVITY, 0));

    this.prismCollisionShape = new Ammo.btConvexHullShape();
    this.prismCollisionShape.setMargin(PRISM_MARGIN);
    for (const vertex of PRISM_COLLISION_VERTICES) {
      this.prismCollisionShape.addPoint(convertVector(Ammo, vertex), false);
    }
    this.prismCollisionShape.recalcLocalAabb();
  }

  reset() {
    if (!this.initialized) {
      return;
    }

    for (const shapePart of this.shapeParts) {
      shapePart.partBody.setWorldTransform(shapePart.initialTransform);
      shapePart.partBody.getMotionState().setWorldTransform(shapePart.initialTransform);
      shapePart.partBody.setLinearVelocity(this.zeroBtVector);
      shapePart.partBody.setAngularVelocity(this.zeroBtVector);
    }
    this.updateShapePosition();
    this.updatePrismTransforms();
  }

  addRigidBody(Ammo, collisionShape, mass, inertia, transform,
      friction, restitution, group, mask) {
    const motionState = new Ammo.btDefaultMotionState(convertTransform(Ammo, transform));
    const constructionInfo = new Ammo.btRigidBodyConstructionInfo(mass,
        motionState, collisionShape, convertVector(Ammo, inertia));
    constructionInfo.set_m_friction(friction);
    constructionInfo.set_m_restitution(restitution);
    const rigidBody = new Ammo.btRigidBody(constructionInfo);
    rigidBody.setActivationState(4); // disable deactivation
    this.dynamicsWorld.addRigidBody(rigidBody, group, mask);
    return rigidBody;
  }

  addGroundBody(Ammo) {
    const groundShape = new Ammo.btStaticPlaneShape(new Ammo.btVector3(0, 1, 0), 0);

    this.addRigidBody(Ammo, groundShape, 0, vec3.create(), createTransform(),
        FRICTION_GROUND, RESTITUTION_GROUND, GROUP_GROUND, MASK_GROUND);
  }

  findShapePart(shapeParts, links, link) {
    const linkIndex = links.findIndex(l => l === link);
    return shapeParts[linkIndex];
  }

  addShapeBody(Ammo, rigidInfo) {
    const shapeParts = [];
    for (const link of rigidInfo.links) {
      const shapePart = this.addShapePartBody(Ammo, link);
      shapeParts.push(shapePart);
    }

    for (const joint of rigidInfo.joints) {
      this.addActuator(Ammo, shapeParts, rigidInfo.links, joint);
    }

    this.shapeBaseParts.push(...rigidInfo.baseLinks.map(baseLink =>
        this.findShapePart(shapeParts, rigidInfo.links, baseLink)));
  }

  addShapePartBody(Ammo, link) {
    const childTransform = inverseTransform(createTransform(), link.transform);
    const collisionShape = new Ammo.btCompoundShape();
    for (const transform of link.prismTransforms) {
      const prismTransform = multiplyTransforms(createTransform(), childTransform, transform);
      collisionShape.addChildShape(convertTransform(Ammo, prismTransform), this.prismCollisionShape);
    }

    const rigidBody = this.addRigidBody(Ammo, collisionShape, link.mass,
      link.inertia, link.transform, FRICTION_PRISM, RESTITUTION_PRISM,
        GROUP_PRISM, MASK_PRISM);

    for (const prism of link.prisms) {
      const worldTransform = createTransform(vec3.clone(prism.worldPosition),
          quat.clone(prism.worldOrientation));
      const localTransform = multiplyTransforms(createTransform(),
          childTransform, worldTransform);
      this.prismIds.push(prism.id);
      this.prismWorldTransforms.push(worldTransform);
      this.prismLocalTransforms.push(localTransform);
    }

    const shapePart = {
      partBody: rigidBody,
      prismCount: link.prisms.length,
      initialTransform: convertTransform(Ammo, link.transform)
    };
    this.shapeParts.push(shapePart);
    return shapePart;
  }

  addActuator(Ammo, shapeParts, links, joint) {
    const basePartBody = this.findShapePart(shapeParts, links, joint.baseLink).partBody;
    const targetPartBody = this.findShapePart(shapeParts, links, joint.targetLink).partBody;
    const sectionTransform = multiplyTransforms(createTransform(),
        joint.transform, createTransform(vec3.create(), MOTOR_AXIS_ROTATION));
    const frameInA = multiplyTransforms(createTransform(),
        inverseTransform(createTransform(), this.getBodyTransform(basePartBody)), sectionTransform);
    const frameInB = multiplyTransforms(createTransform(),
        inverseTransform(createTransform(), this.getBodyTransform(targetPartBody)), sectionTransform);

    const constraint = new Ammo.btHingeConstraint(basePartBody, targetPartBody,
        convertTransform(Ammo, frameInA), convertTransform(Ammo, frameInB), true);
    constraint.setLimit(joint.lowerAngle, joint.upperAngle, MOTOR_SOFTNESS,
        MOTOR_BIAS_FACTOR, MOTOR_RELAXATION_FACTOR);
    constraint.enableMotor(true);
    constraint.setMaxMotorImpulse(MAX_MOTOR_IMPULSE);
    this.dynamicsWorld.addConstraint(constraint);

    this.shapeActuators.push({
      basePartBody: basePartBody,
      targetPartBody: targetPartBody,
      baseAxis: vec3.transformQuat(vec3.create(), MOTOR_AXIS, frameInA.orientation),
      constraint: constraint,
      lowerAngle: joint.lowerAngle,
      upperAngle: joint.upperAngle
    });
    this.angleScales.push(0);
  }

  addBaseState(shapePart, state) {
    shapePart.partBody.getMotionState().getWorldTransform(this.bodyBtTransform);
    const position = this.bodyBtTransform.getOrigin();
    state.push(position.x());
    state.push(position.y());
    state.push(position.z());
    const orientation = this.bodyBtTransform.getRotation();
    state.push(orientation.x());
    state.push(orientation.y());
    state.push(orientation.z());
    state.push(orientation.w());
    const linearVelocity = shapePart.partBody.getLinearVelocity();
    state.push(linearVelocity.x());
    state.push(linearVelocity.y());
    state.push(linearVelocity.z());
    const angularVelocity = shapePart.partBody.getAngularVelocity();
    state.push(angularVelocity.x());
    state.push(angularVelocity.y());
    state.push(angularVelocity.z());
  }

  addChildState(actuator, state) {
    actuator.basePartBody.getMotionState().getWorldTransform(this.bodyBtTransform);
    const bodyBtOrientation = this.bodyBtTransform.getRotation();
    quat.set(this.bodyTransform.orientation, bodyBtOrientation.x(), bodyBtOrientation.y(),
        bodyBtOrientation.z(), bodyBtOrientation.w());
    const angularVelocity = actuator.targetPartBody.getAngularVelocity();
    vec3.transformQuat(this.actuatorAxis, actuator.baseAxis, this.bodyTransform.orientation);
    state.push(actuator.constraint.getHingeAngle());
    state.push(angularVelocity.x() * this.actuatorAxis[0] + angularVelocity.y() * this.actuatorAxis[1]
        + angularVelocity.z() * this.actuatorAxis[2]);
  }

  getState() {
    if (!this.initialized) {
      return;
    }

    const state = [];
    for (const basePart of this.shapeBaseParts) {
      this.addBaseState(basePart, state);
    }
    for (const actuator of this.shapeActuators) {
      this.addChildState(actuator, state);
    }
    return state;
  }

  getBodyTransform(body) {
    body.getMotionState().getWorldTransform(this.bodyBtTransform);
    const bodyBtPosition = this.bodyBtTransform.getOrigin();
    const bodyBtOrientation = this.bodyBtTransform.getRotation();
    vec3.set(this.bodyTransform.position, bodyBtPosition.x(), bodyBtPosition.y(), bodyBtPosition.z());
    quat.set(this.bodyTransform.orientation, bodyBtOrientation.x(), bodyBtOrientation.y(),
        bodyBtOrientation.z(), bodyBtOrientation.w());
    return this.bodyTransform;
  }

  updateShapePosition() {
    if (!this.initialized || (this.shapeBaseParts.length === 0)) {
      return;
    }

    this.shapeBaseParts[0].partBody.getMotionState().getWorldTransform(this.bodyBtTransform);
    const bodyBtPosition = this.bodyBtTransform.getOrigin();
    this.shapePosition[0] = bodyBtPosition.x();
    this.shapePosition[1] = bodyBtPosition.y();
    this.shapePosition[2] = bodyBtPosition.z();
  }

  updatePrismTransforms() {
    if (!this.initialized) {
      return;
    }

    let prismOffset = 0;
    for (const shapePart of this.shapeParts) {
      const partTransform = this.getBodyTransform(shapePart.partBody);
      for (let i = 0; i < shapePart.prismCount; i++) {
        multiplyTransforms(this.prismWorldTransforms[prismOffset + i], partTransform,
            this.prismLocalTransforms[prismOffset + i]);
      }
      prismOffset += shapePart.prismCount;
    }
  }

  step(deltaTime, syncPrismTransforms = true, maxSubSteps = MAX_SUB_STEPS) {
    if (!this.initialized) {
      return;
    }

    for (let i = 0; i < this.shapeActuators.length; i++) {
      const actuator = this.shapeActuators[i];
      const angleScale = Math.max(-1, Math.min(1, this.angleScales[i]));
      const angleRange = (angleScale < 0 ? -actuator.lowerAngle : actuator.upperAngle);
      const angle = angleScale * angleRange;
      actuator.constraint.setMotorTarget(angle, MOTOR_DELTA_TIME);
    }

    this.dynamicsWorld.stepSimulation(deltaTime, maxSubSteps, FIXED_TIME_STEP);

    this.updateShapePosition();
    if (syncPrismTransforms) {
      this.updatePrismTransforms();
    }
  }

  stepOnce(deltaTime = FIXED_TIME_STEP, syncPrismTransforms = true) {
    this.step(deltaTime, syncPrismTransforms, 0);
  }
}

function convertVector(Ammo, vector) {
  return new Ammo.btVector3(vector[0], vector[1], vector[2]);
}

function convertQuaternion(Ammo, quaternion) {
  return new Ammo.btQuaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
}

function convertTransform(Ammo, transform) {
  return new Ammo.btTransform(convertQuaternion(Ammo, transform.orientation),
      convertVector(Ammo, transform.position));
}

export default Simulation;
