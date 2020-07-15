import React, { Component } from 'react'
import reactCSS from 'reactcss'
import { SwatchesPicker } from 'react-color'

class ColorPicker extends Component {
  constructor(props) {
    super(props);

    this.state = {
      displayColorPicker: false
    };
  }

  handleToggleColorPicker() {
    this.setState({ displayColorPicker: !this.state.displayColorPicker });
  };

  handleHideColorPicker() {
    this.setState({ displayColorPicker: false })
  };

  handleColorChange(color) {
    this.props.onChange(color.hex);
    this.handleHideColorPicker();
  };

  render() {
    const styles = reactCSS({
      'default': {
        color: {
          width: '36px',
          height: '14px',
          borderRadius: '2px',
          background: this.props.color,
        },
        swatch: {
          padding: '5px',
          background: '#fff',
          borderRadius: '1px',
          boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
          display: 'inline-block',
          cursor: 'pointer',
        },
        popover: {
          position: 'absolute',
          zIndex: '2',
        },
        cover: {
          position: 'fixed',
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px',
        },
      },
    });

    return (
      <div>
        <div style={styles.swatch} onClick={() => this.handleToggleColorPicker()}>
          <div style={styles.color} />
        </div>
        {
          this.state.displayColorPicker
          ?
          <div style={styles.popover}>
            <div style={styles.cover} onClick={() => this.handleHideColorPicker()} />
            <SwatchesPicker color={this.props.color} width="220px" height="220px"
              onChange={(color) => this.handleColorChange(color)} />
          </div>
          :
          null
        }
      </div>
    );
  }
}

export default ColorPicker;
