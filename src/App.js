import './App.css';
import React, { Component } from 'react';
import Viewport from './Viewport';
import Toolbar from './Toolbar';
import Shape from './Shape';

const HISTORY_LENGTH_MAX = 30;

class App extends Component {
  constructor(props) {
    super(props);

    const shape = Shape.createInitialShape();

    this.state = {
      shape: shape,
      activePrism: null,
      historyShapes: [],
      historyIndex: -1
    };

    this.addHistoryShape(this.state, shape);
  }

  addHistoryShape(state, shape) {
    let historyLength = state.historyIndex + 1;
    const historyStart = (historyLength >= HISTORY_LENGTH_MAX ?
        historyLength - HISTORY_LENGTH_MAX + 1 : 0);
    historyLength = Math.min(historyLength, HISTORY_LENGTH_MAX - 1);
    state.historyShapes = state.historyShapes.splice(historyStart, historyLength);
    state.historyShapes.push(shape);
    state.historyIndex = state.historyShapes.length - 1;
  }

  handleShapeChange(shape) {
    const nextState = {
      shape: shape,
      historyShapes: this.state.historyShapes,
      historyIndex: this.state.historyIndex
    };
    this.addHistoryShape(nextState, shape);
    if (this.state.activePrism) {
      nextState.activePrism = shape.findPrism(this.state.activePrism.id);
    }
    this.setState(nextState);
  }

  handleActivePrismChange(activePrism) {
    this.setState({ activePrism: activePrism });
  }

  handleHistoryChange(index) {
    if ((index < 0) || (index >= this.state.historyShapes.length)) {
      return;
    }
    const historyShape = this.state.historyShapes[index];
    const nextState = {
      shape: historyShape,
      historyIndex: index
    };
    if (this.state.activePrism) {
      nextState.activePrism = historyShape.findPrism(this.state.activePrism.id);
    }
    this.setState(nextState);
  }

  render() {
    return (
      <div className="App">
        <Viewport shape={this.state.shape} activePrism={this.state.activePrism}
          onShapeChange={(shape) => this.handleShapeChange(shape)}
          onActivePrismChange={(activePrism) => this.handleActivePrismChange(activePrism)} />
        <Toolbar shape={this.state.shape} activePrism={this.state.activePrism}
          historyShapes={this.state.historyShapes} historyIndex={this.state.historyIndex}
          onShapeChange={(shape) => this.handleShapeChange(shape)}
          onHistoryChange={(index) => this.handleHistoryChange(index)} />
      </div>
    );
  }
}

export default App;
