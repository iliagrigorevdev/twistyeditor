import Ammo from 'ammo.js';
import { vec3, quat, mat3 } from 'gl-matrix';
import { createTransform, multiplyTransforms, inverseTransform } from './Transform';
import { PRISM_HEIGHT, PRISM_BASE, PRISM_SIDE } from './Prism';
import { SectionType } from './Section';

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

const MAX_SUB_STEPS = 10;
const FIXED_TIME_STEP = 0.01;

const GRAVITY = 9.81;

const PRISM_HALF_HEIGHT = 0.5 * PRISM_HEIGHT;
const PRISM_HALF_BASE = 0.5 * PRISM_BASE;
const PRISM_HALF_SIDE = 0.5 * PRISM_SIDE;

const PRISM_CG_H = 1 / 3 * PRISM_HEIGHT;
const PRISM_CG_DY = PRISM_HALF_HEIGHT - PRISM_CG_H;
const PRISM_MARGIN = 0.04;
const PRISM_MARGIN_DIAG = PRISM_MARGIN * Math.cos(Math.PI / 4);

const PRISM_COLLISION_VERTICES = [
  vec3.fromValues(-PRISM_HALF_BASE + 2 * PRISM_MARGIN_DIAG + PRISM_MARGIN,
      -PRISM_HALF_HEIGHT + PRISM_CG_DY + PRISM_MARGIN, -PRISM_HALF_SIDE + PRISM_MARGIN),
  vec3.fromValues(-PRISM_HALF_BASE + 2 * PRISM_MARGIN_DIAG + PRISM_MARGIN,
      -PRISM_HALF_HEIGHT + PRISM_CG_DY + PRISM_MARGIN, PRISM_HALF_SIDE - PRISM_MARGIN),
  vec3.fromValues(0, PRISM_HALF_HEIGHT + PRISM_CG_DY - 2 * PRISM_MARGIN_DIAG,
      -PRISM_HALF_SIDE + PRISM_MARGIN),
  vec3.fromValues(0, PRISM_HALF_HEIGHT + PRISM_CG_DY - 2 * PRISM_MARGIN_DIAG,
      PRISM_HALF_SIDE - PRISM_MARGIN),
  vec3.fromValues(PRISM_HALF_BASE - 2 * PRISM_MARGIN_DIAG - PRISM_MARGIN,
      -PRISM_HALF_HEIGHT + PRISM_CG_DY + PRISM_MARGIN, -PRISM_HALF_SIDE + PRISM_MARGIN),
  vec3.fromValues(PRISM_HALF_BASE - 2 * PRISM_MARGIN_DIAG - PRISM_MARGIN,
      -PRISM_HALF_HEIGHT + PRISM_CG_DY + PRISM_MARGIN, PRISM_HALF_SIDE - PRISM_MARGIN)
];

const PRISM_VOLUME = 0.5 * PRISM_BASE * PRISM_HEIGHT * PRISM_SIDE;
const PRISM_DENSITY = 1 / Math.sqrt(2);
const PRISM_MASS = PRISM_VOLUME * PRISM_DENSITY;
const PRISM_INERTIA_FACTOR = PRISM_MASS * PRISM_HEIGHT * PRISM_HEIGHT;
const PRISM_INERTIA_X = 2 / 9 * PRISM_INERTIA_FACTOR;
const PRISM_INERTIA_Y = 1 / 3 * PRISM_INERTIA_FACTOR;
const PRISM_INERTIA_Z = 2 / 9 * PRISM_INERTIA_FACTOR;

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
const MOTOR_AXIS_ROTATION = quat.setAxisAngle(quat.create(),
    vec3.fromValues(0, 1, 0), -Math.PI / 2);

const PART_STATE_LENGTH = 3 + 4 + 3 + 3;

class Simulation {
  constructor(shape) {
    this.initialized = false;

    Ammo().then((Ammo) => {
      this.init(Ammo);

      this.addGroundBody(Ammo);
      this.addShapeBody(Ammo, shape);

      this.initialized = true;
    });
  }

