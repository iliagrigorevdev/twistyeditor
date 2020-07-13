import React, { Component } from 'react';
import './App.css';
import { COLOR_MASK_COUNT } from './Viewport';

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

  handleRollChange(shape, roll) {
    this.modifyShape(shape, (shape) => shape.roll = parseFloat(roll) || 0);
  }

  handlePitchChange(shape, pitch) {
    this.modifyShape(shape, (shape) => shape.pitch = parseFloat(pitch) || 0);
  }

  handleColorMaskChange(shape, prism, colorMask) {
    this.modifyPrism(shape, prism, (prism) => prism.colorMask = parseInt(colorMask) || 0);
  }

  renderShapeParams(shape) {
    return (
      <div className="Params">
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
      </div>
    );
  }

  renderPrismParams(shape, prism) {
    return (
      <div className="Params">
        <p>
          <label htmlFor="colorMask">Mask : </label>
          <input type="number" id="colorMask" name="colorMask" min="0" max={COLOR_MASK_COUNT - 1}
            step="1" value={prism.colorMask}
            onChange={e => this.handleColorMaskChange(shape, prism, e.target.value)} />
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
