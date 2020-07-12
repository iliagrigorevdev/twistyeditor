import { quat } from 'gl-matrix';

class Shape {
  constructor() {
    this.prisms = [];
    this.roll = 0;
    this.pitch = 0;
  }

  applyTransform() {
    const shapeOrientation = quat.create();
    quat.rotateX(shapeOrientation, shapeOrientation, this.roll / 180 * Math.PI);
    quat.rotateZ(shapeOrientation, shapeOrientation, this.pitch / 180 * Math.PI);
    this.prisms.forEach((prism) => prism.applyTransform(shapeOrientation));
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
    shape.roll = this.roll;
    shape.pitch = this.pitch;
    for (let i = 0; i < this.prisms.length; i++) {
      shape.prisms.push(this.prisms[i].clone());
    }
    return shape;
  }
}

export default Shape;
