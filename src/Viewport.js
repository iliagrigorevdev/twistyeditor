import React, { Component } from 'react';
import { vec3 } from 'gl-matrix';
import ShapeView from './ShapeView';
import './App.css';

const COLOR_MASK_COUNT = 8;
const POINTER_DRAG_THRESHOLD = 5;
const POINTER_DRAG_THRESHOLD_SQUARED = POINTER_DRAG_THRESHOLD * POINTER_DRAG_THRESHOLD;
const POINTER_DRAG_FACTOR = 0.01;
const ELEVATION_LIMIT = 0.48 * Math.PI;

const iblUrl = "res/environment_ibl.ktx";
const skyboxUrl = "res/environment_skybox.ktx";
const prismMeshUrl = "res/prism.filamesh";
const prismMaterialUrl = "res/prism.filamat";
const getPrismTextureUrl = ((maskIndex) => "res/prism" + maskIndex + ".png");
const convertColor = ((hex) =>
  [((hex >> 16) & 0xff) / 0xff, ((hex >> 8) & 0xff) / 0xff, (hex & 0xff) / 0xff]);

class Viewport extends Component {
  componentDidMount() {
    let assets = [iblUrl, skyboxUrl, prismMeshUrl, prismMaterialUrl];
    for (let i = 0; i < COLOR_MASK_COUNT; i++) {
      assets.push(getPrismTextureUrl(i));
    }
    window.Filament.init(assets, () => {
      this.init();
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.shape !== this.props.shape) {
      this.handleShapeChange();
    }
  }

  handleShapeChange() {
    if (!this.engine) {
      return;
    }
    if (this.shapeView) {
      this.shapeView.removeFromScene(this);
    }
    this.shapeView = new ShapeView(this.props.shape, this);
    this.shapeView.addToScene(this);
  }

  init() {
    this.elevation = 0;
    this.heading = 0;
    this.distance = 10;
    this.target = vec3.create();

    this.pressing = false;
    this.dragging = false;
    this.pointerX = 0;
    this.pointerY = 0;

    this.canvas = this.filament;
    const engine = this.engine = window.Filament.Engine.create(this.canvas);
    this.transformManager = engine.getTransformManager();
    this.camera = engine.createCamera();
    this.scene = engine.createScene();

    const indirectLight = engine.createIblFromKtx(iblUrl);
    indirectLight.setIntensity(50000);
    this.scene.setIndirectLight(indirectLight);

    const skybox = engine.createSkyFromKtx(skyboxUrl);
    this.scene.setSkybox(skybox);

    this.prismSourceMaterial = engine.createMaterial(prismMaterialUrl);
    this.prismSourceMesh = engine.loadFilamesh(prismMeshUrl);
    const renderableManager = engine.getRenderableManager();
    const prismRenderableInstance = renderableManager.getInstance(this.prismSourceMesh.renderable);
    this.prismBoundingBox = renderableManager.getAxisAlignedBoundingBox(prismRenderableInstance);
    prismRenderableInstance.delete();

    this.prismTextures = [];
    for (let i = 0; i < COLOR_MASK_COUNT; i++) {
      this.prismTextures.push(engine.createTextureFromPng(getPrismTextureUrl(i)));
    }
    this.prismTextureSampler = new window.Filament.TextureSampler(
        window.Filament.MinFilter.LINEAR_MIPMAP_LINEAR,
        window.Filament.MagFilter.LINEAR,
        window.Filament.WrapMode.CLAMP_TO_EDGE);

    this.prismMaterials = new Map();

    this.updateCamera();
    this.handleShapeChange();

    this.swapChain = engine.createSwapChain();
    this.renderer = engine.createRenderer();
    this.view = engine.createView();
    this.view.setCamera(this.camera);
    this.view.setScene(this.scene);

    this.resize();
    this.renderFrame = this.renderFrame.bind(this);
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    window.requestAnimationFrame(this.renderFrame);
    this.canvas.addEventListener("pointerdown", (e) => this.handlePointerDown(e));
    this.canvas.addEventListener("pointerup", (e) => this.handlePointerUp(e));
    this.canvas.addEventListener("pointermove", (e) => this.handlePointerMove(e));
  }

  createPrismRenderable(colorMask, backgroundColor, foregroundColor) {
    const validColorMask = (colorMask >= 0) && (colorMask < COLOR_MASK_COUNT)
        ? colorMask : 0;
    const key = validColorMask + "_" + ("000000" + backgroundColor.toString(16)).substr(-6)
        + "_" + ("000000" + foregroundColor.toString(16)).substr(-6);
    let prismMaterial = this.prismMaterials.get(key);
    if (!prismMaterial) {
      prismMaterial = this.prismSourceMaterial.createInstance();
      prismMaterial.setTextureParameter("colorMask",
          this.prismTextures[validColorMask], this.prismTextureSampler);
      prismMaterial.setColor3Parameter("backgroundColor",
          window.Filament.RgbType.sRGB, convertColor(backgroundColor));
      prismMaterial.setColor3Parameter("foregroundColor",
          window.Filament.RgbType.sRGB, convertColor(foregroundColor));
      this.prismMaterials.set(key, prismMaterial);
    }

    const renderable = window.Filament.EntityManager.get()
      .create();
    window.Filament.RenderableManager.Builder(1)
      .boundingBox(this.prismBoundingBox)
      .material(0, prismMaterial)
      .geometry(0, window.Filament.RenderableManager$PrimitiveType.TRIANGLES,
          this.prismSourceMesh.vertexBuffer, this.prismSourceMesh.indexBuffer)
      .build(this.engine, renderable);
      return renderable;
  }

  updateCamera() {
    const eye = [0, 0, this.distance];
    const up = [0, 1, 0];
    vec3.rotateX(eye, eye, this.target, this.elevation);
    vec3.rotateY(eye, eye, this.target, this.heading);
    this.camera.lookAt(eye, this.target, up);
  }

  renderFrame() {
    this.renderer.render(this.swapChain, this.view);
    window.requestAnimationFrame(this.renderFrame);
  }

  resize() {
    const dpr = window.devicePixelRatio;
    const width = this.canvas.width = 0.8 * window.innerWidth * dpr;
    const height = this.canvas.height = window.innerHeight * dpr;
    this.view.setViewport([0, 0, width, height]);

    this.camera.setProjectionFov(45.0, width / height, 1.0, 100.0,
        window.Filament.Camera$Fov.VERTICAL);
  }

  isPrimaryPointer(e) {
    return ((e.pointerType !== "touch") || e.isPrimary);
  }

  handlePointerDown(e) {
    if (!this.isPrimaryPointer(e)) {
      return;
    }
    this.pressing = true;
    this.dragging = false;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
  }

  handlePointerUp(e) {
    if (!this.isPrimaryPointer(e)) {
      return;
    }
    this.pressing = false;
  }

  handlePointerMove(e) {
    if (!this.isPrimaryPointer(e) || !this.pressing) {
      return;
    }
    const dx = e.clientX - this.pointerX;
    const dy = e.clientY - this.pointerY;
    if (!this.dragging) {
      const dragDistanceSquared = dx * dx + dy * dy;
      if (dragDistanceSquared >= POINTER_DRAG_THRESHOLD_SQUARED) {
        this.dragging = true;
      }
    }
    if (this.dragging) {
      this.elevation = Math.min(Math.max(
          this.elevation - dy * POINTER_DRAG_FACTOR, -ELEVATION_LIMIT), ELEVATION_LIMIT);
      this.heading = (this.heading - dx * POINTER_DRAG_FACTOR) % (2 * Math.PI);
      this.updateCamera();
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
    }
  }

  render() {
    return <canvas className="Viewport" ref={ref => (this.filament = ref)} />
  }
}

export default Viewport;