  init(Ammo) {
    this.shapeBasePart = null;
    this.shapeParts = [];
    this.shapeActuators = [];
    this.motorAngles = [];
    this.prismIds = [];
    this.prismWorldTransforms = [];
    this.prismLocalTransforms = [];
    this.shapePosition = vec3.create();
    this.bodyBtTransform = new Ammo.btTransform();
    this.bodyTransform = createTransform();
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

    const prismMassOffset = createTransform(vec3.fromValues(0, PRISM_CG_DY, 0));
    this.prismMassOffsetInversed = inverseTransform(createTransform(), prismMassOffset);
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

  addShapeBody(Ammo, shape) {
    const parts = shape.discoverParts();
    const basePart = shape.determineBasePart(parts);
    for (let i = 0; i < parts.length; i++) {
      console.log("Part " + (i + 1) + "/" + parts.length + ":");
      const part = parts[i];
      const shapePart = this.addShapePartBody(Ammo, part);
      if (part === basePart) {
        this.shapeBasePart = shapePart;
      }
    }

    for (const section of shape.sections) {
      if (section.type === SectionType.ACTUATOR) {
        this.addActuator(Ammo, shape, parts, section);
      }
    }
  }

  addShapePartBody(Ammo, part) {
    if (part.length === 0) {
      return;
    }

    const transforms = [];
    const partOrigin = vec3.create();
    for (const prism of part) {
      const transform = multiplyTransforms(createTransform(),
          createTransform(prism.worldPosition, prism.worldOrientation),
          this.prismMassOffsetInversed);
      vec3.add(partOrigin, partOrigin, transform.position);
      transforms.push(transform);
    }
    vec3.scale(partOrigin, partOrigin, 1 / part.length);

    const tensor = mat3.fromValues(0, 0, 0, 0, 0, 0, 0, 0, 0);
    const mat1 = mat3.create();
    const mat2 = mat3.create();
    for (const transform of transforms) {
      const basis = mat3.fromQuat(mat1, transform.orientation);
      const j = mat3.set(mat2,
        basis[0] * PRISM_INERTIA_X, basis[3] * PRISM_INERTIA_Y, basis[6] * PRISM_INERTIA_Z,
        basis[1] * PRISM_INERTIA_X, basis[4] * PRISM_INERTIA_Y, basis[7] * PRISM_INERTIA_Z,
        basis[2] * PRISM_INERTIA_X, basis[5] * PRISM_INERTIA_Y, basis[8] * PRISM_INERTIA_Z
      );
      mat3.mul(j, basis, j);
      mat3.add(tensor, tensor, j);

      const prismOrigin = transform.position;
      const px = prismOrigin[0] - partOrigin[0];
      const py = prismOrigin[1] - partOrigin[1];
      const pz = prismOrigin[2] - partOrigin[2];
      const squaredDistance = px * px + py * py + pz * pz;
      mat3.set(j,
        squaredDistance - px * px, -px * py, -px * pz,
        -py * px, squaredDistance - py * py, -py * pz,
        -pz * px, -pz * py, squaredDistance - pz * pz
      );
      mat3.multiplyScalar(j, j, PRISM_MASS);
      mat3.add(tensor, tensor, j);
    }
    const principalRotation = quat.fromMat3(quat.create(),
        diagonalizeMatrix(tensor, 1e-5, 20));
    const partTransform = createTransform(partOrigin, principalRotation);
    const inertia = vec3.fromValues(tensor[0], tensor[4], tensor[8]);

    const childTransform = inverseTransform(createTransform(), partTransform);
    const collisionShape = new Ammo.btCompoundShape();
    for (const transform of transforms) {
      const prismTransform = multiplyTransforms(createTransform(), childTransform, transform);
      collisionShape.addChildShape(convertTransform(Ammo, prismTransform), this.prismCollisionShape);
    }

    const mass = part.length * PRISM_MASS;
    const rigidBody = this.addRigidBody(Ammo, collisionShape, mass,
        inertia, partTransform, FRICTION_PRISM, RESTITUTION_PRISM,
        GROUP_PRISM, MASK_PRISM);

    for (const prism of part) {
      const worldTransform = createTransform(vec3.clone(prism.worldPosition),
          quat.clone(prism.worldOrientation));
      const localTransform = multiplyTransforms(createTransform(),
          childTransform, worldTransform);
      this.prismIds.push(prism.id);
      this.prismWorldTransforms.push(worldTransform);
      this.prismLocalTransforms.push(localTransform);
    }

    console.log("Mass: " + mass);
    console.log("Origin: {" + partOrigin[0].toFixed(2) + ", " + partOrigin[1].toFixed(2)
        + ", " + partOrigin[2].toFixed(2) + "}");
    console.log("Inertia: {" + inertia[0].toFixed(2) + ", " + inertia[1].toFixed(2)
        + ", " + inertia[2].toFixed(2) + "}");
    const principalAxis = vec3.create();
    const principalAngle = quat.getAxisAngle(principalAxis, principalRotation);
    console.log("Principal: axis={" + principalAxis[0].toFixed(2) + ", "
        + principalAxis[1].toFixed(2) + ", " + principalAxis[2].toFixed(2)
        + "} angle=" + (principalAngle * RADIANS_TO_DEGREES).toFixed(0));

    const shapePart = {
      partBody: rigidBody,
      prismCount: part.length,
      initialTransform: convertTransform(Ammo, partTransform)
    };
    this.shapeParts.push(shapePart);
    return shapePart;
  }

  addActuator(Ammo, shape, parts, section) {
    const basePrism = shape.findPlaceable(section.basePrismId);
    const targetPrism = shape.findPlaceable(section.targetPrismId);
    const basePartIndex = parts.findIndex(part => part.some(prism => prism === basePrism));
    const targetPartIndex = parts.findIndex(part => part.some(prism => prism === targetPrism));
    if (basePartIndex === -1) {
      console.log("Base part not found");
      return;
    }
    if (targetPartIndex === -1) {
      console.log("Target part not found");
      return;
    }
    if (basePartIndex === targetPartIndex) {
      console.log("Actuator must connect different parts");
      return;
    }

    const basePartBody = this.shapeParts[basePartIndex].partBody;
    const targetPartBody = this.shapeParts[targetPartIndex].partBody;
    const sectionOrientation = quat.mul(quat.create(), section.worldOrientation, MOTOR_AXIS_ROTATION);
    const sectionTransform = createTransform(section.worldPosition, sectionOrientation);
    const frameInA = multiplyTransforms(createTransform(),
        inverseTransform(createTransform(), this.getBodyTransform(basePartBody)), sectionTransform);
    const frameInB = multiplyTransforms(createTransform(),
        inverseTransform(createTransform(), this.getBodyTransform(targetPartBody)), sectionTransform);

    const constraint = new Ammo.btHingeConstraint(basePartBody, targetPartBody,
        convertTransform(Ammo, frameInA), convertTransform(Ammo, frameInB), true);
    const lowerAngle = section.getPropertyValue("lowerAngle") * DEGREES_TO_RADIANS;
    const upperAngle = section.getPropertyValue("upperAngle") * DEGREES_TO_RADIANS;
    constraint.setLimit(lowerAngle, upperAngle, MOTOR_SOFTNESS,
        MOTOR_BIAS_FACTOR, MOTOR_RELAXATION_FACTOR);
    constraint.enableMotor(true);
    constraint.setMaxMotorImpulse(MAX_MOTOR_IMPULSE);
    this.dynamicsWorld.addConstraint(constraint);

    this.shapeActuators.push({
      constraint: constraint,
      lowerAngle: lowerAngle,
      upperAngle: upperAngle
    });
    this.motorAngles.push(0);
  }

  getState() {
    if (!this.initialized) {
      return;
    }

    const state = new Array(this.shapeParts.length * PART_STATE_LENGTH);
    let offset = 0;
    for (const shapePart of this.shapeParts) {
      shapePart.partBody.getMotionState().getWorldTransform(this.bodyBtTransform);
      const position = this.bodyBtTransform.getOrigin();
      state[offset++] = position.x();
      state[offset++] = position.y();
      state[offset++] = position.z();
      const orientation = this.bodyBtTransform.getRotation();
      state[offset++] = orientation.x();
      state[offset++] = orientation.y();
      state[offset++] = orientation.z();
      state[offset++] = orientation.w();
      const linearVelocity = shapePart.partBody.getLinearVelocity();
      state[offset++] = linearVelocity.x();
      state[offset++] = linearVelocity.y();
      state[offset++] = linearVelocity.z();
      const angularVelocity = shapePart.partBody.getAngularVelocity();
      state[offset++] = angularVelocity.x();
      state[offset++] = angularVelocity.y();
      state[offset++] = angularVelocity.z();
    }
    return state;
  }

  getBodyTransform(body) {
    body.getMotionState().getWorldTransform(this.bodyBtTransform);
    const bodyPosition = this.bodyBtTransform.getOrigin();
    const bodyOrientation = this.bodyBtTransform.getRotation();
    vec3.set(this.bodyTransform.position, bodyPosition.x(), bodyPosition.y(), bodyPosition.z());
    quat.set(this.bodyTransform.orientation, bodyOrientation.x(), bodyOrientation.y(),
        bodyOrientation.z(), bodyOrientation.w());
    return this.bodyTransform;
  }

  updateShapePosition() {
    if (!this.shapeBasePart) {
      return;
    }

    this.shapeBasePart.partBody.getMotionState().getWorldTransform(this.bodyBtTransform);
    const bodyPosition = this.bodyBtTransform.getOrigin();
    this.shapePosition[0] = bodyPosition.x();
    this.shapePosition[1] = bodyPosition.y();
    this.shapePosition[2] = bodyPosition.z();
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
      const angle = Math.max(actuator.lowerAngle, Math.min(actuator.upperAngle,
          this.motorAngles[i]));
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

function diagonalizeMatrix(mat, threshold, maxSteps) {
  const rot = mat3.create();
  for (let step = maxSteps; step > 0; step--) {
    let p = 0;
    let q = 1;
    let r = 2;
    let max = Math.abs(mat[3]);
    let v = Math.abs(mat[6]);
    if (v > max) {
      q = 2;
      r = 1;
      max = v;
    }
    v = Math.abs(mat[7]);
    if (v > max) {
      p = 1;
      q = 2;
      r = 0;
      max = v;
    }

    let t = threshold * (Math.abs(mat[0]) + Math.abs(mat[4]) + Math.abs(mat[8]));
    if (max <= t) {
      return rot;
    }

    const mpq = mat[p + q * 3];
    const theta = (mat[q + q * 3] - mat[p + p * 3]) / (2 * mpq);
    const theta2 = theta * theta;
    let cos;
    let sin;
    t = (theta >= 0)
        ? 1 / (theta + Math.sqrt(1 + theta2))
        : 1 / (theta - Math.sqrt(1 + theta2));
    cos = 1 / Math.sqrt(1 + t * t);
    sin = cos * t;

    mat[p + q * 3] = 0;
    mat[q + p * 3] = 0;
    mat[p + p * 3] -= t * mpq;
    mat[q + q * 3] += t * mpq;
    let mrp = mat[r + p * 3];
    let mrq = mat[r + q * 3];
    mat[r + p * 3] = mat[p + r * 3] = cos * mrp - sin * mrq;
    mat[r + q * 3] = mat[q + r * 3] = cos * mrq + sin * mrp;

    for (let i = 0; i < 3; i++) {
      mrp = rot[i + p * 3];
      mrq = rot[i + q * 3];
      rot[i + p * 3] = cos * mrp - sin * mrq;
      rot[i + q * 3] = cos * mrq + sin * mrp;
    }
  }
  return rot;
}

export default Simulation;
