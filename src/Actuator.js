import Placeable from './Placeable';
import { createCylinder, intersectCylinder } from './Collision';
import { vec3, quat } from 'gl-matrix';

const ACTUATOR_RADIUS = 1;
const ACTUATOR_DEPTH = 0.3;

class Actuator extends Placeable {
  constructor() {
    super();
    this.baseFace = undefined;
    this.targetFace = undefined;
    this.basePrismId = 0;
    this.targetPrismId = 0;
  }

  intersect(ray) {
    const normal = vec3.fromValues(1, 0, 0);
    vec3.transformQuat(normal, normal, this.worldOrientation);
    const cylinder = createCylinder(this.worldPosition, normal,
        ACTUATOR_RADIUS, ACTUATOR_DEPTH, true);
    return intersectCylinder(ray, cylinder);
  }

  toArchive() {
    return {
      id: this.id,
      baseFace: this.baseFace,
      targetFace: this.targetFace,
      basePrismId: this.basePrismId,
      targetPrismId: this.targetPrismId,
      position: this.position,
      orientation: this.orientation
    };
  }

  fromArchive(archive) {
    this.id = archive.id;
    this.baseFace = archive.baseFace;
    this.targetFace = archive.targetFace;
    this.basePrismId = archive.basePrismId;
    this.targetPrismId = archive.targetPrismId;
    vec3.copy(this.position, archive.position);
    quat.copy(this.orientation, archive.orientation);
  }

  clone() {
    const actuator = new Actuator();
    actuator.copy(this);
    actuator.baseFace = this.baseFace;
    actuator.targetFace = this.targetFace;
    actuator.basePrismId = this.basePrismId;
    actuator.targetPrismId = this.targetPrismId;
    return actuator;
  }
}

export default Actuator;
