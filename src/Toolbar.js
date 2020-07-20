import React, { Component } from 'react';
import './App.css';
import { COLOR_MASK_COUNT } from './Viewport';
import ColorPicker from './ColorPicker';

class Toolbar extends Component {
  modifyShape(prevShape, shapeModifier) {
    const shape = prevShape.clone();
    shapeModifier(shape);
    shape.applyTransform();
    this.props.onShapeChange(shape);
  }

  modifyPrism(prevShape, prevPrism, prismModifier) {
    this.modifyShape(prevShape, (shape) => {
      const prism = shape.findPrism(prevPrism.id);
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
    this.modifyPrism(prevShape, prevPrism, (prism) => prism.colorMask = parseInt(colorMask) || 0);
  }

  handleBackgroundColorChange(prevShape, prevPrism, color) {
    this.modifyPrism(prevShape, prevPrism, (prism) => prism.backgroundColor = color);
  }

  handleForegroundColorChange(prevShape, prevPrism, color) {
    this.modifyPrism(prevShape, prevPrism, (prism) => prism.foregroundColor = color);
  }

  handleSwapColors(prevShape, prevPrism) {
    this.modifyPrism(prevShape, prevPrism, (prism) => {
      prism.foregroundColor = prevPrism.backgroundColor;
      prism.backgroundColor = prevPrism.foregroundColor;
    });
  }

  renderShapeParams(shape) {
    return (
      <div className="Params">
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
      <div className="Params">
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

  render() {
    return (
      <div className="Toolbar">
        {this.renderParams()}
      </div>
    );
  }
}

export default Toolbar;
