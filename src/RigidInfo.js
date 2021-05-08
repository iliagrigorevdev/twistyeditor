import { vec3, quat, mat3 } from 'gl-matrix';
import { createTransform, multiplyTransforms, inverseTransform } from './Transform';
import { PRISM_HEIGHT, PRISM_BASE, PRISM_SIDE, PRISM_MARGIN } from './Prism';
import { SectionType } from './Section';
import { diagonalizeMatrix } from './VecMath';

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

const PRISM_HALF_HEIGHT = 0.5 * PRISM_HEIGHT;
const PRISM_HALF_BASE = 0.5 * PRISM_BASE;
const PRISM_HALF_SIDE = 0.5 * PRISM_SIDE;
const PRISM_MARGIN_DIAG = PRISM_MARGIN * Math.cos(Math.PI / 4);

const PRISM_CG_H = 1 / 3 * PRISM_HEIGHT;
const PRISM_CG_DY = PRISM_HALF_HEIGHT - PRISM_CG_H;
const PRISM_MASS_OFFSET = createTransform(vec3.fromValues(0, PRISM_CG_DY, 0));
const PRISM_MASS_OFFSET_INVERSED = inverseTransform(createTransform(), PRISM_MASS_OFFSET);

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

class RigidInfo {
  constructor(shape) {
    this.prismCollisionMargin = PRISM_MARGIN;
    this.prismCollisionVertices = PRISM_COLLISION_VERTICES;

    this.links = [];
    this.baseLinks = [];
    this.joints = [];

    const parts = shape.discoverParts();
    for (let i = 0; i < parts.length; i++) {
      console.log("Link " + (i + 1) + "/" + parts.length + ":");
      const link = this.createLink(parts[i]);
      if (link) {
        this.links.push(link);
      }
    }

    for (const section of shape.sections) {
      if (section.type === SectionType.ACTUATOR) {
        const joint = this.createJoint(shape, parts, section);
        if (joint) {
          this.joints.push(joint);
        }
      }
    }

    const partChains = shape.discoverPartChains(parts);
    this.baseLinks.push(...partChains.map(partChain =>
        this.links[parts.findIndex(p => p === partChain[0])]));
  }

  createLink(part) {
    if (part.length === 0) {
      return;
    }

    const transforms = [];
    const partOrigin = vec3.create();
    for (const prism of part) {
      const transform = multiplyTransforms(createTransform(),
          createTransform(prism.worldPosition, prism.worldOrientation),
          PRISM_MASS_OFFSET_INVERSED);
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

    const mass = part.length * PRISM_MASS;

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

    return {
      index: this.links.length,
      prisms: part,
      mass: mass,
      inertia: inertia,
      transform: partTransform,
      prismTransforms: transforms
    };
  }

  createJoint(shape, parts, section) {
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

    const baseLink = this.links[basePartIndex];
    if (!baseLink) {
      console.log("Base link not found");
      return;
    }
    const targetLink = this.links[targetPartIndex];
    if (!targetLink) {
      console.log("Target link not found");
      return;
    }

    const transform = createTransform(section.worldPosition, section.worldOrientation);
    const lowerAngle = section.getPropertyValue("lowerAngle") * DEGREES_TO_RADIANS;
    const upperAngle = section.getPropertyValue("upperAngle") * DEGREES_TO_RADIANS;

    return {
      baseLink: baseLink,
      targetLink: targetLink,
      transform: transform,
      lowerAngle: lowerAngle,
      upperAngle: upperAngle
    };
  }
}

export default RigidInfo;
