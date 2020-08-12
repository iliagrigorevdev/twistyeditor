import PlaceableView from './PlaceableView';

class ShapeView {
  constructor(shape, showSections, viewport) {
    this.shape = shape;

    this.placeableViews = new Map();
    for (const prism of this.shape.prisms) {
      this.placeableViews.set(prism.id, this.createPrismView(prism, viewport));
    }
    if (showSections) {
      for (const section of this.shape.sections) {
        this.placeableViews.set(section.id, this.createSectionView(section, viewport));
      }
    }

    this.syncTransform(viewport);
  }

  createPrismView(prism, viewport) {
    const renderable = viewport.createPrismRenderable(prism);
    return new PlaceableView(prism, renderable);
  }

  createSectionView(section, viewport) {
    const renderable = viewport.createSectionRenderable(section);
    return new PlaceableView(section, renderable);
  }

  destroy(viewport) {
    this.placeableViews.forEach(placeableView => viewport.destroyRenderable(placeableView.renderable));
    this.placeableViews = null;
  }

  findPlaceableView(id) {
    return this.placeableViews.get(id);
  }

  addToScene(viewport) {
    this.placeableViews.forEach(placeableView => viewport.scene.addEntity(placeableView.renderable));
  }

  syncTransform(viewport) {
    this.placeableViews.forEach(placeableView =>
        viewport.setRenderableTransform(placeableView.renderable, placeableView.placeable.worldPosition,
            placeableView.placeable.worldOrientation));
  }
}

export default ShapeView;
