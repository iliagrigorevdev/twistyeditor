import RigidInfo from './RigidInfo';
import { createTransform, multiplyTransforms, inverseTransform } from './Transform';
import { quaternionToRollPitchYaw } from './VecMath';

function vectorToString(vector, precision) {
  return vector[0].toFixed(precision) + " "
      + vector[1].toFixed(precision) + " "
      + vector[2].toFixed(precision);
}

function transformToString(transform) {
  return vectorToString(transform.position, 6) + " "
      + vectorToString(quaternionToRollPitchYaw(transform.orientation), 4);
}

class Exporter {
  constructor(shape) {
    const groundedShape = shape.clone();
    groundedShape.applyTransform(0);
    this.rigidInfo = new RigidInfo(groundedShape);
  }

  export(name) {
    const lines = [];

    lines.push("o " + name);

    for (const link of this.rigidInfo.links) {
      lines.push("l " + link.mass.toFixed(4) + " "
          + vectorToString(link.inertia, 4) + " "
          + transformToString(link.transform));
      const childTransform = inverseTransform(createTransform(), link.transform);
      for (const transform of link.prismTransforms) {
        const prismTransform = multiplyTransforms(createTransform(), childTransform, transform);
        lines.push("p " + transformToString(prismTransform));
      }
    }

    for (const joint of this.rigidInfo.joints) {
      lines.push("j " + joint.baseLink.index + " "
          + joint.targetLink.index + " "
          + joint.lowerAngle.toFixed(4) + " "
          + joint.upperAngle.toFixed(4) + " "
          + transformToString(joint.transform));
    }

    for (const baseLink of this.rigidInfo.baseLinks) {
      lines.push("b " + baseLink.index);
    }

    return lines.join("\n");
  }
}

export default Exporter;
