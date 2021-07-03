
function vectorToString(vector, precision) {
  return vector[0].toFixed(precision) + " "
      + vector[1].toFixed(precision) + " "
      + vector[2].toFixed(precision);
}

function quaternionToString(quad, precision) {
  return quad[0].toFixed(precision) + " "
      + quad[1].toFixed(precision) + " "
      + quad[2].toFixed(precision) + " "
      + quad[3].toFixed(precision);
}

function transformToString(transform) {
  return vectorToString(transform.position, 6) + " "
      + quaternionToString(transform.orientation, 4);
}

class Exporter {
  constructor(config, rigidInfo) {
    this.config = config;
    this.rigidInfo = rigidInfo;
  }

  export(name) {
    const lines = [];

    lines.push("o " + name);

    lines.push("c " + this.config.advanceReward + " "
               + this.config.aliveReward + " "
               + this.config.forwardReward + " "
               + this.config.jointAtLimitCost + " "
               + this.config.driveCost + " "
               + this.config.stallTorqueCost);

    for (const link of this.rigidInfo.links) {
      lines.push("l " + link.mass.toFixed(4) + " "
          + vectorToString(link.inertia, 4) + " "
          + transformToString(link.transform));
      for (const localTransform of link.localTransforms) {
        lines.push("p " + transformToString(localTransform));
      }
    }

    for (const joint of this.rigidInfo.joints) {
      lines.push("j " + joint.baseLink.index + " "
          + joint.targetLink.index + " "
          + joint.lowerAngle.toFixed(2) + " "
          + joint.upperAngle.toFixed(2) + " "
          + joint.power.toFixed(2) + " "
          + transformToString(joint.transform));
    }

    for (const baseLink of this.rigidInfo.baseLinks) {
      lines.push("b " + baseLink.index);
    }

    return lines.join("\n");
  }
}

export default Exporter;
