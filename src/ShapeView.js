import PrismView from './PrismView';
import { vec3, quat, mat4 } from 'gl-matrix';

class ShapeView {
  constructor(shape, viewport) {
    this.shape = shape;

    this.prismViews = [];
    for (let i = 0; i < this.shape.prisms.length; i++) {
      this.prismViews.push(this.createPrismView(this.shape.prisms[i], viewport));
    }

    this.applyTransform(viewport);
  }

  createPrismView(prism, viewport) {
    const renderable = viewport.createPrismRenderable(prism.colorMask,
        prism.backgroundColor, prism.foregroundColor);
    return new PrismView(prism, renderable);
  }

  addToScene(viewport) {
    this.prismViews.forEach((prismView) => viewport.scene.addEntity(prismView.renderable));
  }

  removeFromScene(viewport) {
    this.prismViews.forEach((prismView) => viewport.scene.remove(prismView.renderable));
  }

  applyTransform(viewport) {
    const position = vec3.create();
    const orientation = quat.create();
    const transform = mat4.create();
    const shapeOrientation = quat.create();
    quat.rotateX(shapeOrientation, shapeOrientation, this.shape.roll / 180 * Math.PI);
    quat.rotateZ(shapeOrientation, shapeOrientation, this.shape.pitch / 180 * Math.PI);
    for (let i = 0; i < this.prismViews.length; i++) {
      const prismView = this.prismViews[i];
      vec3.copy(position, prismView.prism.position);
      quat.copy(orientation, prismView.prism.orientation);
      vec3.transformQuat(position, position, shapeOrientation);
      quat.multiply(orientation, shapeOrientation, orientation);
      const transformInstance = viewport.transformManager.getInstance(prismView.renderable);
      mat4.fromRotationTranslation(transform, orientation, position);
      viewport.transformManager.setTransform(transformInstance, transform);
      transformInstance.delete();
    }
  }
}

export default ShapeView;
