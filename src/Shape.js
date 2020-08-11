import { mat3, quat, vec3 } from 'gl-matrix';
import Prism from './Prism';
import Actuator from './Actuator';

const DEGREES_TO_RADIANS = Math.PI / 180;
const DEFAULT_BACKGROUND_COLOR = "#1976d2";
const DEFAULT_FOREGROUND_COLOR = "#d9d9d9";

const PLANE_HEIGHT = 0.5;

class Shape {
  constructor() {
    this.prisms = [];
    this.actuators = [];
    this.lastPlaceableId = 0;
    this.roll = 0;
    this.pitch = 0;
    this.yaw = 0;
    this.aabb = {
      min: vec3.create(),
      max: vec3.create(),
      center: vec3.create()
    };
  }

  static createInitialShape() {
    const shape = new Shape();
    const prism = new Prism();
    prism.id = ++shape.lastPlaceableId;
    prism.backgroundColor = DEFAULT_BACKGROUND_COLOR;
    prism.foregroundColor = DEFAULT_FOREGROUND_COLOR;
    shape.prisms.push(prism);
    shape.applyTransform();
    return shape;
  }

  getOrientation() {
    const orientation = quat.create();
    quat.rotateY(orientation, orientation, this.yaw * DEGREES_TO_RADIANS);
    quat.rotateX(orientation, orientation, this.roll * DEGREES_TO_RADIANS);
    quat.rotateZ(orientation, orientation, this.pitch * DEGREES_TO_RADIANS);
    return orientation;
  }

  applyTransform() {
    const orientation = this.getOrientation();
    for (let i = 0; i < 2; i++) {
      vec3.zero(this.aabb.min);
      vec3.zero(this.aabb.max);
      for (let j = 0; j < this.prisms.length; j++) {
        const prism = this.prisms[j];
        prism.applyTransform(orientation);

        // Compute axis aligned bounding box
        for (let k = 0; k < prism.vertices.length; k++) {
          const vertex = prism.vertices[k];
          if ((j === 0) && (k === 0)) {
            vec3.copy(this.aabb.min, vertex);
            vec3.copy(this.aabb.max, vertex);
          } else {
            vec3.min(this.aabb.min, this.aabb.min, vertex);
            vec3.max(this.aabb.max, this.aabb.max, vertex);
          }
        }
      }

      if (i === 0) {
        // Align to plane
        const inverseOrientation = quat.invert(quat.create(), orientation);
        const translation = vec3.fromValues(0, PLANE_HEIGHT - this.aabb.min[1], 0);
        vec3.transformQuat(translation, translation, inverseOrientation);
        this.translate(translation);
      } else {
        for (const actuator of this.actuators) {
          actuator.applyTransform(orientation);
        }

        vec3.add(this.aabb.center, this.aabb.min, this.aabb.max);
        vec3.scale(this.aabb.center, this.aabb.center, 0.5);
      }
    }
  }

  translate(translation) {
    this.prisms.forEach(prism => prism.translate(translation));
    this.actuators.forEach(actuator => actuator.translate(translation));
  }

  rotate(rotation) {
    this.prisms.forEach(prism => prism.rotate(rotation));
    this.actuators.forEach(actuator => actuator.rotate(rotation));
  }

  findPlaceable(id) {
    if (!id) {
      return null;
    }
    for (const prism of this.prisms) {
      if (prism.id === id) {
        return prism;
      }
    }
    for (const actuator of this.actuators) {
      if (actuator.id === id) {
        return actuator;
      }
    }
    return null;
  }

  intersect(ray) {
    let hitPlaceable;
    let hitDistance;
    for (const prism of this.prisms) {
      const prismHitDistance = prism.intersect(ray);
      if (prismHitDistance !== undefined) {
        if ((hitDistance === undefined) || (prismHitDistance < hitDistance)) {
          hitPlaceable = prism;
          hitDistance = prismHitDistance;
        }
      }
    }
    for (const actuator of this.actuators) {
      const actuatorHitDistance = actuator.intersect(ray);
      if (actuatorHitDistance !== undefined) {
        if ((hitDistance === undefined) || (actuatorHitDistance < hitDistance)) {
          hitPlaceable = actuator;
          hitDistance = actuatorHitDistance;
        }
      }
    }
    if (!hitPlaceable) {
      return;
    }
    return {
      hitPlaceable: hitPlaceable,
      hitDistance: hitDistance
    };
  }

