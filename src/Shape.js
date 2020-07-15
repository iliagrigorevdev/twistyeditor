import { quat, vec3 } from 'gl-matrix';

const RADIANS_TO_DEGREES = Math.PI / 180;

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

  applyTransform() {
    const shapeOrientation = quat.create();
    quat.rotateY(shapeOrientation, shapeOrientation, this.yaw * RADIANS_TO_DEGREES);
    quat.rotateX(shapeOrientation, shapeOrientation, this.roll * RADIANS_TO_DEGREES);
    quat.rotateZ(shapeOrientation, shapeOrientation, this.pitch * RADIANS_TO_DEGREES);

    vec3.zero(this.aabb.min);
    vec3.zero(this.aabb.max);
    for (let i = 0; i < this.prisms.length; i++) {
      const prism = this.prisms[i];
      prism.applyTransform(shapeOrientation);

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
