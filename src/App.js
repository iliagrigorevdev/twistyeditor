import './App.css';
import React, { Component } from 'react';
import Viewport from './Viewport';
import Toolbar from './Toolbar';
import Shape from './Shape';
import ShapeFolder from './ShapeFolder';
import Exporter from './Exporter';
import Config from './Config';
import Worker from "./Worker.worker.js";

const ARCHIVE_EXTENSION = ".twy";
const EXPORT_EXTENSION = ".twe";
const HISTORY_LENGTH_MAX = 30;

const AppMode = Object.freeze({
  EDIT: 0,
  TRAINING: 1,
  LOADING: 2
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
      historyIndex: -1,
      config: new Config(),
      trainingProgress: 0,
      trainingTime: 0,
      trainingState: null
    };
    this.figures = null;
    this.figureRandomIndices = null;
    this.figureIndex = -1;
    this.finalShape = shape;
    this.rigidInfo = null;
    this.shapeData = null;
    this.checkpointKey = null;
    this.checkpointData = null;
    this.database = null;
    this.worker = null;

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
    if (shape.showPose) {
      this.finalShape = shape.clone();
      this.finalShape.applyInitialAngles();
      if (this.finalShape.hasPrismIntersections()) {
        console.log("Shape has intersections between prisms");
      }
    } else {
      this.finalShape = shape;
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

  handleShapeLoad() {
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
        const shape = Shape.load(e.target.result);
        // TODO load config and training data
        if (shape) {
          this.handleShapeChange(shape, true);
        } else {
          alert("Failed to load shape");
        }
      });
      reader.readAsText(file);
    });
    element.click();
  }

  downloadFile(name, content) {
    const element = document.createElement("a");
    const file = new Blob([content], {type: "text/plain;charset=utf-8"});
    element.href = URL.createObjectURL(file);
    element.download = name;
    document.body.appendChild(element);
    element.click();
  }

  handleShapeSave(shape) {
    if (!shape.name) {
      alert("Shape name must be given");
      return;
    }
    const content = Shape.save(shape);
    // TODO save config and training data
    this.downloadFile(shape.name + ARCHIVE_EXTENSION, content);
  }

  handleShapeExport(shape) {
    if (!shape.name) {
      alert("Shape name must be given");
      return;
    }
    const exporter = new Exporter(shape);
    const content = exporter.export(shape.name);
    this.downloadFile(shape.name + EXPORT_EXTENSION, content);
  }

  handleConfigChange(config) {
    this.setState({ config: config });
  }

  handleAppModeChange(mode) {
    const nextState = {
      mode: mode
    };
    if (this.worker != null) {
      this.worker.terminate();
      this.worker = null;
    }
    if (mode === AppMode.TRAINING) {
      const exporter = new Exporter(this.state.shape);
      this.rigidInfo = exporter.rigidInfo;
      this.shapeData = exporter.export(this.state.shape.name);
      this.checkpointKey = this.getCheckpointKey();
      this.checkpointData = null;

      let activeJointCount = 0;
      for (const joint of this.rigidInfo.joints) {
        if (joint.power !== 0) {
          activeJointCount++;
        }
      }
      if (activeJointCount > 0) {
        nextState.mode = AppMode.LOADING;
        nextState.trainingProgress = 0;
        nextState.trainingTime = 0;
      } else {
        nextState.mode = this.state.mode;
        alert("No active actuator");
      }
    } else if (mode === AppMode.LOADING) {
      if (window.Worker) {
        nextState.mode = AppMode.TRAINING;
      } else {
        nextState.mode = AppMode.EDIT;
        alert("No worker support");
      }
    }
    this.setState(nextState);

    if (nextState.mode === AppMode.LOADING) {
      this.loadCheckpoint(data => {
        this.checkpointData = data;
        this.handleAppModeChange(this.state.mode);
      });
    } else if (nextState.mode === AppMode.TRAINING) {
      this.worker = new Worker();
      this.worker.onmessage = ((e) => this.handleWorkerMessage(e));
      this.worker.postMessage([this.state.config, this.shapeData, this.checkpointData]);
    }
  }

  handleWorkerMessage(e) {
    const [progress, time, state, data] = e.data;
    if (data) {
      this.saveCheckpoint(this.checkpointKey, data);
    }
    const nextState = {
      trainingState: state
    };
    if ((this.state.trainingProgress !== progress) ||
        (this.state.trainingTime !== time)) {
      nextState.trainingProgress = progress;
      nextState.trainingTime = time;
    }
    this.setState(nextState);
  }

  getCheckpointKey() {
    return getStringHash(this.state.config.hiddenLayerSizes.toString() + this.shapeData);
  }

  loadCheckpoint(ondone) {
    if (this.database) {
      const getRequest = this.database
                         .transaction("checkpoint", "readonly")
                         .objectStore("checkpoint")
                         .get(this.checkpointKey);
      getRequest.onsuccess = (e) => {
        ondone(getRequest.result?.data);
      };
      getRequest.onerror = (e) => {
        console.log("Failed to load checkpoint");
        ondone();
      };
    } else {
      this.openDatabase(() => {
        if (this.database) {
          this.loadCheckpoint(ondone);
        } else {
          ondone();
        }
      });
    }
  }

  saveCheckpoint(key, data) {
    if (this.database) {
      const putRequest = this.database
                         .transaction("checkpoint", "readwrite")
                         .objectStore("checkpoint")
                         .put({key: key, data: data});
      putRequest.onerror = (e) => {
        console.log("Failed to save checkpoint");
      };
    } else {
      this.openDatabase(() => {
        if (this.database) {
          this.saveCheckpoint(key, data);
        }
      });
    }
  }

  openDatabase(ondone) {
    const openRequest = indexedDB.open("database");
    openRequest.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains("checkpoint")) {
        database.createObjectStore("checkpoint", {keyPath: "key"});
        console.log("Initialize DB");
      }
    };
    openRequest.onsuccess = (e) => {
      this.database = openRequest.result;
      ondone();
    };
    openRequest.onerror = (e) => {
      console.log("Failed to open DB");
      ondone();
    };
  }

  render() {
    return (
      <div className="App">
        <Viewport mode={this.state.mode} originalShape={this.state.shape}
          finalShape={this.finalShape} rigidInfo={this.rigidInfo}
          activePlaceableId={this.state.activePlaceableId} trainingState={this.state.trainingState}
          onShapeChange={(shape, activePlaceableId) => this.handleShapeChange(shape, false, activePlaceableId)}
          onActivePlaceableChange={activePlaceableId => this.handleActivePlaceableChange(activePlaceableId)} />
        <Toolbar mode={this.state.mode} shape={this.state.shape}
          activePlaceableId={this.state.activePlaceableId}
          historyEntries={this.state.historyEntries} historyIndex={this.state.historyIndex}
          trainingProgress={this.state.trainingProgress} trainingTime={this.state.trainingTime}
          config={this.state.config}
          onShapeChange={shape => this.handleShapeChange(shape)}
          onHistoryChange={index => this.handleHistoryChange(index)}
          onShapeReset={() => this.handleShapeReset()}
          onShapeShowcase={() => this.handleShapeShowcase()}
          onShapeSave={shape => this.handleShapeSave(shape)}
          onShapeLoad={() => this.handleShapeLoad()}
          onShapeExport={shape => this.handleShapeExport(shape)}
          onTrainingStart={() => this.handleAppModeChange(AppMode.TRAINING)}
          onTrainingStop={() => this.handleAppModeChange(AppMode.EDIT)}
          onConfigChange={config => this.handleConfigChange(config)} />
      </div>
    );
  }
}

function getStringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

export default App;
export { AppMode };
