import Placeable from './Placeable';
import { createCylinder, intersectCylinder } from './Collision';
import { vec3, quat } from 'gl-matrix';

const SectionType = Object.freeze({
  SEPARATOR: 0,
  ACTUATOR: 1
});

const SECTION_RADIUS = 1;
const SECTION_DEPTH = 0.3;
const SWAP_ROTATION = quat.setAxisAngle(quat.create(),
    vec3.fromValues(0, 1, 0), Math.PI);

const SECTION_PROPERTIES = new Map([
  [SectionType.ACTUATOR, [
    { name: "initialAngle", min: -180, max: 180, default: 0 },
    { name: "lowerAngle", min: -90, max: 0, default: -90 },
    { name: "upperAngle", min: 0, max: 90, default: 90 },
    { name: "power", min: 1, max: 1000, default: 100 }
  ]]
]);

class Section extends Placeable {
  constructor() {
    super();
    this.type = SectionType.ACTUATOR;
    this.baseFace = undefined;
    this.targetFace = undefined;
    this.basePrismId = 0;
    this.targetPrismId = 0;
    this.properties = new Map();
  }

  swap() {
    [this.baseFace, this.targetFace] = [this.targetFace, this.baseFace];
    [this.basePrismId, this.targetPrismId] = [this.targetPrismId, this.basePrismId];
    quat.multiply(this.orientation, this.orientation, SWAP_ROTATION);
    quat.normalize(this.orientation, this.orientation);
  }

  intersect(ray) {
    const normal = vec3.fromValues(1, 0, 0);
    vec3.transformQuat(normal, normal, this.worldOrientation);
    const cylinder = createCylinder(this.worldPosition, normal,
        SECTION_RADIUS, SECTION_DEPTH, true);
    return intersectCylinder(ray, cylinder);
  }

  getProperties() {
    const mergedProperties = [];
    const sectionProperties = SECTION_PROPERTIES.get(this.type);
    if (sectionProperties) {
      for (const sectionProperty of sectionProperties) {
        let value;
        if (this.properties.has(sectionProperty.name)) {
          value = this.properties.get(sectionProperty.name);
        } else {
          value = sectionProperty.default;
        }
        const mergedProperty = Object.assign({}, sectionProperty);
        mergedProperty.value = value;
        mergedProperties.push(mergedProperty);
      }
    }
    return mergedProperties;
  }

  getPropertyLabel(name) {
    return name
      .split(/(?=[A-Z])/)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  getProperty(name) {
    const sectionProperties = SECTION_PROPERTIES.get(this.type);
    if (sectionProperties) {
      return sectionProperties.find(property => property.name === name);
    }
  }

  getPropertyValue(name) {
    if (this.properties.has(name)) {
      return this.properties.get(name);
    }
    const property = this.getProperty(name);
    if (property) {
      return property.default;
    }
  }

  setPropertyValue(name, value) {
    this.properties.set(name, this.validatePropertyValue(name, value));
  }

  validatePropertyValue(name, value) {
    const property = this.getProperty(name);
    if (property) {
      if (isNaN(value)) {
        return property.default;
      } else {
        return Math.max(property.min, Math.min(property.max, value));
      }
    } else {
      return value;
    }
  }

  toArchive() {
    return {
      id: this.id,
      type: this.type,
      baseFace: this.baseFace,
      targetFace: this.targetFace,
      basePrismId: this.basePrismId,
      targetPrismId: this.targetPrismId,
      properties: Array.from(this.properties.entries()),
      position: this.position,
      orientation: this.orientation
    };
  }

  fromArchive(archive, version) {
    this.id = archive.id;
    if (version >= 3) {
      this.type = archive.type;
      this.properties = new Map(archive.properties);
    } else {
      this.type = SectionType.SEPARATOR;
    }
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
    section.type = this.type;
    section.baseFace = this.baseFace;
    section.targetFace = this.targetFace;
    section.basePrismId = this.basePrismId;
    section.targetPrismId = this.targetPrismId;
    section.properties = new Map(this.properties);
    return section;
  }
}

export default Section;
export { SectionType };
