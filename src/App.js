import './App.css';
import React, { Component } from 'react';
import Viewport from './Viewport';
import Toolbar from './Toolbar';
import Shape from './Shape';
import ShapeFolder from './ShapeFolder';

const ARCHIVE_VERSION = 3;
const ARCHIVE_EXTENSION = ".twy";
const HISTORY_LENGTH_MAX = 30;

const AppMode = Object.freeze({
  EDIT: 0,
  SIMULATION: 1
});

class App extends Component {
  constructor(props) {
    super(props);

    const shape = Shape.createInitialShape();

    this.state = {
      mode: AppMode.EDIT,
      shape: shape,
      activePlaceableId: 0,
      historyEntries: [],
      historyIndex: -1
    };
    this.figures = null;
    this.figureRandomIndices = null;
    this.figureIndex = -1;

    this.addHistoryEntry(this.state, shape, 0);
  }

  addHistoryEntry(state, shape, activePlaceableId) {
    let historyLength = state.historyIndex + 1;
    const historyStart = (historyLength >= HISTORY_LENGTH_MAX ?
        historyLength - HISTORY_LENGTH_MAX + 1 : 0);
    historyLength = Math.min(historyLength, HISTORY_LENGTH_MAX - 1);
    state.historyEntries = state.historyEntries.splice(historyStart, historyLength);
    state.historyEntries.push({
      shape: shape,
      activePlaceableId: activePlaceableId
    });
    state.historyIndex = state.historyEntries.length - 1;
  }

  showFigure(name) {
    const shape = ShapeFolder.build(name, this.figures);
    if (shape) {
      this.handleShapeChange(shape, true);
    }
  }

  static shapeToArchive(shape) {
    return JSON.stringify({
      version: ARCHIVE_VERSION,
      shape: shape.toArchive()
    });
  }

  static archiveToShape(text) {
    const archive = JSON.parse(text);
    if (archive.version > ARCHIVE_VERSION) {
      alert("Unsupported version: " + archive.version);
      return;
    }
    const shape = new Shape();
    shape.fromArchive(archive.shape, archive.version);
    shape.applyTransform();
    return shape;
  }

  handleShapeChange(shape, reset = false, activePlaceableId = undefined) {
    const nextState = {
      shape: shape,
      historyEntries: this.state.historyEntries,
      historyIndex: this.state.historyIndex
    };
    if (this.state.mode !== AppMode.EDIT) {
      nextState.mode = AppMode.EDIT;
    }
    if (reset || (this.state.activePlaceableId
        && !shape.findPlaceable(this.state.activePlaceableId))) {
      nextState.activePlaceableId = 0;
    } else if (activePlaceableId) {
      nextState.activePlaceableId = activePlaceableId;
    }
    this.addHistoryEntry(nextState, shape, nextState.activePlaceableId);
    this.setState(nextState);
  }

  handleActivePlaceableChange(activePlaceableId) {
    this.setState({ activePlaceableId: activePlaceableId });
  }

  handleHistoryChange(index) {
    if ((index < 0) || (index >= this.state.historyEntries.length)) {
      return;
    }
    const historyEntry = this.state.historyEntries[index];
    const nextState = {
      shape: historyEntry.shape,
      activePlaceableId: historyEntry.activePlaceableId,
      historyIndex: index
    };
    if (this.state.mode !== AppMode.EDIT) {
      nextState.mode = AppMode.EDIT;
    }
    this.setState(nextState);
  }

  handleShapeReset() {
    this.handleShapeChange(Shape.createInitialShape(), true);
  }

  handleShapeShowcase() {
    if (!this.figures) {
      fetch("res/figures.rsf")
        .then(response => response.json())
        .then(data => {
          this.figures = data;
          this.figureRandomIndices =
            [...Array(this.figures.definitions.length).keys()]
            .map(a => ({sort: Math.random(), value: a}))
            .sort((a, b) => a.sort - b.sort)
            .map(a => a.value);
          this.figureIndex = -1;
          this.handleShapeShowcase();
        });
    } else {
      this.figureIndex = (this.figureIndex + 1) % this.figureRandomIndices.length;
      const figureName = this.figures.definitions[this.figureRandomIndices[this.figureIndex]].name;
      this.showFigure(figureName);
    }
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

  handleSimulationStart() {
    this.setState({ mode: AppMode.SIMULATION });
  }

  handleSimulationStop() {
    this.setState({ mode: AppMode.EDIT });
  }

  render() {
    return (
      <div className="App">
        <Viewport mode={this.state.mode} shape={this.state.shape}
          activePlaceableId={this.state.activePlaceableId}
          onShapeChange={(shape, activePlaceableId) => this.handleShapeChange(shape, false, activePlaceableId)}
          onActivePlaceableChange={activePlaceableId => this.handleActivePlaceableChange(activePlaceableId)} />
        <Toolbar mode={this.state.mode} shape={this.state.shape}
          activePlaceableId={this.state.activePlaceableId}
          historyEntries={this.state.historyEntries} historyIndex={this.state.historyIndex}
          onShapeChange={shape => this.handleShapeChange(shape)}
          onHistoryChange={index => this.handleHistoryChange(index)}
          onShapeReset={() => this.handleShapeReset()}
          onShapeShowcase={() => this.handleShapeShowcase()}
          onShapeImport={() => this.handleShapeImport()}
          onShapeExport={shape => this.handleShapeExport(shape)}
          onSimulationStart={() => this.handleSimulationStart()}
          onSimulationStop={() => this.handleSimulationStop()} />
      </div>
    );
  }
}

export default App;
export { AppMode };
