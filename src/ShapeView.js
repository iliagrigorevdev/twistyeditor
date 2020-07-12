import PrismView from './PrismView';
import { mat4 } from 'gl-matrix';

class ShapeView {
  constructor(shape, viewport) {
    this.shape = shape;

    this.prismViews = [];
    for (let i = 0; i < this.shape.prisms.length; i++) {
      this.prismViews.push(this.createPrismView(this.shape.prisms[i], viewport));
    }

    this.syncTransform(viewport);
  }

  createPrismView(prism, viewport) {
    const renderable = viewport.createPrismRenderable(prism.colorMask,
        prism.backgroundColor, prism.foregroundColor);
    return new PrismView(prism, renderable);
  }

  findPrismView(id) {
    for (let i = 0; i < this.prismViews.length; i++) {
      const prismView = this.prismViews[i];
      if (prismView.prism.id === id) {
        return prismView;
      }
    }
    return null;
  }

  addToScene(viewport) {
    this.prismViews.forEach((prismView) => viewport.scene.addEntity(prismView.renderable));
  }

  removeFromScene(viewport) {
    this.prismViews.forEach((prismView) => viewport.scene.remove(prismView.renderable));
  }

  syncTransform(viewport) {
    const transform = mat4.create();
    for (let i = 0; i < this.prismViews.length; i++) {
      const prismView = this.prismViews[i];
      const prism = prismView.prism;
      const transformInstance = viewport.transformManager.getInstance(prismView.renderable);
      mat4.fromRotationTranslation(transform, prism.worldOrientation, prism.worldPosition);
      viewport.transformManager.setTransform(transformInstance, transform);
      transformInstance.delete();
    }
  }
}

export default ShapeView;
