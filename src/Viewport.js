import React, { Component } from 'react';
import { vec3, vec4, quat, mat4 } from 'gl-matrix';
import ShapeView from './ShapeView';
import './App.css';
import tinycolor from 'tinycolor2';
import { intersectSphere, rayToPointDistance } from './Collision';

const COLOR_MASK_COUNT = 8;
const POINTER_DRAG_THRESHOLD = 3;
const POINTER_DRAG_THRESHOLD_SQUARED = POINTER_DRAG_THRESHOLD * POINTER_DRAG_THRESHOLD;
const POINTER_DRAG_FACTOR = 0.01;
const ELEVATION_LIMIT = 0.48 * Math.PI;
const CAMERA_ANIMATION_TIME = 0.3;
const DEFAULT_ELEVATION = -Math.PI / 10;
const DEFAULT_HEADING = -Math.PI / 40;

const HIGHLIGHT_PRIMARY_COLOR = "#ffff40";
const HIGHLIGHT_ALTERNATE_COLOR = "#b266ff";
const HIGHLIGHT_OPAQUE_BLEND = 0.8;
const HIGHLIGHT_START_BLEND = 0.3;
const HIGHLIGHT_RANGE_BLEND = HIGHLIGHT_OPAQUE_BLEND - HIGHLIGHT_START_BLEND;
const HIGHLIGHT_ANIMATION_TIME = 2;

const KNOB_RADIUS = 0.2;
const KNOB_IDLE_ALPHA = 0.3;
const KNOB_ACTIVE_ALPHA = 1.0;

const iblUrl = "res/environment_ibl.ktx";
const skyboxUrl = "res/environment_skybox.ktx";
const prismMeshUrl = "res/prism.filamesh";
const prismMaterialUrl = "res/prism.filamat";
const ghostMaterialUrl = "res/ghost.filamat";
const knobMeshUrl = "res/knob.filamesh";
const knobMaterialUrl = "res/knob.filamat";
const getPrismTextureUrl = ((maskIndex) => "res/prism" + maskIndex + ".png");
const colorToFloat3 = ((color) => {
  const rgb = tinycolor(color).toRgb();
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
});

const IDENTITY_QUAT = quat.create();
const auxMat4 = mat4.create();

class Viewport extends Component {
  componentDidMount() {
    let assets = [iblUrl, skyboxUrl, prismMeshUrl, prismMaterialUrl,
        ghostMaterialUrl, knobMeshUrl, knobMaterialUrl];
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
    this.selectPrism(this.props.activePrism, true, false);
  }

