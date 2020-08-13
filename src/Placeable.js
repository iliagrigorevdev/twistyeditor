import { vec3, quat } from 'gl-matrix';

class Placeable {
  constructor() {
    this.id = 0;
    this.position = vec3.create();
    this.orientation = quat.create();
    this.worldPosition = vec3.create();
    this.worldOrientation = quat.create();
  }

  applyTransform(parentOrientation) {
    vec3.transformQuat(this.worldPosition, this.position, parentOrientation);
    quat.multiply(this.worldOrientation, parentOrientation, this.orientation);
  }

  translate(translation) {
    vec3.add(this.position, this.position, translation);
  }

  rotate(rotation) {
    vec3.transformQuat(this.position, this.position, rotation);
    quat.multiply(this.orientation, rotation, this.orientation);
    quat.normalize(this.orientation, this.orientation);
  }

  copy(placeable) {
    this.id = placeable.id;
    vec3.copy(this.position, placeable.position);
    quat.copy(this.orientation, placeable.orientation);
    vec3.copy(this.worldPosition, placeable.worldPosition);
    quat.copy(this.worldOrientation, placeable.worldOrientation);
  }
}

export default Placeable;
