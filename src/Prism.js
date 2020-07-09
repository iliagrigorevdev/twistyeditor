import { vec3, quat } from 'gl-matrix';

class Prism {
  constructor() {
    this.position = vec3.create();
    this.orientation = quat.create();
    this.colorMask = 0;
    this.backgroundColor = 0x000000;
    this.foregroundColor = 0xffffff;
  }

  clone() {
    const prism = new Prism();
    vec3.copy(prism.position, this.position);
    quat.copy(prism.orientation, this.orientation);
    prism.colorMask = this.colorMask;
    prism.backgroundColor = this.backgroundColor;
    prism.foregroundColor = this.foregroundColor;
    return prism;
  }
}

export default Prism;
