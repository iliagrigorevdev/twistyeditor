import { mat3, quat, vec3 } from 'gl-matrix';
import Prism from './Prism';
import Section, { SectionType } from './Section';

const ARCHIVE_VERSION = 3;

const DEGREES_TO_RADIANS = Math.PI / 180;
const DEFAULT_BACKGROUND_COLOR = "#1976d2";
const DEFAULT_FOREGROUND_COLOR = "#d9d9d9";

const PLANE_HEIGHT = 0.5;

class Shape {
  constructor() {
    this.prisms = [];
    this.sections = [];
    this.lastPlaceableId = 0;
    this.roll = 0;
    this.pitch = 0;
    this.yaw = 0;
    this.showPose = true;
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
        for (const section of this.sections) {
          section.applyTransform(orientation);
        }

        vec3.add(this.aabb.center, this.aabb.min, this.aabb.max);
        vec3.scale(this.aabb.center, this.aabb.center, 0.5);
      }
    }
  }

  translate(translation) {
    this.prisms.forEach(prism => prism.translate(translation));
    this.sections.forEach(section => section.translate(translation));
  }

  rotate(rotation) {
    this.prisms.forEach(prism => prism.rotate(rotation));
    this.sections.forEach(section => section.rotate(rotation));
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
    for (const section of this.sections) {
      if (section.id === id) {
        return section;
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
    for (const section of this.sections) {
      const sectionHitDistance = section.intersect(ray);
      if (sectionHitDistance !== undefined) {
        if ((hitDistance === undefined) || (sectionHitDistance < hitDistance)) {
          hitPlaceable = section;
          hitDistance = sectionHitDistance;
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

  hasPrismIntersections() {
    for (let i = 0; i < this.prisms.length; i++) {
      const prism = this.prisms[i];
      for (let j = i + 1; j < this.prisms.length; j++) {
        const otherPrism = this.prisms[j];
        if (prism.collides(otherPrism)) {
          return true;
        }
      }
    }
    return false;
  }

  getAvailableJunctions(prism) {
    const orientation = this.getOrientation();
    let junctions = prism.getJunctions();
    junctions.forEach(junction => {
      junction.prisms.forEach(junctionPrism => junctionPrism.applyTransform(orientation));
      junction.prisms = junction.prisms.filter(junctionPrism => this.prisms.every(shapePrism =>
          (shapePrism === prism) || !shapePrism.collides(junctionPrism)));

      if (junction.prisms.length === 0) {
        for (const shapePrism of this.prisms) {
          if (shapePrism === prism) {
            continue;
          }
          const coincidingFace = prism.coincideFace(shapePrism, junction.face);
          if (coincidingFace !== undefined) {
            if (this.sections.some(section =>
                ((section.basePrismId === prism.id) && (section.targetPrismId === shapePrism.id))
                || ((section.basePrismId === shapePrism.id) && (section.targetPrismId === prism.id)))) {
              continue;
            }
            const section = new Section();
            const binormal = vec3.cross(vec3.create(), junction.normal, junction.tangent);
            vec3.copy(section.position, junction.pivot);
            quat.fromMat3(section.orientation, mat3.fromValues(
                junction.normal[0], junction.normal[1], junction.normal[2],
                junction.tangent[0], junction.tangent[1], junction.tangent[2],
                binormal[0], binormal[1], binormal[2]));
            section.baseFace = junction.face;
            section.targetFace = coincidingFace;
            section.basePrismId = prism.id;
            section.targetPrismId = shapePrism.id;
            section.applyTransform(orientation);
            junction.section = section;
            break;
          }
        }
      }

      vec3.transformQuat(junction.pivot, junction.pivot, orientation);
      vec3.transformQuat(junction.normal, junction.normal, orientation);
      vec3.transformQuat(junction.tangent, junction.tangent, orientation);
    });
    return junctions.filter(junction => (junction.prisms.length > 0) || junction.section);
  }

  discoverParts() {
    let parts = [];
    for (const prism of this.prisms) {
      const suitableParts = [];
      for (const part of parts) {
        for (const partPrism of part) {
          const coincidence = prism.coincide(partPrism);
          if ((coincidence !== undefined) && this.sections.every(section =>
              ((section.basePrismId !== prism.id) || (section.baseFace !== coincidence.baseFace))
              && ((section.targetPrismId !== prism.id) || (section.targetFace !== coincidence.baseFace)))) {
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

  discoverPartChains(parts) {
    const partChains = [];
    const remainingParts = new Set(parts);
    while (remainingParts.size > 0) {
      const part = remainingParts.values().next().value;
      const partChain = this.findChildParts(null, part, null, parts, false);
      if (!partChain) {
        return;
      }
      for (const part of partChain) {
        remainingParts.delete(part);
      }
      partChains.push(partChain);
    }
    partChains.sort((a, b) => (a.length === b.length
        ? b.reduce((acc, val) => acc + val.length) - a.reduce((acc, val) => acc + val.length)
        : b.length - a.length));
    for (let i = 0; i < partChains.length; i++) {
      const partChain = partChains[i];
      for (let j = i + 1; j < partChains.length; j++) {
        const otherPartChain = partChains[j];
        if (partChain.some(part => otherPartChain.some(otherPart => otherPart === part))) {
          partChains.splice(j, 1);
          j--;
        }
      }
    }
    return partChains;
  }

  findValidSectionRefs(section, parts) {
    const basePrism = this.findPlaceable(section.basePrismId);
    const targetPrism = this.findPlaceable(section.targetPrismId);
    const basePart = parts.find(part => part.some(prism => prism === basePrism));
    const targetPart = parts.find(part => part.some(prism => prism === targetPrism));
    if (!basePart || !targetPart) {
      console.log("Section parts not found");
    }
    if (basePart === targetPart) {
      console.log("Section must connect different parts");
    }
    return {
      basePart: basePart,
      targetPart: targetPart
    };
  }

  findChildParts(rootPart, parentPart, parentSection, parts, bidirectional, childParts = []) {
    if (childParts.length === 0) {
      childParts.push(parentPart);
    }
    for (const section of this.sections) {
      if ((section.type === SectionType.SEPARATOR) || (section === parentSection)) {
        continue;
      }
      const sectionRefs = this.findValidSectionRefs(section, parts);
      if (!sectionRefs) {
        return;
      }
      let childPart = (sectionRefs.basePart === parentPart ? sectionRefs.targetPart : null);
      if (!childPart && bidirectional) {
        childPart = (sectionRefs.targetPart === parentPart ? sectionRefs.basePart : null);
      }
      if (!childPart) {
        continue;
      }
      if ((childPart === rootPart) || childParts.find(part => part === childPart)) {
        console.log("Child parts must not be looped");
        return;
      }
      childParts.push(childPart);
      if (!this.findChildParts(rootPart, childPart, section, parts, bidirectional, childParts)) {
        return;
      }
    }
    return childParts;
  }

  applyInitialAngles() {
    let parts;
    const positionInversed = vec3.create();
    const axis = vec3.create();
    const rotation = quat.create();
    for (const section of this.sections) {
      if (section.type !== SectionType.ACTUATOR) {
        continue;
      }
      const initialAngle = section.getPropertyValue("initialAngle");
      if (initialAngle === 0) {
        continue;
      }
      if (!parts) {
        parts = this.discoverParts();
      }
      const sectionRefs = this.findValidSectionRefs(section, parts);
      if (!sectionRefs) {
        return;
      }
      const childParts = this.findChildParts(sectionRefs.basePart,
          sectionRefs.targetPart, section, parts, true);
      if (!childParts) {
        console.log("Failed to apply initial angle");
        continue;
      }
      vec3.negate(positionInversed, section.position);
      vec3.transformQuat(axis, vec3.set(axis, 1, 0, 0), section.orientation);
      quat.setAxisAngle(rotation, axis, initialAngle * DEGREES_TO_RADIANS);
      const childPrisms = childParts.flat();
      const childSections = this.sections.filter(section => childPrisms.some(prism =>
          (prism.id === section.basePrismId) || prism.id === section.targetPrismId));
      [...childPrisms, ...childSections].forEach(placeable => {
        if (placeable === section) {
          return;
        }
        placeable.translate(positionInversed);
        placeable.rotate(rotation);
        placeable.translate(section.position);
      });
    }
    if (parts) {
      this.applyTransform();
    }
  }

  toArchive() {
    return {
      prisms: this.prisms.map(prism => prism.toArchive()),
      sections: this.sections.map(section => section.toArchive()),
      lastPlaceableId: this.lastPlaceableId,
      roll: this.roll,
      pitch: this.pitch,
      yaw: this.yaw,
      showPose: this.showPose
    };
  }

  fromArchive(archive, version) {
    this.prisms = archive.prisms.map(prismArchive => {
      const prism = new Prism();
      prism.fromArchive(prismArchive);
      return prism;
    });
    if (version >= 2) {
      this.sections = archive.sections.map(sectionArchive => {
        const section = new Section();
        section.fromArchive(sectionArchive, version);
        return section;
      });
      this.lastPlaceableId = archive.lastPlaceableId;
    } else {
      this.lastPlaceableId = archive.lastPrismId;
    }
    this.roll = archive.roll;
    this.pitch = archive.pitch;
    this.yaw = archive.yaw;
    if (version >= 3) {
      this.showPose = archive.showPose;
    }
  }

  clone() {
    const shape = new Shape();
    for (const prism of this.prisms) {
      shape.prisms.push(prism.clone());
    }
    for (const section of this.sections) {
      shape.sections.push(section.clone());
    }
    shape.lastPlaceableId = this.lastPlaceableId;
    shape.roll = this.roll;
    shape.pitch = this.pitch;
    shape.yaw = this.yaw;
    shape.showPose = this.showPose;
    vec3.copy(shape.aabb.min, this.aabb.min);
    vec3.copy(shape.aabb.max, this.aabb.max);
    vec3.copy(shape.aabb.center, this.aabb.center);
    return shape;
  }

  static save(shape) {
    return JSON.stringify({
      version: ARCHIVE_VERSION,
      shape: shape.toArchive()
    });
  }

  static load(text) {
    const archive = JSON.parse(text);
    if (archive.version > ARCHIVE_VERSION) {
      alert("Unsupported version: " + archive.version);
      return;
    }
    const shape = new Shape();
    shape.fromArchive(archive.shape, archive.version);
    shape.applyTransform();
    return shape;
  }
}

export default Shape;
