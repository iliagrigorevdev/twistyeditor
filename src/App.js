import './App.css';
import React, { Component } from 'react';
import Viewport from './Viewport';
import Toolbar from './Toolbar';
import Shape from './Shape';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      shape: Shape.createInitialShape(),
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