  init() {
    this.elevation = DEFAULT_ELEVATION;
    this.heading = DEFAULT_HEADING;
    this.distance = 10;
    this.activePrismView = null;
    this.availableJunctions = null;
    this.focalPoint = vec3.create();
    this.targetPosition = vec3.create();
    this.lastPosition = vec3.create();
    this.highlightColor = [0, 0, 0, 0];
    this.animationTimer = 0;
    this.highlightTimer = 0;

    this.pressing = false;
    this.dragging = false;
    this.pickedPrism = null;
    this.pickedJunction = null;
    this.activeJunctionPrism = null;
    this.pointerX = 0;
    this.pointerY = 0;

    this.canvas = this.filament;
    const engine = this.engine = window.Filament.Engine.create(this.canvas);
    this.camera = engine.createCamera(window.Filament.EntityManager.get().create());
    this.scene = engine.createScene();

    const indirectLight = engine.createIblFromKtx(iblUrl);
    indirectLight.setIntensity(50000);
    this.scene.setIndirectLight(indirectLight);

    const skybox = engine.createSkyFromKtx(skyboxUrl);
    this.scene.setSkybox(skybox);

    this.prismSourceMaterial = engine.createMaterial(prismMaterialUrl);
    this.prismSourceMesh = engine.loadFilamesh(prismMeshUrl);
    this.prismBoundingBox = this.getBoundingBox(this.prismSourceMesh.renderable);

    const ghostMaterial = engine.createMaterial(ghostMaterialUrl);
    this.ghostRenderable = this.buildPrismRenderable(ghostMaterial.getDefaultInstance());

    this.knobSourceMaterial = engine.createMaterial(knobMaterialUrl);
    this.knobSourceMesh = engine.loadFilamesh(knobMeshUrl);
    this.knobBoundingBox = this.getBoundingBox(this.knobSourceMesh.renderable);
    this.knobRenderables = [];

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

  buildPrismRenderable(material) {
    const renderable = window.Filament.EntityManager.get()
      .create();
    window.Filament.RenderableManager.Builder(1)
      .boundingBox(this.prismBoundingBox)
      .material(0, material)
      .geometry(0, window.Filament.RenderableManager$PrimitiveType.TRIANGLES,
          this.prismSourceMesh.vertexBuffer, this.prismSourceMesh.indexBuffer)
      .build(this.engine, renderable);
    return renderable;
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
    return this.buildPrismRenderable(prismMaterial);
  }

  createKnobRenderable() {
    const material = this.knobSourceMaterial.createInstance();
    material.setFloatParameter("alpha", 0);

    const renderable = window.Filament.EntityManager.get()
      .create();
    window.Filament.RenderableManager.Builder(1)
      .boundingBox(this.knobBoundingBox)
      .material(0, material)
      .geometry(0, window.Filament.RenderableManager$PrimitiveType.TRIANGLES,
          this.knobSourceMesh.vertexBuffer, this.knobSourceMesh.indexBuffer)
      .build(this.engine, renderable);
    return renderable;
  }

  getBoundingBox(renderable) {
    const renderableManager = this.engine.getRenderableManager();
    const renderableInstance = renderableManager.getInstance(renderable);
    const boundingBox = renderableManager.getAxisAlignedBoundingBox(renderableInstance);
    renderableInstance.delete();
    return boundingBox;
  }

  setRenderableTransform(renderable, position, orientation) {
    const transformManager = this.engine.getTransformManager();
    const transformInstance = transformManager.getInstance(renderable);
    const transform = mat4.fromRotationTranslation(auxMat4, orientation, position);
    transformManager.setTransform(transformInstance, transform);
    transformInstance.delete();
  }

  getRenderableMaterial(renderable) {
    const renderableManager = this.engine.getRenderableManager();
    const renderableInstance = renderableManager.getInstance(renderable);
    const material = renderableManager.getMaterialInstanceAt(renderableInstance, 0);
    renderableInstance.delete();
    return material;
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

    const ray = this.getCastingRay(e.clientX, e.clientY);
    const prismIntersection = this.shapeView.shape.intersect(ray);
    let junctionIntersection;
    if (this.props.activePrism) {
      junctionIntersection = this.intersectJunctions(ray);
    }
    if (junctionIntersection && (!prismIntersection
        || (junctionIntersection.hitDistance < prismIntersection.hitDistance))) {
      this.pickedPrism = null;
      this.pickedJunction = junctionIntersection.hitJunction;
      this.activatePrismKnob(this.availableJunctions, this.pickedJunction);
    } else {
      this.pickedPrism = (prismIntersection) ? prismIntersection.hitPrism : null;
      this.pickedJunction = null;
    }
    this.activeJunctionPrism = null;

    this.pressing = true;
    this.dragging = false;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
  }

  handlePointerUp(e) {
    if (!this.isPrimaryPointer(e)) {
      return;
    }
    if (this.activeJunctionPrism) {
      this.addPrism(this.activeJunctionPrism);
    } else if (!this.dragging && !this.pickedJunction) {
      this.selectPrism(this.pickedPrism, true, true);
    }
    this.pressing = false;
    this.hideGhostPrism();
    if (this.availableJunctions) {
      this.showPrismKnobs(this.availableJunctions);
    }
  }

  handlePointerMove(e) {
    if (!this.isPrimaryPointer(e) || !this.pressing) {
      return;
    }
    const dx = e.clientX - this.pointerX;
    const dy = e.clientY - this.pointerY;
    if (this.dragging) {
      if (this.pickedJunction) {
        const ray = this.getCastingRay(e.clientX, e.clientY);
        const nearestJunctionPrism = this.pickNearestJunctionPrism(ray, this.pickedJunction);
        if (nearestJunctionPrism !== this.activeJunctionPrism) {
          this.showGhostPrism(nearestJunctionPrism.worldPosition, nearestJunctionPrism.worldOrientation);
          this.activeJunctionPrism = nearestJunctionPrism;
        }
      } else {
        this.elevation = Math.min(Math.max(
            this.elevation - dy * POINTER_DRAG_FACTOR, -ELEVATION_LIMIT), ELEVATION_LIMIT);
        this.heading = (this.heading - dx * POINTER_DRAG_FACTOR) % (2 * Math.PI);
        this.updateCamera();
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
      }
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

  intersectJunctions(ray) {
    if (!this.availableJunctions) {
      return;
    }
    let hitJunction;
    let hitDistance;
    for (let i = 0; i < this.availableJunctions.length; i++) {
      const junction = this.availableJunctions[i];
      const junctionHitDistance = intersectSphere(ray, junction.pivot, KNOB_RADIUS);
      if (junctionHitDistance !== undefined) {
        if ((hitDistance === undefined) || (junctionHitDistance < hitDistance)) {
          hitJunction = junction;
          hitDistance = junctionHitDistance;
        }
      }
    }
    if (!hitJunction) {
      return;
    }
    return {
      hitJunction: hitJunction,
      hitDistance: hitDistance
    };
  }

  pickNearestJunctionPrism(ray, junction) {
    let junctionPrism = null;
    let rayDistance;
    for (let i = 0; i < junction.prisms.length; i++) {
      const prism = junction.prisms[i];
      const prismRayDistance = rayToPointDistance(ray, prism.worldPosition);
      if ((rayDistance === undefined) || (prismRayDistance < rayDistance)) {
        junctionPrism = prism;
        rayDistance = prismRayDistance;
      }
    }
    return junctionPrism;
  }

  selectPrism(prism, animate, notify) {
    if (this.activePrismView) {
      this.setHighlightIntensity(this.activePrismView, 0);
    }
    if (prism) {
      this.activePrismView = this.shapeView.findPrismView(prism.id);
    } else {
      this.activePrismView = null;
    }
    if (this.activePrismView) {
      this.updateHighlightColor(prism);
      this.availableJunctions = this.shapeView.shape.getAvailableJunctions(prism);
      this.showPrismKnobs(this.availableJunctions);
    } else {
      this.availableJunctions = null;
      this.hidePrismKnobs();
    }
    if (animate) {
      vec3.copy(this.lastPosition, this.targetPosition);
      if (this.activePrismView) {
        vec3.copy(this.targetPosition, prism.worldPosition);
      } else {
        vec3.copy(this.targetPosition, this.shapeView.shape.aabb.center);
      }
      this.animationTimer = 0;
      this.highlightTimer = 0;
    }
    if (notify) {
      this.props.onActivePrismChange(prism);
    }
  }

  addPrism(prism) {
    const shape = this.shapeView.shape.clone();
    prism.id = ++shape.lastPrismId;
    shape.prisms.push(prism);
    shape.applyTransform();
    this.selectPrism(prism, false, true);
    this.props.onShapeChange(shape);
  }

  updateHighlightColor(prism) {
    const primaryReadability = tinycolor.readability(prism.backgroundColor, HIGHLIGHT_PRIMARY_COLOR);
    const alternateReadability = tinycolor.readability(prism.backgroundColor, HIGHLIGHT_ALTERNATE_COLOR);
    const colorStr = (primaryReadability > alternateReadability)
        ? HIGHLIGHT_PRIMARY_COLOR : HIGHLIGHT_ALTERNATE_COLOR;
    const rgb = tinycolor(colorStr).toRgb();
    this.highlightColor[0] = rgb.r / 255;
    this.highlightColor[1] = rgb.g / 255;
    this.highlightColor[2] = rgb.b / 255;
  }

  setHighlightIntensity(prismView, intensity) {
    const prismMaterial = this.getRenderableMaterial(prismView.renderable);
    this.highlightColor[3] = intensity;
    prismMaterial.setColor4Parameter("highlightColor", window.Filament.RgbaType.sRGB, this.highlightColor);
  }

  showGhostPrism(position, orientation) {
    this.setRenderableTransform(this.ghostRenderable, position, orientation);
    this.scene.addEntity(this.ghostRenderable);
  }

  hideGhostPrism() {
    this.scene.remove(this.ghostRenderable);
  }

  showPrismKnobs(junctions) {
    while (this.knobRenderables.length < junctions.length) {
      this.knobRenderables.push(this.createKnobRenderable());
    }
    for (let i = 0; i < junctions.length; i++) {
      const junction = junctions[i];
      const knobRenderable = this.knobRenderables[i];
      const knobMaterial = this.getRenderableMaterial(knobRenderable);
      knobMaterial.setFloatParameter("alpha", KNOB_IDLE_ALPHA);
      this.setRenderableTransform(knobRenderable, junction.pivot, IDENTITY_QUAT);
      this.scene.addEntity(knobRenderable);
    }
    for (let i = junctions.length; i < this.knobRenderables.length; i++) {
      const knobRenderable = this.knobRenderables[i];
      this.scene.remove(knobRenderable)
    }
  }

  activatePrismKnob(junctions, activeJunction) {
    const junctionIndex = junctions.indexOf(activeJunction);
    const knobRenderable = this.knobRenderables[junctionIndex];
    const knobMaterial = this.getRenderableMaterial(knobRenderable);
    knobMaterial.setFloatParameter("alpha", KNOB_ACTIVE_ALPHA);
    this.hidePrismKnobs();
    this.scene.addEntity(knobRenderable);
  }

  hidePrismKnobs() {
    this.knobRenderables.forEach(knobRenderable => this.scene.remove(knobRenderable));
  }

  render() {
    return <canvas className="Viewport" ref={ref => (this.filament = ref)} />
  }
}

export default Viewport;
export { COLOR_MASK_COUNT };
