import { vec3, quat } from 'gl-matrix';

class Prism {
  constructor() {
    this.position = vec3.create();
    this.orientation = quat.create();
    this.worldPosition = vec3.create();
    this.worldOrientation = quat.create();
    this.colorMask = 0;
    this.backgroundColor = 0x000000;
    this.foregroundColor = 0xffffff;
  }

  applyTransform(shapeOrientation) {
    vec3.transformQuat(this.worldPosition, this.position, shapeOrientation);
    quat.multiply(this.worldOrientation, shapeOrientation, this.orientation);
  }

  clone() {
    const prism = new Prism();
    vec3.copy(prism.position, this.position);
    quat.copy(prism.orientation, this.orientation);
    vec3.copy(prism.worldPosition, this.worldPosition);
    quat.copy(prism.worldOrientation, this.worldOrientation);
    prism.colorMask = this.colorMask;
    prism.backgroundColor = this.backgroundColor;
    prism.foregroundColor = this.foregroundColor;
    return prism;
  }
}

export default Prism;
