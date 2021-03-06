import React, { Component } from 'react';
import './App.css';
import { COLOR_MASK_COUNT } from './Viewport';
import ColorPicker from './ColorPicker';
import { AppMode } from './App';
import Prism from './Prism';
import Section, { SectionType } from './Section';

class Toolbar extends Component {
  constructor(props) {
    super(props);

    this.state = {
      syncColors: true
    }
  }

  modifyShape(prevShape, shapeModifier) {
    const shape = prevShape.clone();
    shapeModifier(shape);
    shape.applyTransform();
    this.props.onShapeChange(shape);
  }

  modifyPlaceable(prevShape, prevPlaceable, placeableModifier) {
    this.modifyShape(prevShape, (shape) => {
      const placeable = shape.findPlaceable(prevPlaceable.id);
      placeableModifier(placeable);
    });
  }

  handleNameChange(prevShape, name) {
    this.modifyShape(prevShape, (shape) => shape.name = name);
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

  handleShowPoseChange(prevShape, showPose) {
    this.modifyShape(prevShape, (shape) => shape.showPose = showPose);
  }

  handleColorMaskChange(prevShape, prevPrism, colorMask) {
    const prevColorMask = prevPrism.colorMask;
    const nextColorMask = parseInt(colorMask) || 0;
    this.modifyShape(prevShape, (shape) => {
      for (const prism of shape.prisms) {
        if ((prism.id === prevPrism.id) || 
            (this.state.syncColors && (prism.colorMask === prevColorMask))) {
          prism.colorMask = nextColorMask;
        }
      }
    });
  }

  handleBackgroundColorChange(prevShape, prevPrism, color) {
    const prevBackgroundColor = prevPrism.backgroundColor;
    this.modifyShape(prevShape, (shape) => {
      for (const prism of shape.prisms) {
        if ((prism.id === prevPrism.id) ||
            (this.state.syncColors && (prism.backgroundColor === prevBackgroundColor))) {
          prism.backgroundColor = color;
        }
        if (this.state.syncColors && (prism.foregroundColor === prevBackgroundColor)) {
          prism.foregroundColor = color;
        }
      }
    });
  }

  handleForegroundColorChange(prevShape, prevPrism, color) {
    const prevForegroundColor = prevPrism.foregroundColor;
    this.modifyShape(prevShape, (shape) => {
      for (const prism of shape.prisms) {
        if ((prism.id === prevPrism.id) ||
            (this.state.syncColors && (prism.foregroundColor === prevForegroundColor))) {
          prism.foregroundColor = color;
        }
        if (this.state.syncColors && (prism.backgroundColor === prevForegroundColor)) {
          prism.backgroundColor = color;
        }
      }
    });
  }

  handleSwapColors(prevShape, prevPrism) {
    this.modifyPlaceable(prevShape, prevPrism, (prism) => {
      prism.foregroundColor = prevPrism.backgroundColor;
      prism.backgroundColor = prevPrism.foregroundColor;
    });
  }

  handleDeletePrism(prevShape, prevPrism) {
    this.modifyShape(prevShape, (shape) => {
      shape.prisms = shape.prisms.filter(prism => prism.id !== prevPrism.id);
      shape.sections = shape.sections.filter(section => (section.basePrismId !== prevPrism.id)
          && (section.targetPrismId !== prevPrism.id));
    });
  }

  handleSectionTypeChange(prevShape, prevSection, type) {
    this.modifyPlaceable(prevShape, prevSection, (section) => {
      section.type = parseInt(type);
    });
  }

  handleSectionPropertyChange(prevShape, prevSection, name, value) {
    this.modifyPlaceable(prevShape, prevSection, (section) => {
      section.setPropertyValue(name, parseFloat(value));
    });
  }

  handleActiveChange(prevShape, prevSection, active) {
    this.modifyPlaceable(prevShape, prevSection, (section) => {
      if (active) {
        section.clearPropertyValue("power");
      } else {
        section.setPropertyValue("power", 0);
      }
    });
  }

  handleContinuousChange(prevShape, prevSection, continuous) {
    this.modifyPlaceable(prevShape, prevSection, (section) => {
      if (continuous) {
        section.setPropertyValue("lowerAngle", 1);
        section.setPropertyValue("upperAngle", -1);
      } else {
        section.clearPropertyValue("lowerAngle");
        section.clearPropertyValue("upperAngle");
      }
    });
  }

  handleSwapSection(prevShape, prevSection) {
    this.modifyPlaceable(prevShape, prevSection, (section) => {
      section.swap();
    });
  }

  handleDeleteSection(prevShape, prevSection) {
    this.modifyShape(prevShape, (shape) => {
      shape.sections = shape.sections.filter(section => section.id !== prevSection.id);
    });
  }

  handleConfigChange(prevConfig, property, value) {
    const config = JSON.parse(JSON.stringify(prevConfig));
    if (property === "hiddenLayerSizes") {
      value = value.split(",").map(Number);
    } else {
      value = parseFloat(value) || 0;
    }
    config[property] = value;
    this.props.onConfigChange(config);
  }

  formatTime(time) {
    return Math.floor(time / 60) + ":" + (time % 60).toString().padStart(2, "0");
  }

  getPropertyLabel(name) {
    return name
      .split(/(?=[A-Z])/)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  renderShapeParams(config, shape) {
    return (
      <div className="Group">
        <h3>Shape</h3>
        <p>
          <label htmlFor="name">Name : </label>
          <input type="text" id="name" name="name" value={shape.name}
            onChange={e => this.handleNameChange(shape, e.target.value)} />
        </p>
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
        <p>
          <input type="checkbox" id="showPose" name="showPose" checked={shape.showPose}
            onChange={e => this.handleShowPoseChange(shape, e.target.checked)} />
          <label htmlFor="showPose">Show pose</label>
        </p>
        <h3>File</h3>
        <p>
          <button id="reset" name="reset"
            onClick={() => this.props.onReset()}>Reset</button>
          <button id="showcaseShape" name="showcaseShape"
            onClick={() => this.props.onShapeShowcase()}>Showcase</button>
        </p>
        <p>
          <button id="saveArchive" name="saveArchive"
            onClick={() => this.props.onArchiveSave()}>Save</button>
          <button id="loadArchive" name="loadArchive"
            onClick={() => this.props.onArchiveLoad()}>Load</button>
        </p>
        <h3>Training</h3>
        <button id="startTraining" name="startTraining" disabled={this.props.mode !== AppMode.EDIT}
          onClick={() => this.props.onTrainingStart()}>Start</button>
        <button id="stopTraining" name="stopTraining"
          disabled={(this.props.mode !== AppMode.TRAINING) && (this.props.mode !== AppMode.PLAY)}
          onClick={() => this.props.onTrainingStop()}>Stop</button>
        <button id="playTraining" name="playTraining" disabled={this.props.mode !== AppMode.EDIT}
          onClick={() => this.props.onTrainingPlay()}>Play</button>
        {!this.props.trainingActive && ((this.props.mode === AppMode.TRAINING) || (this.props.mode === AppMode.PLAY)) &&
          <p>
            <label>Starting...</label>
          </p>
        }
        {this.props.trainingActive && (this.props.mode === AppMode.TRAINING) &&
          <p>
            <label>Progress : {this.props.trainingSteps} ~ {Math.floor(this.props.trainingSteps * 100 / this.props.config.totalSteps)}%</label>
          </p>
        }
        {this.props.trainingActive && (this.props.mode === AppMode.TRAINING) &&
          <p>
            <label>Value : {Math.floor(this.props.trainingValue)}</label>
          </p>
        }
        {this.props.trainingActive && (this.props.mode === AppMode.TRAINING) &&
          <p>
            <label>Losses : {this.props.trainingLosses.lossP.toFixed(2)} / {this.props.trainingLosses.lossV.toFixed(2)}</label>
          </p>
        }
        {this.props.trainingActive && (this.props.mode === AppMode.TRAINING) &&
          <p>
            <label>Time : {this.formatTime(this.props.trainingTime)}</label>
          </p>
        }
        {(this.props.mode !== AppMode.TRAINING) && (this.props.mode !== AppMode.PLAY) &&
          Object.keys(config).map(property => {
            const key = "config_" + property;
            const value = config[property];
            return <p key={key}>
              <label htmlFor={property}>{this.getPropertyLabel(property)} : </label>
              <input id={key} name={key} type={Array.isArray(value) ? "text" : "number"} value={value}
                onChange={e => this.handleConfigChange(config, property, e.target.value)} />
            </p>
          }
        )}
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
          <input type="checkbox" id="syncColors" name="syncColors" checked={this.state.syncColors}
            onChange={e => this.setState({ syncColors: e.target.checked })} />
          <label htmlFor="syncColors">Sync Colors</label>
        </p>
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

  renderSectionParams(shape, section) {
    const lowerAngle = section.getPropertyValue("lowerAngle");
    const upperAngle = section.getPropertyValue("upperAngle");
    const power = section.getPropertyValue("power");
    const active = (power !== 0);
    const continuous = (lowerAngle > upperAngle);
    return (
      <div className="Group">
        <h3>Section</h3>
        <p>
          <label htmlFor="sectionType">Type : </label>
          <select id="sectionType" name="sectionType" value={section.type}
              onChange={e => this.handleSectionTypeChange(shape, section, e.target.value)}>
            {Object.keys(SectionType).map(typeName => {
              const type = SectionType[typeName];
              return <option value={type} key={type}>
                {typeName.charAt(0) + typeName.substring(1).toLowerCase()}
              </option>
            })}
          </select>
        </p>
        {section.getProperties().map(property => {
          const key = "section_" + property.name;
          const disabled = (continuous && ((property.name === "lowerAngle") || (property.name === "upperAngle"))) ||
                           (!active && (property.name === "power"));
          return <p key={key}>
            <label htmlFor={key}>{this.getPropertyLabel(property.name)} : </label>
            <input id={key} name={key} disabled={disabled}
              type="number" min={property.min} max={property.max} value={property.value}
              onChange={e => this.handleSectionPropertyChange(shape, section, property.name, e.target.value)} />
          </p>
        })}
        <p>
          <input type="checkbox" id="active" name="active" checked={active}
            onChange={e => this.handleActiveChange(shape, section, e.target.checked)} />
          <label htmlFor="active">Active</label>
        </p>
        <p>
          <input type="checkbox" id="continuous" name="continuous" checked={continuous}
            onChange={e => this.handleContinuousChange(shape, section, e.target.checked)} />
          <label htmlFor="continuous">Continuous</label>
        </p>
        <p>
          <button id="swapSection" name="swapSection"
            onClick={() => this.handleSwapSection(shape, section)}>Swap</button>
        </p>
        <p>
          <button id="deleteSection" name="deleteSection"
            onClick={() => this.handleDeleteSection(shape, section)}>Delete</button>
        </p>
      </div>
    );
  }

  renderParams() {
    const activePlaceable = this.props.shape.findPlaceable(this.props.activePlaceableId);
    if (activePlaceable) {
      if (activePlaceable instanceof Prism) {
        return this.renderPrismParams(this.props.shape, activePlaceable);
      } else if (activePlaceable instanceof Section) {
        return this.renderSectionParams(this.props.shape, activePlaceable);
      }
    } else {
      return this.renderShapeParams(this.props.config, this.props.shape);
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
