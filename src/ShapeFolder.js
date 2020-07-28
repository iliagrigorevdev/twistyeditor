import Shape from "./Shape";
import Prism from "./Prism";
import { vec3, quat } from 'gl-matrix';
import { createTransform, rotatedTransform } from './Transform';

const DEGREES_TO_RADIANS = Math.PI / 180;

class ShapeFolder {
  constructor() {
    this.pieceCount = 0;
    this.shape = new Shape();
  }

  static build(name, figures) {
    const definition = figures.definitions.find(definition => definition.name === name);
    if (!definition) {
      return;
    }
    const skin = ShapeFolder.compileSkin(definition.skin, figures);
    if (!skin) {
      return;
    }
    const shapeFolder = new ShapeFolder();
    for (let i = 0; i < definition.pieces; i++) {
      const colors = skin.colors[i % skin.colors.length];
      shapeFolder.addPrism(skin.mask, colors[0], colors[1]);
    }
    if (!shapeFolder.fold(definition.notation)) {
      return;
    }
    if (!shapeFolder.applyRotations(definition.rotations)) {
      return;
    }
    const shape = shapeFolder.shape;
    shape.applyTransform();
    shape.translate(vec3.negate(vec3.create(), shape.aabb.center));
    shape.applyTransform();
    return shape;
  }

  static compileSkin(name, figures) {
    const startPos = (name.charAt(0) === "~" ? 1 : 0);
    const delimPos = name.lastIndexOf(":");
    const skinName = name.substring(startPos, (delimPos !== -1 ? delimPos : name.length));
    const skinDefinition = figures.skins.definitions.find(definition => definition.name === skinName);
    if (!skinDefinition) {
      return;
    }
    const skinPattern = figures.skins.patterns.find(pattern => pattern.key === skinDefinition.pattern);
    if (!skinPattern) {
      return;
    }

    const mask = (delimPos === -1 ? skinDefinition.mask : parseInt(name.substring(delimPos + 1)));

    const shapeColors = [];
    for (const colorNumbers of skinPattern.value) {
      const prismColors = [];
      for (const colorNumber of colorNumbers) {
        if ((colorNumber < 1) || (colorNumber > skinDefinition.colors.length)) {
          return;
        }
        const colorName = skinDefinition.colors[colorNumber - 1];
        const color = figures.skins.colors.find(color => color.key === colorName);
        if (!color) {
          return;
        }
        prismColors.push(color.value);
      }
      shapeColors.push(prismColors);
    }
    const revertColors = (startPos > 0);
    if (revertColors) {
      shapeColors.reverse();
    }

    return {
      mask: mask,
      colors: shapeColors
    };
  }

  addPrism(colorMask, backgroundColor, foregroundColor) {
    let prism;
    if (this.shape.prisms.length > 0) {
      const leftPrism = this.shape.prisms[this.shape.prisms.length - 1];
      prism = leftPrism.getJunctions()[1].prisms[0]; // unturned prism of right junction
    } else {
      prism = new Prism();
    }
    prism.id = ++this.shape.lastPrismId;
    prism.colorMask = colorMask;
    prism.backgroundColor = backgroundColor;
    prism.foregroundColor = foregroundColor;
    this.shape.prisms.push(prism);
    this.pieceCount++;
  }

  /**
   * Fold the shape using a notation in the following format:
   * 1. Number of the downward-facing prism (from the left): 1 to (pieceCount+1)/2
   * 2. Left or right sloping side of the prism: L or R
   * 3. Position of the twist towards you: 1, 2 or 3
   * Example: 1R2-2R2-3L2-4L2-6L2-6R2-7R2-9L2-10L2-10R2
   * @return true if no errors, otherwise false.
   */
  fold(notation) {
    const tokens = notation.split("-");
    for (let token of tokens) {
      let pos;
      let left;
      if ((pos = token.indexOf("L")) !== -1) {
        left = true;
      } else if ((pos = token.indexOf("R")) !== -1) {
        left = false;
      } else {
        return false;
      }
      const downwardPrismNumberStr = token.substring(0, pos);
      if (!downwardPrismNumberStr) {
        return false;
      }
      const downwardPrismNumber = parseInt(downwardPrismNumberStr, 10);
      const index = (downwardPrismNumber - 1) * 2;
      if ((index < 0) || (index >= this.pieceCount)) {
        return false;
      }
      const twistsStr = token.substring(pos + 1);
      if (!twistsStr) {
        return false;
      }
      const twists = parseInt(twistsStr, 10);
      if (!twists) {
        continue; // no twist
      }
      if ((twists < 1) || (twists > 3)) {
        return false;
      }

      if (twists < 3) {
        for (let i = 0; i < twists; i++) {
          if (!this.twist(index, left, left)) {
            return false;
          }
        }
      } else {
        if (!this.twist(index, left, !left)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Twist left or right adjacent prisms around a downward-facing prism
   * 90 degrees counter-clockwise or clockwise.
   * @param index prism index in range [0..pieceCount).
   * @param left twist left (true) or right (false) adjacent prisms.
   * @param ccw twist counter-clockwise (true) or clockwise (false).
   * @return true if prism index is in range, otherwise false.
   */
  twist(index, left, ccw) {
    if ((index < 0) || (index >= this.pieceCount)) {
      return false;
    }
    const prism = this.shape.prisms[index];
    const junctions = prism.getJunctions();
    const junction = (left ? junctions[0] : junctions[1]);
    const twistAngle = (ccw ? 1 : -1) * Math.PI / 2;
    if (left) {
      for (let i = index - 1; i >= 0; i--) {
        this.twistPrism(i, junction.pivot, junction.normal, twistAngle);
      }
    } else {
      for (let i = index + 1; i < this.pieceCount; i++) {
        this.twistPrism(i, junction.pivot, junction.normal, twistAngle);
      }
    }
    return true;
  }

  twistPrism(index, pivot, axis, angle) {
    const prism = this.shape.prisms[index];
    const prismTransform = createTransform(prism.position, prism.orientation);
    const transform = rotatedTransform(prismTransform, pivot, axis, angle);
    vec3.copy(prism.position, transform.position);
    quat.copy(prism.orientation, transform.orientation);
  }

  applyRotations(rotations) {
    if (rotations.length === 0) {
      return true;
    }
    const shapeRotation = quat.create();
    const rotation = quat.create();
    const axis = vec3.create();
    for (const aa of rotations) {
      if (aa.length === 4) {
        vec3.set(axis, aa[0], aa[2], -aa[1]);
        vec3.normalize(axis, axis);
        quat.setAxisAngle(rotation, axis, aa[3] * DEGREES_TO_RADIANS);
        quat.multiply(shapeRotation, rotation, shapeRotation);
      } else {
        return false;
      }
    }
    this.shape.rotate(shapeRotation);
    return true;
  }
}

export default ShapeFolder;
