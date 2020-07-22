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

    this.addHistoryEntry(this.state, shape, "Shape created");
  }

  addHistoryEntry(state, shape, label) {
    let historyLength = state.historyIndex + 1;
    const historyStart = (historyLength >= HISTORY_LENGTH_MAX ?
        historyLength - HISTORY_LENGTH_MAX + 1 : 0);
    historyLength = Math.min(historyLength, HISTORY_LENGTH_MAX - 1);
    state.historyEntries = state.historyEntries.splice(historyStart, historyLength);
    state.historyEntries.push({
      shape: shape,
      label: label
    });
    state.historyIndex = state.historyEntries.length - 1;
  }

  handleShapeChange(shape, label) {
    const nextState = {
      shape: shape,
      historyEntries: this.state.historyEntries,
      historyIndex: this.state.historyIndex
    };
    this.addHistoryEntry(nextState, shape, label);
    if (this.state.activePrism) {
      nextState.activePrism = shape.findPrism(this.state.activePrism.id);
    }
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
    this.setState({ shape: historyEntry.shape, historyIndex: index });
  }

  render() {
    return (
      <div className="App">
        <Viewport shape={this.state.shape} activePrism={this.state.activePrism}
          onShapeChange={(shape, label) => this.handleShapeChange(shape, label)}
          onActivePrismChange={(activePrism) => this.handleActivePrismChange(activePrism)} />
        <Toolbar shape={this.state.shape} activePrism={this.state.activePrism}
          historyEntries={this.state.historyEntries} historyIndex={this.state.historyIndex}
          onShapeChange={(shape, label) => this.handleShapeChange(shape, label)}
          onHistoryChange={(index) => this.handleHistoryChange(index)} />
      </div>
    );
  }
}

export default App;
