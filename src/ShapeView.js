import PrismView from './PrismView';

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

  destroy(viewport) {
    this.prismViews.forEach(prismView => viewport.destroyRenderable(prismView.renderable));
    this.prismViews = null;
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

  syncTransform(viewport) {
    for (let i = 0; i < this.prismViews.length; i++) {
      const prismView = this.prismViews[i];
      const prism = prismView.prism;
      viewport.setRenderableTransform(prismView.renderable, prism.worldPosition,
          prism.worldOrientation);
    }
  }
}

export default ShapeView;
