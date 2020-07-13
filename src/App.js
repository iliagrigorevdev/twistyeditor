import './App.css';
import React, { Component } from 'react';
import Viewport from './Viewport';
import Toolbar from './Toolbar';
import { vec3, quat } from 'gl-matrix';
import Prism from './Prism';
import Shape from './Shape';

class App extends Component {
  constructor(props) {
    super(props);

    // XXX test shape
    const backgroundColors = [0x2a7fff, 0xff7f2a, 0xffd42a, 0x7f2aff];
    const foregroundColor = 0xf9f9f9;
    const shape = new Shape();
    for (let i = 0; i < 8; i++) {
      const angle = i * 360 / 8;
      const prism = new Prism();
      prism.id = ++shape.lastPrismId;
      prism.colorMask = i;
      prism.backgroundColor = backgroundColors[i % backgroundColors.length];
      prism.foregroundColor = foregroundColor;
      quat.fromEuler(prism.orientation, 0, 0, angle);
      vec3.set(prism.position, 2, 0, 0);
      vec3.transformQuat(prism.position, prism.position, prism.orientation);
      prism.position[0] -= 2;
      shape.prisms.push(prism);
    }
    shape.applyTransform();

    this.state = {
      shape: shape,
      activePrism: null
    };
  }

  handleShapeChange(shape) {
    const nextState = { shape: shape };
    if (this.state.activePrism) {
      nextState.activePrism = shape.findPrism(this.state.activePrism.id);
    }
    this.setState(nextState);
  }

  handleActivePrismChange(activePrism) {
    this.setState({ activePrism: activePrism });
  }

  render() {
    return (
      <div className="App">
        <Viewport shape={this.state.shape} activePrism={this.state.activePrism}
          onShapeChange={(shape) => this.handleShapeChange(shape)}
          onActivePrismChange={(activePrism) => this.handleActivePrismChange(activePrism)} />
        <Toolbar shape={this.state.shape} activePrism={this.state.activePrism}
          onShapeChange={(shape) => this.handleShapeChange(shape)} />
      </div>
    );
  }
}

export default App;
