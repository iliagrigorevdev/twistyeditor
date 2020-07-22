import React, { Component } from 'react';
import './App.css';
import { COLOR_MASK_COUNT } from './Viewport';
import ColorPicker from './ColorPicker';

class Toolbar extends Component {
  modifyShape(prevShape, label, shapeModifier) {
    const shape = prevShape.clone();
    shapeModifier(shape);
    shape.applyTransform();
    this.props.onShapeChange(shape, label);
  }

  modifyPrism(prevShape, prevPrism, label, prismModifier) {
    this.modifyShape(prevShape, label, (shape) => {
      const prism = shape.findPrism(prevPrism.id);
      prismModifier(prism);
    });
  }

  handleRollChange(prevShape, roll) {
    this.modifyShape(prevShape, "Roll changed",
        (shape) => shape.roll = parseFloat(roll) || 0);
  }

  handlePitchChange(prevShape, pitch) {
    this.modifyShape(prevShape, "Pitch changed",
        (shape) => shape.pitch = parseFloat(pitch) || 0);
  }

  handleYawChange(prevShape, yaw) {
    this.modifyShape(prevShape, "Yaw changed",
        (shape) => shape.yaw = parseFloat(yaw) || 0);
  }

  handleColorMaskChange(prevShape, prevPrism, colorMask) {
    this.modifyPrism(prevShape, prevPrism, "Mask changed",
        (prism) => prism.colorMask = parseInt(colorMask) || 0);
  }

  handleBackgroundColorChange(prevShape, prevPrism, color) {
    this.modifyPrism(prevShape, prevPrism, "Background changed",
        (prism) => prism.backgroundColor = color);
  }

  handleForegroundColorChange(prevShape, prevPrism, color) {
    this.modifyPrism(prevShape, prevPrism, "Foreground changed",
        (prism) => prism.foregroundColor = color);
  }

  handleSwapColors(prevShape, prevPrism) {
    this.modifyPrism(prevShape, prevPrism, "Colors swapped",
        (prism) => {
          prism.foregroundColor = prevPrism.backgroundColor;
          prism.backgroundColor = prevPrism.foregroundColor;
        });
  }

  handleHistoryChange(index) {
    this.props.onHistoryChange(parseInt(index));
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
      </div>
    );
  }

  renderParams() {
    if (this.props.activePrism) {
      return this.renderPrismParams(this.props.shape, this.props.activePrism);
    } else {
      return this.renderShapeParams(this.props.shape);
    }
  }

  renderHistory() {
    return (
      <div className="Group">
        <h3>History</h3>
        <select name="history" id="history" size="5" value={this.props.historyIndex}
            onChange={e => this.handleHistoryChange(e.target.value)}>
          {this.props.historyEntries.map((entry, index) => {
            return <option value={index} key={index}>
              {entry.label}
            </option>
          })}
        </select>
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
