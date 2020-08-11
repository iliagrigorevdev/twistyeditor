import PlaceableView from './PlaceableView';

class ShapeView {
  constructor(shape, showActuators, viewport) {
    this.shape = shape;

    this.placeableViews = new Map();
    for (const prism of this.shape.prisms) {
      this.placeableViews.set(prism.id, this.createPrismView(prism, viewport));
    }
    if (showActuators) {
      for (const actuator of this.shape.actuators) {
        this.placeableViews.set(actuator.id, this.createActuatorView(actuator, viewport));
      }
    }

    this.syncTransform(viewport);
  }

  createPrismView(prism, viewport) {
    const renderable = viewport.createPrismRenderable(prism.colorMask,
        prism.backgroundColor, prism.foregroundColor);
    return new PlaceableView(prism, renderable);
  }

  createActuatorView(actuator, viewport) {
    const renderable = viewport.createActuatorRenderable();
    return new PlaceableView(actuator, renderable);
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
