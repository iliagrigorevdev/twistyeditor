import PlaceableView from './PlaceableView';

class ShapeView {
  constructor(shape, showActuators, viewport) {
    this.shape = shape;

    this.placeableViews = [];
    for (const prism of this.shape.prisms) {
      this.placeableViews.push(this.createPrismView(prism, viewport));
    }
    if (showActuators) {
      for (const actuator of this.shape.actuators) {
        this.placeableViews.push(this.createActuatorView(actuator, viewport));
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
    for (const placeableView of this.placeableViews) {
      if (placeableView.placeable.id === id) {
        return placeableView;
      }
    }
    return null;
  }

  addToScene(viewport) {
    this.placeableViews.forEach(placeableView => viewport.scene.addEntity(placeableView.renderable));
  }

  syncTransform(viewport) {
    for (const placeableView of this.placeableViews) {
      viewport.setRenderableTransform(placeableView.renderable, placeableView.placeable.worldPosition,
          placeableView.placeable.worldOrientation);
    }
  }
}

export default ShapeView;
