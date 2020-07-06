import PrismView from './PrismView';
import { vec3, quat, mat4 } from 'gl-matrix';

class ShapeView {
  constructor(shape, viewport) {
    this.shape = shape;
    this.elevation = 0;
    this.heading = 0;
    this.distance = 10;
    this.target = vec3.create();

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

  addToScene(scene) {
    this.prismViews.forEach((prismView) => scene.addEntity(prismView.renderable));
  }

  removeFromScene(scene) {
    this.prismViews.forEach((prismView) => scene.remove(prismView.renderable));
  }

  applyTransform(viewport) {
    const eye = [0, 0, this.distance];
    const center = [0, 0, 0];
    const up = [0, 1, 0];
    vec3.rotateX(eye, eye, center, this.elevation);
    vec3.rotateY(eye, eye, center, this.heading);
    viewport.camera.lookAt(eye, center, up);

    const position = vec3.create();
    const orientation = quat.create();
    const transform = mat4.create();
    const shapeOrientation = quat.create();
    quat.rotateX(shapeOrientation, shapeOrientation, this.shape.roll);
    quat.rotateZ(shapeOrientation, shapeOrientation, this.shape.pitch);
    for (let i = 0; i < this.prismViews.length; i++) {
      const prismView = this.prismViews[i];
      vec3.copy(position, prismView.prism.position);
      quat.copy(orientation, prismView.prism.orientation);
      vec3.subtract(position, position, this.target);
      vec3.transformQuat(position, position, shapeOrientation);
      vec3.add(position, position, this.target);
      quat.multiply(orientation, shapeOrientation, orientation);
      const transformInstance = viewport.transformManager.getInstance(prismView.renderable);
      mat4.fromRotationTranslation(transform, orientation, position);
      viewport.transformManager.setTransform(transformInstance, transform);
      transformInstance.delete();
    }
  }
}

export default ShapeView;
