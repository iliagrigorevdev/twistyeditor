import Placeable from './Placeable';
import { createCylinder, intersectCylinder } from './Collision';
import { vec3, quat } from 'gl-matrix';

const SECTION_RADIUS = 1;
const SECTION_DEPTH = 0.3;

class Section extends Placeable {
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
        SECTION_RADIUS, SECTION_DEPTH, true);
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
    const section = new Section();
    section.copy(this);
    section.baseFace = this.baseFace;
    section.targetFace = this.targetFace;
    section.basePrismId = this.basePrismId;
    section.targetPrismId = this.targetPrismId;
    return section;
  }
}

export default Section;
