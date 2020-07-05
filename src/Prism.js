import { vec3, quat } from 'gl-matrix';

class Prism {
  constructor() {
    this.position = vec3.create();
    this.orientation = quat.create();
    this.colorMask = 0;
    this.backgroundColor = 0x000000;
    this.foregroundColor = 0xffffff;
  }
}

export default Prism;
