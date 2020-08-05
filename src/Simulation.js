import Ammo from 'ammo.js';
import { vec3, quat, mat3 } from 'gl-matrix';
import { createTransform, multiplyTransforms, inverseTransform } from './Transform';
import { PRISM_HEIGHT, PRISM_BASE, PRISM_SIDE } from './Prism';

const RADIANS_TO_DEGREES = 180 / Math.PI;

const MAX_SUB_STEPS = 10;
const FIXED_TIME_STEP = 1 / 60;

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

const FRICTION_GROUND = 0.5;
const FRICTION_PRISM = 0.5;
const RESTITUTION_GROUND = 0.5;
const RESTITUTION_PRISM = 0.5;
const GROUP_GROUND = 0x01;
const GROUP_PRISM = 0x02;
const MASK_GROUND = GROUP_PRISM;
const MASK_PRISM = GROUP_GROUND | GROUP_PRISM;

class Simulation {
  constructor(shape) {
    this.shape = shape;

    Ammo().then((Ammo) => {
      this.init(Ammo);

      this.addGroundBody(Ammo);
      this.addShapeBody(Ammo, shape);
    });
  }

  init(Ammo) {
    this.shapeBtTransform = new Ammo.btTransform();
    this.shapeTransform = createTransform();

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
    if (shape.prisms.length === 0) {
      return;
    }

    const transforms = [];
    const shapeOrigin = vec3.create();
    for (const prism of shape.prisms) {
      const transform = multiplyTransforms(createTransform(),
          createTransform(prism.worldPosition, prism.worldOrientation),
          this.prismMassOffsetInversed);
      vec3.add(shapeOrigin, shapeOrigin, transform.position);
      transforms.push(transform);
    }
    vec3.scale(shapeOrigin, shapeOrigin, 1 / shape.prisms.length);

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
      const px = prismOrigin[0] - shapeOrigin[0];
      const py = prismOrigin[1] - shapeOrigin[1];
      const pz = prismOrigin[2] - shapeOrigin[2];
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
    const shapeTransform = createTransform(shapeOrigin, principalRotation);
    const inertia = vec3.fromValues(tensor[0], tensor[4], tensor[8]);

    const childTransform = inverseTransform(createTransform(), shapeTransform);
    const collisionShape = new Ammo.btCompoundShape();
    for (const transform of transforms) {
      const prismTransform = multiplyTransforms(createTransform(), childTransform, transform);
      collisionShape.addChildShape(convertTransform(Ammo, prismTransform), this.prismCollisionShape);
    }

    const mass = shape.prisms.length * PRISM_MASS;
    const rigidBody = this.addRigidBody(Ammo, collisionShape, mass,
        inertia, shapeTransform, FRICTION_PRISM, RESTITUTION_PRISM,
        GROUP_PRISM, MASK_PRISM);

    this.shapeBody = rigidBody;
    this.prismWorldTransforms = [];
    this.prismLocalTransforms = [];
    for (const prism of shape.prisms) {
      const worldTransform = createTransform(vec3.clone(prism.worldPosition),
          quat.clone(prism.worldOrientation));
      const localTransform = multiplyTransforms(createTransform(),
          childTransform, worldTransform);
      this.prismWorldTransforms.push(worldTransform);
      this.prismLocalTransforms.push(localTransform);
    }

    console.log("Mass: " + mass);
    console.log("Origin: {" + shapeOrigin[0].toFixed(2) + ", " + shapeOrigin[1].toFixed(2)
        + ", " + shapeOrigin[2].toFixed(2) + "}");
    console.log("Inertia: {" + inertia[0].toFixed(2) + ", " + inertia[1].toFixed(2)
        + ", " + inertia[2].toFixed(2) + "}");
    const principalAxis = vec3.create();
    const principalAngle = quat.getAxisAngle(principalAxis, principalRotation);
    console.log("Principal: axis={" + principalAxis[0].toFixed(2) + ", "
        + principalAxis[1].toFixed(2) + ", " + principalAxis[2].toFixed(2)
        + "} angle=" + (principalAngle * RADIANS_TO_DEGREES).toFixed(0));
  }

  updatePrismTransforms() {
    if (!this.shapeBody) {
      return;
    }

    this.shapeBody.getMotionState().getWorldTransform(this.shapeBtTransform);
    const shapePosition = this.shapeBtTransform.getOrigin();
    const shapeOrientation = this.shapeBtTransform.getRotation();
    vec3.set(this.shapeTransform.position, shapePosition.x(), shapePosition.y(), shapePosition.z());
    quat.set(this.shapeTransform.orientation, shapeOrientation.x(), shapeOrientation.y(),
        shapeOrientation.z(), shapeOrientation.w());

    for (let i = 0; i < this.prismLocalTransforms.length; i++) {
      multiplyTransforms(this.prismWorldTransforms[i], this.shapeTransform,
          this.prismLocalTransforms[i]);
    }
  }

  step(deltaTime) {
    if (!this.dynamicsWorld) {
      return;
    }

    this.dynamicsWorld.stepSimulation(deltaTime, MAX_SUB_STEPS, FIXED_TIME_STEP);

    this.updatePrismTransforms();
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
