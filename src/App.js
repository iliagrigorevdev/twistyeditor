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
      historyEntries: [],
      historyIndex: -1
    };

    this.addHistoryEntry(this.state, shape);
  }

  addHistoryEntry(state, shape) {
    let historyLength = state.historyIndex + 1;
    const historyStart = (historyLength >= HISTORY_LENGTH_MAX ?
        historyLength - HISTORY_LENGTH_MAX + 1 : 0);
    historyLength = Math.min(historyLength, HISTORY_LENGTH_MAX - 1);
    state.historyEntries = state.historyEntries.splice(historyStart, historyLength);
    state.historyEntries.push({
      shape: shape,
      activePrism: this.state.activePrism
    });
    state.historyIndex = state.historyEntries.length - 1;
  }

  handleShapeChange(shape) {
    const nextState = {
      shape: shape,
      historyEntries: this.state.historyEntries,
      historyIndex: this.state.historyIndex
    };
    if (this.state.activePrism) {
      nextState.activePrism = shape.findPrism(this.state.activePrism.id);
    }
    this.addHistoryEntry(nextState, shape);
    this.setState(nextState);
  }

  handleActivePrismChange(activePrism) {
    this.setState({ activePrism: activePrism });
  }

  handleHistoryChange(index) {
    if ((index < 0) || (index >= this.state.historyEntries.length)) {
      return;
    }
    const historyEntry = this.state.historyEntries[index];
    const nextState = {
      shape: historyEntry.shape,
      activePrism: historyEntry.activePrism,
      historyIndex: index
    };
    this.setState(nextState);
  }

  render() {
    return (
      <div className="App">
        <Viewport shape={this.state.shape} activePrism={this.state.activePrism}
          onShapeChange={(shape) => this.handleShapeChange(shape)}
          onActivePrismChange={(activePrism) => this.handleActivePrismChange(activePrism)} />
        <Toolbar shape={this.state.shape} activePrism={this.state.activePrism}
          historyEntries={this.state.historyEntries} historyIndex={this.state.historyIndex}
          onShapeChange={(shape) => this.handleShapeChange(shape)}
          onHistoryChange={(index) => this.handleHistoryChange(index)} />
      </div>
    );
  }
}

export default App;
