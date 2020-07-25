import { quat, vec3 } from 'gl-matrix';
import Prism from './Prism';

const RADIANS_TO_DEGREES = Math.PI / 180;
const DEFAULT_BACKGROUND_COLOR = "#1976d2";
const DEFAULT_FOREGROUND_COLOR = "#d9d9d9";

class Shape {
  constructor() {
    this.prisms = [];
    this.lastPrismId = 0;
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
    prism.id = ++shape.lastPrismId;
    prism.backgroundColor = DEFAULT_BACKGROUND_COLOR;
    prism.foregroundColor = DEFAULT_FOREGROUND_COLOR;
    shape.prisms.push(prism);
    shape.applyTransform();
    return shape;
  }

  getOrientation() {
    const orientation = quat.create();
    quat.rotateY(orientation, orientation, this.yaw * RADIANS_TO_DEGREES);
    quat.rotateX(orientation, orientation, this.roll * RADIANS_TO_DEGREES);
    quat.rotateZ(orientation, orientation, this.pitch * RADIANS_TO_DEGREES);
    return orientation;
  }

  applyTransform() {
    const orientation = this.getOrientation();
    vec3.zero(this.aabb.min);
    vec3.zero(this.aabb.max);
    for (let i = 0; i < this.prisms.length; i++) {
      const prism = this.prisms[i];
      prism.applyTransform(orientation);

      // Compute axis aligned bounding box
      for (let j = 0; j < prism.vertices.length; j++) {
        const vertex = prism.vertices[j];
        if ((i === 0) && (j === 0)) {
          vec3.copy(this.aabb.min, vertex);
          vec3.copy(this.aabb.max, vertex);
        } else {
          vec3.min(this.aabb.min, this.aabb.min, vertex);
          vec3.max(this.aabb.max, this.aabb.max, vertex);
        }
      }
    }
    vec3.add(this.aabb.center, this.aabb.min, this.aabb.max);
    vec3.scale(this.aabb.center, this.aabb.center, 0.5);
  }

  findPrism(id) {
    for (let i = 0; i < this.prisms.length; i++) {
      const prism = this.prisms[i];
      if (prism.id === id) {
        return prism;
      }
    }
    return null;
  }

  intersect(ray) {
    let hitPrism;
    let hitDistance;
    for (let i = 0; i < this.prisms.length; i++) {
      const prism = this.prisms[i];
      const prismHitDistance = prism.intersect(ray);
      if (prismHitDistance !== undefined) {
        if ((hitDistance === undefined) || (prismHitDistance < hitDistance)) {
          hitPrism = prism;
          hitDistance = prismHitDistance;
        }
      }
    }
    if (!hitPrism) {
      return;
    }
    return {
      hitPrism: hitPrism,
      hitDistance: hitDistance
    };
  }

  getAvailableJunctions(prism) {
    const orientation = this.getOrientation();
    let junctions = prism.getJunctions();
    junctions.forEach(junction => {
      vec3.transformQuat(junction.pivot, junction.pivot, orientation);
      vec3.transformQuat(junction.normal, junction.normal, orientation);
      junction.prisms.forEach(junctionPrism => junctionPrism.applyTransform(orientation));
      junction.prisms = junction.prisms.filter(junctionPrism => this.prisms.every(shapePrism =>
          (shapePrism === prism) || !shapePrism.collides(junctionPrism)));
    });
    return junctions.filter(junction => junction.prisms.length > 0);
  }

  toArchive() {
    return {
      prisms: this.prisms.map(prism => prism.toArchive()),
      lastPrismId: this.lastPrismId,
      roll: this.roll,
      pitch: this.pitch,
      yaw: this.yaw
    };
  }

  fromArchive(archive) {
    this.prisms = archive.prisms.map(prismArchive => {
      const prism = new Prism();
      prism.fromArchive(prismArchive);
      return prism;
    });
    this.lastPrismId = archive.lastPrismId;
    this.roll = archive.roll;
    this.pitch = archive.pitch;
    this.yaw = archive.yaw;
  }

  clone() {
    const shape = new Shape();
    for (let i = 0; i < this.prisms.length; i++) {
      shape.prisms.push(this.prisms[i].clone());
    }
    shape.lastPrismId = this.lastPrismId;
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
