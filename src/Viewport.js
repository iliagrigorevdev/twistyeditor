import React, { Component } from 'react';
import { vec3, vec4 } from 'gl-matrix';
import ShapeView from './ShapeView';
import './App.css';
import tinycolor from 'tinycolor2';

const COLOR_MASK_COUNT = 8;
const POINTER_DRAG_THRESHOLD = 3;
const POINTER_DRAG_THRESHOLD_SQUARED = POINTER_DRAG_THRESHOLD * POINTER_DRAG_THRESHOLD;
const POINTER_DRAG_FACTOR = 0.01;
const ELEVATION_LIMIT = 0.48 * Math.PI;
const CAMERA_ANIMATION_TIME = 0.3;

const HIGHLIGHT_COLOR = [ 1, 1, 0.25, 0 ];
const HIGHLIGHT_OPAQUE_BLEND = 0.8;
const HIGHLIGHT_START_BLEND = 0.3;
const HIGHLIGHT_RANGE_BLEND = HIGHLIGHT_OPAQUE_BLEND - HIGHLIGHT_START_BLEND;
const HIGHLIGHT_ANIMATION_TIME = 2;

const iblUrl = "res/environment_ibl.ktx";
const skyboxUrl = "res/environment_skybox.ktx";
const prismMeshUrl = "res/prism.filamesh";
const prismMaterialUrl = "res/prism.filamat";
const getPrismTextureUrl = ((maskIndex) => "res/prism" + maskIndex + ".png");
const colorToFloat3 = ((color) => {
  const rgb = tinycolor(color).toRgb();
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
});

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
    this.activePrismView = null;
    this.selectPrism(this.props.activePrism, false);
  }

  init() {
    this.elevation = 0;
    this.heading = 0;
    this.distance = 10;
    this.activePrismView = null;
    this.focalPoint = vec3.create();
    this.targetPosition = vec3.create();
    this.lastPosition = vec3.create();
    this.animationTimer = 0;
    this.highlightTimer = 0;

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
    const prismMaterial = this.prismSourceMaterial.createInstance();
    prismMaterial.setTextureParameter("colorMask",
        this.prismTextures[validColorMask], this.prismTextureSampler);
    prismMaterial.setColor3Parameter("backgroundColor",
        window.Filament.RgbType.sRGB, colorToFloat3(backgroundColor));
    prismMaterial.setColor3Parameter("foregroundColor",
        window.Filament.RgbType.sRGB, colorToFloat3(foregroundColor));
    prismMaterial.setColor4Parameter("highlightColor",
        window.Filament.RgbaType.sRGB, [0, 0, 0, 0]);

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
    const eye = [this.focalPoint[0], this.focalPoint[1], this.focalPoint[2] + this.distance];
    const up = [0, 1, 0];
    vec3.rotateX(eye, eye, this.focalPoint, this.elevation);
    vec3.rotateY(eye, eye, this.focalPoint, this.heading);
    this.camera.lookAt(eye, this.focalPoint, up);
  }

  renderFrame(timestamp) {
    if (this.lastTime === undefined) {
      this.lastTime = timestamp;
    }
    const deltaTime = 1e-3 * (timestamp - this.lastTime);
    this.lastTime = timestamp;

    if (this.animationTimer < CAMERA_ANIMATION_TIME) {
      this.animationTimer += deltaTime;
      const t = Math.min(this.animationTimer / CAMERA_ANIMATION_TIME, 1);
      const k = t * t * (3 - 2 * t);
      vec3.lerp(this.focalPoint, this.lastPosition, this.targetPosition, k);
      this.updateCamera();
    }

    if (this.activePrismView) {
      this.highlightTimer += deltaTime;
      if (this.highlightTimer > HIGHLIGHT_ANIMATION_TIME) {
        this.highlightTimer %= HIGHLIGHT_ANIMATION_TIME;
      }
      const t = 2 * Math.abs(this.highlightTimer / HIGHLIGHT_ANIMATION_TIME - 0.5);
      const k = t * t * (3 - 2 * t);
      const highlightIntensity = HIGHLIGHT_START_BLEND + k * HIGHLIGHT_RANGE_BLEND;
      this.setHighlightIntensity(this.activePrismView, highlightIntensity);
    }

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
    return (e.pointerType !== "touch") || e.isPrimary;
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
    if (!this.dragging) {
      const ray = this.getCastingRay(e.clientX, e.clientY);
      const intersection = this.shapeView.shape.intersect(ray);
      const pickedPrism = (intersection) ? intersection.hitPrism : null;
      this.selectPrism(pickedPrism, true);
      this.props.onActivePrismChange(pickedPrism);
    }
    this.pressing = false;
  }

  handlePointerMove(e) {
    if (!this.isPrimaryPointer(e) || !this.pressing) {
      return;
    }
    const dx = e.clientX - this.pointerX;
    const dy = e.clientY - this.pointerY;
    if (this.dragging) {
      this.elevation = Math.min(Math.max(
          this.elevation - dy * POINTER_DRAG_FACTOR, -ELEVATION_LIMIT), ELEVATION_LIMIT);
      this.heading = (this.heading - dx * POINTER_DRAG_FACTOR) % (2 * Math.PI);
      this.updateCamera();
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
    } else {
      const dragDistanceSquared = dx * dx + dy * dy;
      if (dragDistanceSquared >= POINTER_DRAG_THRESHOLD_SQUARED) {
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        this.dragging = true;
      }
    }
  }

  getCastingRay(clientX, clientY) {
    const dpr = window.devicePixelRatio;
    const x = (2 * clientX * dpr) / this.canvas.width - 1;
    const y = 1 - (2 * clientY * dpr) / this.canvas.height;
    const rayVec = vec4.fromValues(x, y, -1, 1);
    vec4.transformMat4(rayVec, rayVec, window.Filament.Camera.inverseProjection(
        this.camera.getProjectionMatrix()));
    rayVec[2] = -1;
    rayVec[3] = 0;
    vec4.transformMat4(rayVec, rayVec, this.camera.getModelMatrix());
    const direction = vec3.fromValues(rayVec[0], rayVec[1], rayVec[2]);
    vec3.normalize(direction, direction);
    return {
      origin: this.camera.getPosition(),
      direction: direction
    };
  }

  selectPrism(prism, animate) {
    vec3.copy(this.lastPosition, this.targetPosition);
    if (this.activePrismView) {
      this.setHighlightIntensity(this.activePrismView, 0);
    }
    if (prism) {
      this.activePrismView = this.shapeView.findPrismView(prism.id);
      vec3.copy(this.targetPosition, prism.worldPosition);
    } else {
      this.activePrismView = null;
      vec3.copy(this.targetPosition, this.shapeView.shape.aabb.center);
    }
    if (animate) {
      this.animationTimer = 0;
      this.highlightTimer = 0;
    } else {
      this.highlightTimer = HIGHLIGHT_ANIMATION_TIME / 2;
      vec3.copy(this.lastPosition, this.targetPosition);
      vec3.copy(this.focalPoint, this.targetPosition);
      this.updateCamera();
    }
  }

  setHighlightIntensity(prismView, intensity) {
    const renderableManager = this.engine.getRenderableManager();
    const prismRenderableInstance = renderableManager.getInstance(prismView.renderable);
    const prismMaterial = renderableManager.getMaterialInstanceAt(prismRenderableInstance, 0);
    HIGHLIGHT_COLOR[3] = intensity;
    prismMaterial.setColor4Parameter("highlightColor", window.Filament.RgbaType.sRGB, HIGHLIGHT_COLOR);
    prismRenderableInstance.delete();
  }

  render() {
    return <canvas className="Viewport" ref={ref => (this.filament = ref)} />
  }
}

export default Viewport;
export { COLOR_MASK_COUNT };