  getAvailableJunctions(prism) {
    const orientation = this.getOrientation();
    let junctions = prism.getJunctions();
    junctions.forEach(junction => {
      junction.prisms.forEach(junctionPrism => junctionPrism.applyTransform(orientation));
      junction.prisms = junction.prisms.filter(junctionPrism => this.prisms.every(shapePrism =>
          (shapePrism === prism) || !shapePrism.collides(junctionPrism)));

      if ((junction.prisms.length === 0) && junction.allowActuator) {
        for (const shapePrism of this.prisms) {
          if (shapePrism === prism) {
            continue;
          }
          const coincidingFace = prism.coincideFace(shapePrism, junction.face);
          if (coincidingFace !== undefined) {
            if (this.actuators.some(actuator =>
                ((actuator.basePrismId === prism.id) && (actuator.targetPrismId === shapePrism.id))
                || ((actuator.basePrismId === shapePrism.id) && (actuator.targetPrismId === prism.id)))) {
              continue;
            }
            const actuator = new Actuator();
            const binormal = vec3.cross(vec3.create(), junction.normal, junction.tangent);
            vec3.copy(actuator.position, junction.pivot);
            quat.fromMat3(actuator.orientation, mat3.fromValues(
                junction.normal[0], junction.normal[1], junction.normal[2],
                junction.tangent[0], junction.tangent[1], junction.tangent[2],
                binormal[0], binormal[1], binormal[2]));
            actuator.baseFace = junction.face;
            actuator.targetFace = coincidingFace;
            actuator.basePrismId = prism.id;
            actuator.targetPrismId = shapePrism.id;
            actuator.applyTransform(orientation);
            junction.actuator = actuator;
            break;
          }
        }
      }

      vec3.transformQuat(junction.pivot, junction.pivot, orientation);
      vec3.transformQuat(junction.normal, junction.normal, orientation);
      vec3.transformQuat(junction.tangent, junction.tangent, orientation);
    });
    return junctions.filter(junction => (junction.prisms.length > 0) || junction.actuator);
  }

  discoverParts() {
    let parts = [];
    for (const prism of this.prisms) {
      const suitableParts = [];
      for (const part of parts) {
        for (const partPrism of part) {
          const coincidence = prism.coincide(partPrism);
          if ((coincidence !== undefined) && this.actuators.every(actuator =>
              ((actuator.basePrismId !== prism.id) || (actuator.baseFace !== coincidence.baseFace))
              && ((actuator.targetPrismId !== prism.id) || (actuator.targetFace !== coincidence.baseFace)))) {
            suitableParts.push(part);
            break;
          }
        }
      }
      let suitablePart;
      if (suitableParts.length === 1) {
        suitablePart = suitableParts[0];
      } else if (suitableParts.length > 1) {
        // Merge suitable parts
        suitablePart = [].concat.apply([], suitableParts);
        parts = parts.filter(part => !suitableParts.includes(part));
        parts.push(suitablePart);
      } else {
        suitablePart = [];
        parts.push(suitablePart);
      }
      suitablePart.push(prism);
    }
    return parts;
  }

  toArchive() {
    return {
      prisms: this.prisms.map(prism => prism.toArchive()),
      actuators: this.actuators.map(actuator => actuator.toArchive()),
      lastPlaceableId: this.lastPlaceableId,
      roll: this.roll,
      pitch: this.pitch,
      yaw: this.yaw
    };
  }

  fromArchive(archive, version) {
    this.prisms = archive.prisms.map(prismArchive => {
      const prism = new Prism();
      prism.fromArchive(prismArchive);
      return prism;
    });
    if (version < 2) {
      this.lastPlaceableId = archive.lastPrismId;
    } else {
      this.actuators = archive.actuators.map(actuatorArchive => {
        const actuator = new Actuator();
        actuator.fromArchive(actuatorArchive);
        return actuator;
      });
      this.lastPlaceableId = archive.lastPlaceableId;
    }
    this.roll = archive.roll;
    this.pitch = archive.pitch;
    this.yaw = archive.yaw;
  }

  clone() {
    const shape = new Shape();
    for (const prism of this.prisms) {
      shape.prisms.push(prism.clone());
    }
    for (const actuator of this.actuators) {
      shape.actuators.push(actuator.clone());
    }
    shape.lastPlaceableId = this.lastPlaceableId;
    shape.roll = this.roll;
    shape.pitch = this.pitch;
    shape.yaw = this.yaw;
    vec3.copy(shape.aabb.min, this.aabb.min);
    vec3.copy(shape.aabb.max, this.aabb.max);
    vec3.copy(shape.aabb.center, this.aabb.center);
    return shape;
  }
}

export default Shape;
