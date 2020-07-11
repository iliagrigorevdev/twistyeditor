import React, { Component } from 'react';
import './App.css';

class Toolbar extends Component {
  handleRollChange(roll) {
    const shape = this.props.shape.clone();
    shape.roll = parseFloat(roll) || 0;
    shape.applyTransform();
    this.props.onShapeChange(shape);
  }

  handlePitchChange(pitch) {
    const shape = this.props.shape.clone();
    shape.pitch = parseFloat(pitch) || 0;
    shape.applyTransform();
    this.props.onShapeChange(shape);
  }

  render() {
    return (
      <div className="Toolbar">
        <p>
          <label htmlFor="roll">Roll : </label>
          <input type="number" id="roll" name="roll" min="-180" max="180"
            step="15" value={this.props.shape.roll} onChange={e => this.handleRollChange(e.target.value)} />
        </p>
        <p>
          <label htmlFor="pitch">Pitch : </label>
          <input type="number" id="pitch" name="pitch" min="-180" max="180"
            step="15" value={this.props.shape.pitch} onChange={e => this.handlePitchChange(e.target.value)} />
        </p>
      </div>
    );
  }
}

export default Toolbar;
