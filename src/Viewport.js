import React, { Component } from 'react';
import { mat4 } from 'gl-matrix';
import './App.css';

class Viewport extends Component {
  componentDidMount() {
    window.Filament.init(['triangle.filamat'], () => {
      this.init();
    });
  }

  init() {
    this.canvas = this.filament;
    const engine = this.engine = window.Filament.Engine.create(this.canvas);
    this.scene = engine.createScene();
    this.triangle = window.Filament.EntityManager.get()
      .create();
    this.scene.addEntity(this.triangle);
    const TRIANGLE_POSITIONS = new Float32Array([
      1, 0,
      Math.cos(Math.PI * 2 / 3), Math.sin(Math.PI * 2 / 3),
      Math.cos(Math.PI * 4 / 3), Math.sin(Math.PI * 4 / 3),
    ]);
    const TRIANGLE_COLORS = new Uint32Array([0xffff0000, 0xff00ff00, 0xff0000ff]);
    const VertexAttribute = window.Filament.VertexAttribute;
    const AttributeType = window.Filament.VertexBuffer$AttributeType;
    this.vb = window.Filament.VertexBuffer.Builder()
      .vertexCount(3)
      .bufferCount(2)
      .attribute(VertexAttribute.POSITION, 0, AttributeType.FLOAT2, 0, 8)
      .attribute(VertexAttribute.COLOR, 1, AttributeType.UBYTE4, 0, 4)
      .normalized(VertexAttribute.COLOR)
      .build(engine);
    this.vb.setBufferAt(engine, 0, TRIANGLE_POSITIONS);
    this.vb.setBufferAt(engine, 1, TRIANGLE_COLORS);
    this.ib = window.Filament.IndexBuffer.Builder()
      .indexCount(3)
      .bufferType(window.Filament.IndexBuffer$IndexType.USHORT)
      .build(engine);
    this.ib.setBuffer(engine, new Uint16Array([0, 1, 2]));
    const mat = engine.createMaterial('triangle.filamat');
    const matinst = mat.getDefaultInstance();
    window.Filament.RenderableManager.Builder(1)
      .boundingBox({
        center: [-1, -1, -1],
        halfExtent: [1, 1, 1]
      })
      .material(0, matinst)
      .geometry(0, window.Filament.RenderableManager$PrimitiveType.TRIANGLES, this.vb, this.ib)
      .build(engine, this.triangle);
    this.swapChain = engine.createSwapChain();
    this.renderer = engine.createRenderer();
    this.camera = engine.createCamera();
    this.view = engine.createView();
    this.view.setCamera(this.camera);
    this.view.setScene(this.scene);
    // Set up a blue-green background:
    this.renderer.setClearOptions({
      clearColor: [0.0, 0.1, 0.2, 1.0],
      clear: true
    });
    // Adjust the initial viewport:
    this.resize();
    this.renderFrame = this.renderFrame.bind(this);
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    window.requestAnimationFrame(this.renderFrame);
  }

  renderFrame() {
    // Rotate the triangle.
    const radians = Date.now() / 1000;
    const transform = mat4.fromRotation(mat4.create(), radians, [0, 0, 1]);
    const tcm = this.engine.getTransformManager();
    const inst = tcm.getInstance(this.triangle);
    tcm.setTransform(inst, transform);
    inst.delete();
    // Render the frame.
    this.renderer.render(this.swapChain, this.view);
    window.requestAnimationFrame(this.renderFrame);
  }

  resize() {
    const dpr = window.devicePixelRatio;
    const width = this.canvas.width = 0.8 * window.innerWidth * dpr;
    const height = this.canvas.height = window.innerHeight * dpr;
    this.view.setViewport([0, 0, width, height]);
    const aspect = width / height;
    const Projection = window.Filament.Camera$Projection;
    this.camera.setProjection(Projection.ORTHO, -aspect, aspect, -1, 1, 0, 1);
  }

  render() {
    return <canvas className="Viewport" ref={ref => (this.filament = ref)} />
  }
}

export default Viewport;
