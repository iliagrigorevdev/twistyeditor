import './App.css';
import React, { Component } from 'react';
import Viewport from './Viewport';
import Toolbar from './Toolbar';
import Shape from './Shape';
import ShapeFolder from './ShapeFolder';
import Exporter from './Exporter';
import Config from './Config';
import Worker from "./Worker.worker.js";
import RigidInfo from './RigidInfo';

const ARCHIVE_VERSION = 3;
const ARCHIVE_EXTENSION = ".twy";
const HISTORY_LENGTH_MAX = 30;

const AppMode = Object.freeze({
  EDIT: 0,
  TRAINING: 1,
  PLAY: 2,
  LOADING: 3
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
      trainingSteps: 0,
      trainingTime: 0,
      trainingState: null
    };
    this.figures = null;
    this.figureRandomIndices = null;
    this.figureIndex = -1;
    this.finalShape = shape;
    this.rigidInfo = null;
    this.shapeData = null;
    this.checkpoint = null;
    this.database = null;
    this.worker = null;
    this.playing = false;

    this.addHistoryEntry(this.state, shape, this.finalShape, 0);
  }

  addHistoryEntry(state, shape, finalShape, activePlaceableId) {
    let historyLength = state.historyIndex + 1;
    const historyStart = (historyLength >= HISTORY_LENGTH_MAX ?
        historyLength - HISTORY_LENGTH_MAX + 1 : 0);
    historyLength = Math.min(historyLength, HISTORY_LENGTH_MAX - 1);
    state.historyEntries = state.historyEntries.splice(historyStart, historyLength);
    state.historyEntries.push({
      shape: shape,
      finalShape: finalShape,
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
    if (!this.ensureEditMode()) {
      return;
    }

    const nextState = {
      shape: shape,
      historyEntries: this.state.historyEntries,
      historyIndex: this.state.historyIndex
    };
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
    this.addHistoryEntry(nextState, shape, this.finalShape, nextState.activePlaceableId);
    this.setState(nextState);
  }

  handleActivePlaceableChange(activePlaceableId) {
    this.setState({ activePlaceableId: activePlaceableId });
  }

  handleHistoryChange(index) {
    if (!this.ensureEditMode()) {
      return;
    }

    if ((index < 0) || (index >= this.state.historyEntries.length)) {
      return;
    }
    const historyEntry = this.state.historyEntries[index];
    this.finalShape = historyEntry.finalShape;
    this.setState({
      shape: historyEntry.shape,
      activePlaceableId: historyEntry.activePlaceableId,
      historyIndex: index
    });
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

  handleArchiveLoad() {
    if (!this.ensureEditMode()) {
      return;
    }

    this.uploadFile(ARCHIVE_EXTENSION, (content) => {
      const archive = JSON.parse(content);
      if (archive.version > ARCHIVE_VERSION) {
        alert("Unsupported version: " + archive.version);
        return;
      }
      const shape = new Shape();
      shape.fromArchive(archive.shape, archive.version);
      shape.applyTransform();
      if (shape) {
        this.handleShapeChange(shape, true);
      } else {
        alert("Failed to load shape");
      }
      const config = archive.config;
      if (config) {
        this.handleConfigChange(config);
      } else {
        alert("Failed to load config");
      }
      this.checkpoint = archive.checkpoint;
    });
  }

  handleArchiveSave() {
    if (!this.state.shape.name) {
      alert("Shape name must be given");
      return;
    }
    this.generateShapeData();
    const content = JSON.stringify({
      version: ARCHIVE_VERSION,
      shape: this.state.shape.toArchive(),
      shapeData: this.shapeData,
      config: this.state.config,
      checkpoint: this.checkpoint
    });
    this.downloadFile(this.state.shape.name + ARCHIVE_EXTENSION, content);
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
    if ((mode === AppMode.TRAINING) || (mode === AppMode.PLAY)) {
      this.generateShapeData();
      this.playing = (mode === AppMode.PLAY);

      let activeJointCount = 0;
      for (const joint of this.rigidInfo.joints) {
        if (joint.power !== 0) {
          activeJointCount++;
        }
      }
      if (activeJointCount > 0) {
        nextState.mode = AppMode.LOADING;
        nextState.trainingSteps = 0;
        nextState.trainingTime = 0;
      } else {
        nextState.mode = this.state.mode;
        alert("No active actuator");
      }
    } else if (mode === AppMode.LOADING) {
      if (window.Worker) {
        nextState.mode = (this.playing ? AppMode.PLAY : AppMode.TRAINING);
      } else {
        nextState.mode = AppMode.EDIT;
        alert("No worker support");
      }
    }
    this.setState(nextState);

    if (nextState.mode === AppMode.LOADING) {
      this.loadCheckpoint(checkpoint => {
        if (checkpoint) {
          if (checkpoint.key !== this.checkpoint.key) {
            console.log("Checkpoint keys must be equal");
          } else if (!this.checkpoint.data || !this.checkpoint.time ||
                     (checkpoint.time > this.checkpoint.time)) {
            this.checkpoint = checkpoint;
            console.log("Use checkpoint from DB");
          }
        }
        this.handleAppModeChange(this.state.mode);
      });
    } else if ((nextState.mode === AppMode.TRAINING) || (nextState.mode === AppMode.PLAY)) {
      this.worker = new Worker();
      this.worker.onmessage = ((e) => this.handleWorkerMessage(e));
      this.worker.postMessage([this.state.config, this.shapeData, this.checkpoint.data, this.playing]);
    }
  }

  handleWorkerMessage(e) {
    const [steps, time, state, data] = e.data;
    if (data) {
      this.checkpoint.data = data;
      this.checkpoint.time = Date.now();
      this.saveCheckpoint();
    }
    const nextState = {
      trainingState: state
    };
    if ((this.state.trainingTime !== time) ||
        ((steps === this.state.config.totalSteps) && (nextState.trainingSteps !== steps))) {
      nextState.trainingSteps = steps;
      nextState.trainingTime = time;
    }
    this.setState(nextState);
  }

  generateShapeData() {
    this.rigidInfo = new RigidInfo(this.finalShape);
    const exporter = new Exporter(this.rigidInfo);
    this.shapeData = exporter.export(this.finalShape.name);
    const checkpoint = this.createCheckpoint(this.state.config, this.shapeData);
    if (checkpoint.key !== this.checkpoint?.key) {
      this.checkpoint = checkpoint;
    }
  }

  ensureEditMode() {
    const editMode = (this.state.mode === AppMode.EDIT);
    if (!editMode) {
      alert("Stop training mode first");
    }
    return editMode;
  }

  downloadFile(name, content) {
    const element = document.createElement("a");
    const file = new Blob([content], {type: "text/plain;charset=utf-8"});
    element.href = URL.createObjectURL(file);
    element.download = name;
    document.body.appendChild(element);
    element.click();
  }

  uploadFile(extension, onload) {
    const element = document.createElement("input");
    element.setAttribute("type", "file");
    element.setAttribute("accept", extension);
    element.addEventListener("change", () => {
      if (!element.files.length) {
        return;
      }
      const file = element.files[0];
      const reader = new FileReader();
      reader.onload = ((e) => {
        onload(e.target.result);
      });
      reader.readAsText(file);
    });
    element.click();
  }

  createCheckpoint(config, shapeData) {
    return {
      key: getStringHash(config.hiddenLayerSizes.toString() + shapeData),
      data: null,
      time: null
    };
  }

  loadCheckpoint(ondone) {
    if (this.database) {
      const getRequest = this.database
                         .transaction("checkpoint", "readonly")
                         .objectStore("checkpoint")
                         .get(this.checkpoint.key);
      getRequest.onsuccess = (e) => {
        ondone(getRequest.result);
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

  saveCheckpoint() {
    if (this.database) {
      const putRequest = this.database
                         .transaction("checkpoint", "readwrite")
                         .objectStore("checkpoint")
                         .put(this.checkpoint);
      putRequest.onerror = (e) => {
        console.log("Failed to save checkpoint");
      };
    } else {
      this.openDatabase(() => {
        if (this.database) {
          this.saveCheckpoint();
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
          trainingSteps={this.state.trainingSteps} trainingTime={this.state.trainingTime}
          config={this.state.config}
          onShapeChange={shape => this.handleShapeChange(shape)}
          onHistoryChange={index => this.handleHistoryChange(index)}
          onShapeReset={() => this.handleShapeReset()}
          onShapeShowcase={() => this.handleShapeShowcase()}
          onArchiveSave={() => this.handleArchiveSave()}
          onArchiveLoad={() => this.handleArchiveLoad()}
          onTrainingStart={() => this.handleAppModeChange(AppMode.TRAINING)}
          onTrainingStop={() => this.handleAppModeChange(AppMode.EDIT)}
          onTrainingPlay={() => this.handleAppModeChange(AppMode.PLAY)}
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
