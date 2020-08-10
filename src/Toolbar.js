import React, { Component } from 'react';
import './App.css';
import { COLOR_MASK_COUNT } from './Viewport';
import ColorPicker from './ColorPicker';
import { AppMode } from './App';
import Prism from './Prism';

class Toolbar extends Component {
  modifyShape(prevShape, shapeModifier) {
    const shape = prevShape.clone();
    shapeModifier(shape);
    shape.applyTransform();
    this.props.onShapeChange(shape);
  }

  modifyPrism(prevShape, prevPrism, prismModifier) {
    this.modifyShape(prevShape, (shape) => {
      const prism = shape.findPlaceable(prevPrism.id);
      prismModifier(prism);
    });
  }

  handleRollChange(prevShape, roll) {
    this.modifyShape(prevShape, (shape) => shape.roll = parseFloat(roll) || 0);
  }

  handlePitchChange(prevShape, pitch) {
    this.modifyShape(prevShape, (shape) => shape.pitch = parseFloat(pitch) || 0);
  }

  handleYawChange(prevShape, yaw) {
    this.modifyShape(prevShape, (shape) => shape.yaw = parseFloat(yaw) || 0);
  }

  handleColorMaskChange(prevShape, prevPrism, colorMask) {
    this.modifyPrism(prevShape, prevPrism,
        (prism) => prism.colorMask = parseInt(colorMask) || 0);
  }

  handleBackgroundColorChange(prevShape, prevPrism, color) {
    this.modifyPrism(prevShape, prevPrism,
        (prism) => prism.backgroundColor = color);
  }

  handleForegroundColorChange(prevShape, prevPrism, color) {
    this.modifyPrism(prevShape, prevPrism,
        (prism) => prism.foregroundColor = color);
  }

  handleSwapColors(prevShape, prevPrism) {
    this.modifyPrism(prevShape, prevPrism, (prism) => {
      prism.foregroundColor = prevPrism.backgroundColor;
      prism.backgroundColor = prevPrism.foregroundColor;
    });
  }

  handleDeletePrism(prevShape, prevPrism) {
    this.modifyShape(prevShape, (shape) => {
      shape.prisms = shape.prisms.filter(prism => prism.id !== prevPrism.id);
      shape.actuators = shape.actuators.filter(actuator => (actuator.basePrismId !== prevPrism.id)
          && (actuator.targetPrismId !== prevPrism.id));
    });
  }

  handleDeleteActuator(prevShape, prevActuator) {
    this.modifyShape(prevShape, (shape) => {
      shape.actuators = shape.actuators.filter(actuator => actuator.id !== prevActuator.id);
    });
  }

  renderShapeParams(shape) {
    return (
      <div className="Group">
        <h3>Shape</h3>
        <p>
          <label htmlFor="roll">Roll : </label>
          <input type="number" id="roll" name="roll" min="-180" max="180"
            step="15" value={shape.roll}
            onChange={e => this.handleRollChange(shape, e.target.value)} />
        </p>
        <p>
          <label htmlFor="pitch">Pitch : </label>
          <input type="number" id="pitch" name="pitch" min="-180" max="180"
            step="15" value={shape.pitch}
            onChange={e => this.handlePitchChange(shape, e.target.value)} />
        </p>
        <p>
          <label htmlFor="yaw">Yaw : </label>
          <input type="number" id="yaw" name="yaw" min="-180" max="180"
            step="15" value={shape.yaw}
            onChange={e => this.handleYawChange(shape, e.target.value)} />
        </p>
        <h3>File</h3>
        <p>
          <button id="resetShape" name="resetShape"
            onClick={() => this.props.onShapeReset()}>Reset</button>
          <button id="showcaseShape" name="showcaseShape"
            onClick={() => this.props.onShapeShowcase()}>Showcase</button>
        </p>
        <p>
          <button id="importShape" name="importShape"
            onClick={() => this.props.onShapeImport()}>Import</button>
          <button id="exportShape" name="exportShape"
            onClick={() => this.props.onShapeExport(shape)}>Export</button>
        </p>
        <h3>Simulation</h3>
        <button id="startSimulation" name="startSimulation" disabled={this.props.mode === AppMode.SIMULATION}
            onClick={() => this.props.onSimulationStart()}>Start</button>
        <button id="stopSimulation" name="stopSimulation" disabled={this.props.mode !== AppMode.SIMULATION}
            onClick={() => this.props.onSimulationStop()}>Stop</button>
      </div>
    );
  }

  renderPrismParams(shape, prism) {
    return (
      <div className="Group">
        <h3>Prism</h3>
        <p>
          <label htmlFor="colorMask">Mask : </label>
          <input type="number" id="colorMask" name="colorMask" min="0" max={COLOR_MASK_COUNT - 1}
            step="1" value={prism.colorMask}
            onChange={e => this.handleColorMaskChange(shape, prism, e.target.value)} />
        </p>
        <div>
          <label htmlFor="backgroundColor">Background : </label>
          <ColorPicker id="backgroundColor" name="backgroundColor" color={prism.backgroundColor}
            onChange={color => this.handleBackgroundColorChange(shape, prism, color)} />
        </div>
        <div>
          <label htmlFor="foregroundColor">Foreground : </label>
          <ColorPicker id="foregroundColor" name="foregroundColor" color={prism.foregroundColor}
            onChange={color => this.handleForegroundColorChange(shape, prism, color)} />
        </div>
        <p>
          <button id="swapColors" name="swapColors"
            onClick={() => this.handleSwapColors(shape, prism)}>Swap</button>
        </p>
        <p>
          <button id="deletePrism" name="deletePrism" disabled={shape.prisms.length <= 1}
            onClick={() => this.handleDeletePrism(shape, prism)}>Delete</button>
        </p>
      </div>
    );
  }

  renderActuatorParams(shape, actuator) {
    return (
      <div className="Group">
        <h3>Actuator</h3>
        <p>
          <button id="deleteActuator" name="deleteActuator"
            onClick={() => this.handleDeleteActuator(shape, actuator)}>Delete</button>
        </p>
      </div>
    );
  }

  renderParams() {
    const activePlaceable = this.props.shape.findPlaceable(this.props.activePlaceableId);
    if (activePlaceable) {
      if (activePlaceable instanceof Prism) {
        return this.renderPrismParams(this.props.shape, activePlaceable);
      } else {
        return this.renderActuatorParams(this.props.shape, activePlaceable);
      }
    } else {
      return this.renderShapeParams(this.props.shape);
    }
  }

  renderHistory() {
    return (
      <div className="Group">
        <h3>History</h3>
        <button id="undoHistory" name="undoHistory" disabled={this.props.historyIndex <= 0}
            onClick={() => this.props.onHistoryChange(this.props.historyIndex - 1)}>Undo</button>
        <button id="redoHistory" name="redoHistory" disabled={this.props.historyIndex >= this.props.historyEntries.length - 1}
            onClick={() => this.props.onHistoryChange(this.props.historyIndex + 1)}>Redo</button>
      </div>
    );
  }

  render() {
    return (
      <div className="Toolbar">
        {this.renderHistory()}
        {this.renderParams()}
      </div>
    );
  }
}

export default Toolbar;
