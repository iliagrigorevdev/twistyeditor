import './App.css';
import React, { Component } from 'react';
import Viewport from './Viewport';
import Toolbar from './Toolbar';
import Shape from './Shape';

const ARCHIVE_VERSION = 1;
const ARCHIVE_EXTENSION = ".twy";
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

  handleShapeChange(shape, reset = false) {
    const nextState = {
      shape: shape,
      historyEntries: this.state.historyEntries,
      historyIndex: this.state.historyIndex
    };
    if (reset) {
      nextState.activePrism = null;
    } else if (this.state.activePrism) {
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

  static shapeToArchive(shape) {
    return JSON.stringify({
      version: ARCHIVE_VERSION,
      shape: shape.toArchive()
    });
  }

  static archiveToShape(text) {
    const archive = JSON.parse(text);
    if (archive.version !== 1) {
      alert("Unsupported version: " + archive.version);
      return;
    }
    const shape = new Shape();
    shape.fromArchive(archive.shape);
    shape.applyTransform();
    return shape;
  }

  handleShapeReset() {
    this.handleShapeChange(Shape.createInitialShape(), true);
  }

  handleShapeImport() {
    const element = document.createElement("input");
    element.setAttribute("type", "file");
    element.setAttribute("accept", ARCHIVE_EXTENSION);
    element.addEventListener("change", () => {
      if (!element.files.length) {
        return;
      }
      const file = element.files[0];
      const reader = new FileReader();
      reader.onload = ((e) => {
        const shape = App.archiveToShape(e.target.result);
        if (shape) {
          this.handleShapeChange(shape, true);
        }
      });
      reader.readAsText(file);
    });
    element.click();
  }

  handleShapeExport(shape) {
    const name = prompt("Enter shape name: ");
    if (!name) {
      return;
    }
    const element = document.createElement("a");
    const content = App.shapeToArchive(shape);
    const file = new Blob([content], {type: "text/plain;charset=utf-8"});
    element.href = URL.createObjectURL(file);
    element.download = name + ARCHIVE_EXTENSION;
    document.body.appendChild(element);
    element.click();
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
          onHistoryChange={(index) => this.handleHistoryChange(index)}
          onShapeReset={() => this.handleShapeReset()}
          onShapeImport={() => this.handleShapeImport()}
          onShapeExport={(shape) => this.handleShapeExport(shape)} />
      </div>
    );
  }
}

export default App;
