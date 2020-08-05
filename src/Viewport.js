import React, { Component } from 'react';
import { vec3, vec4, quat, mat3, mat4 } from 'gl-matrix';
import ShapeView from './ShapeView';
import './App.css';
import tinycolor from 'tinycolor2';
import { intersectSphere, rayToPointDistance } from './Collision';
import { Modes } from './App';
import Simulation from './Simulation';

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

const COLOR_MASK_COUNT = 8;
const POINTER_DRAG_THRESHOLD = 3;
const POINTER_DRAG_THRESHOLD_SQUARED = POINTER_DRAG_THRESHOLD * POINTER_DRAG_THRESHOLD;
const POINTER_DRAG_FACTOR = 0.01;
const ELEVATION_LIMIT = 0.48 * Math.PI;
const CAMERA_ANIMATION_TIME = 0.3;
const DEFAULT_ELEVATION = -Math.PI / 10;
const DEFAULT_HEADING = -Math.PI / 40;

const CAMERA_FOCAL_LENGTH_MIN = 15;
const CAMERA_FOCAL_LENGTH_MAX = 50;
const CAMERA_SENSOR_HEIGHT = 32;
const CAMERA_NEAR = 1;
const CAMERA_FAR = 300;
const CAMERA_DISTANCE = 10;
const SHAPE_FIT_SCALE = 1.1;
function fovYToFocalLength(fovY) {
  return 0.5 * CAMERA_SENSOR_HEIGHT / Math.tan(0.5 * fovY * DEGREES_TO_RADIANS);
}
function focalLengthToFovY(fl) {
  return 2 * Math.atan(0.5 * CAMERA_SENSOR_HEIGHT / fl) * RADIANS_TO_DEGREES;
}

const ENVIRONMENT_COLOR = "#e6e6e6ff";
const GROUND_HALF_SIZE = 1000;
const GROUND_GRID_SIZE = 4;

const HIGHLIGHT_PRIMARY_COLOR = "#ffff40";
const HIGHLIGHT_ALTERNATE_COLOR = "#b266ff";
const HIGHLIGHT_OPAQUE_BLEND = 0.8;
const HIGHLIGHT_START_BLEND = 0.3;
const HIGHLIGHT_RANGE_BLEND = HIGHLIGHT_OPAQUE_BLEND - HIGHLIGHT_START_BLEND;
const HIGHLIGHT_ANIMATION_TIME = 2;

const KNOB_RADIUS = 0.4;
const KNOB_IDLE_ALPHA = 0.3;
const KNOB_ACTIVE_ALPHA = 1.0;

const iblUrl = "res/environment_ibl.ktx";
const prismMeshUrl = "res/prism.filamesh";
const prismMaterialUrl = "res/prism.filamat";
const ghostMaterialUrl = "res/ghost.filamat";
const knobMeshUrl = "res/knob.filamesh";
const knobMaterialUrl = "res/knob.filamat";
const groundMaterialUrl = "res/ground.filamat";
const groundTextureUrl = "res/ground.png";
const getPrismTextureUrl = ((maskIndex) => "res/prism" + maskIndex + ".png");
const colorToFloat3 = ((color) => {
  const rgb = tinycolor(color).toRgb();
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
});
const colorToFloat4 = ((color) => {
  const rgb = tinycolor(color).toRgb();
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a / 255];
});

const IDENTITY_QUAT = quat.create();

class Viewport extends Component {
  constructor(props) {
    super(props);

    this.auxMat4 = mat4.create();
  }

  componentDidMount() {
    let assets = [iblUrl, prismMeshUrl, prismMaterialUrl,
        ghostMaterialUrl, knobMeshUrl, knobMaterialUrl,
        groundMaterialUrl, groundTextureUrl];
    for (let i = 0; i < COLOR_MASK_COUNT; i++) {
      assets.push(getPrismTextureUrl(i));
    }
    window.Filament.init(assets, () => {
      this.init();
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.mode !== this.props.mode) {
      this.handleModeChange();
    } else if (prevProps.shape !== this.props.shape) {
      this.handleShapeChange();
    }
  }

  handleModeChange() {
    this.refreshShapeView();
    if (this.props.mode === Modes.SIMULATION) {
      this.simulation = new Simulation(this.props.shape);
    } else if (this.simulation) {
      this.simulation = null;
    }
  }

  handleShapeChange() {
    if (this.props.mode === Modes.EDIT) {
      this.refreshShapeView();
    }
  }

  refreshShapeView() {
    if (!this.engine) {
      return;
    }
    if (this.shapeView) {
      this.shapeView.destroy(this);
    }
    this.shapeView = new ShapeView(this.props.shape, this);
    this.shapeView.addToScene(this);
    this.activePrismView = null;
    const activePrism = (this.props.mode === Modes.EDIT ? this.props.activePrism : null);
    this.selectPrism(activePrism, true, false);
  }

  init() {
    this.elevation = DEFAULT_ELEVATION;
    this.heading = DEFAULT_HEADING;
    this.activePrismView = null;
    this.availableJunctions = null;
    this.focalLengthMin = CAMERA_FOCAL_LENGTH_MIN;
    this.focalLengthMax = CAMERA_FOCAL_LENGTH_MAX;
    this.cameraZoom = 1;
    this.targetZoom = this.cameraZoom;
    this.lastZoom = this.cameraZoom;
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

    const ground = this.createGround(GROUND_HALF_SIZE, GROUND_GRID_SIZE);
    this.scene.addEntity(ground);

    this.handleShapeChange();

    this.swapChain = engine.createSwapChain();
    this.renderer = engine.createRenderer();
    this.view = engine.createView();
    this.view.setCamera(this.camera);
    this.view.setScene(this.scene);
    this.renderer.setClearOptions({ clearColor: colorToFloat4(ENVIRONMENT_COLOR), clear: true });

    this.resize();
    this.renderFrame = this.renderFrame.bind(this);
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    window.requestAnimationFrame(this.renderFrame);
    this.canvas.addEventListener("pointerdown", (e) => this.handlePointerDown(e));
    this.canvas.addEventListener("pointerup", (e) => this.handlePointerUp(e));
    this.canvas.addEventListener("pointermove", (e) => this.handlePointerMove(e));
  }

  createGround(halfSize, gridSize) {
    const vb = window.Filament.VertexBuffer.Builder()
      .vertexCount(4)
      .bufferCount(2)
      .attribute(window.Filament.VertexAttribute.POSITION, 0,
          window.Filament.VertexBuffer$AttributeType.FLOAT3, 0, 12)
      .attribute(window.Filament.VertexAttribute.UV0, 1,
          window.Filament.VertexBuffer$AttributeType.FLOAT2, 0, 8)
      .build(this.engine);
    vb.setBufferAt(this.engine, 0, new Float32Array([
      -halfSize, 0, -halfSize,
      -halfSize, 0, halfSize,
      halfSize, 0, -halfSize,
      halfSize, 0, halfSize
    ]));
    const reps = 2 * halfSize / gridSize;
    vb.setBufferAt(this.engine, 1, new Float32Array([0, 0, 0, reps, reps, 0, reps, reps]));

    const ib = window.Filament.IndexBuffer.Builder()
      .indexCount(6)
      .bufferType(window.Filament.IndexBuffer$IndexType.USHORT)
      .build(this.engine);
    ib.setBuffer(this.engine, new Uint16Array([0, 1, 2, 2, 1, 3]));

    const material = this.engine.createMaterial(groundMaterialUrl);
    const texture = this.engine.createTextureFromPng(groundTextureUrl);
    const sampler = new window.Filament.TextureSampler(
        window.Filament.MinFilter.LINEAR_MIPMAP_LINEAR,
        window.Filament.MagFilter.LINEAR,
        window.Filament.WrapMode.REPEAT);
    const materialInstance = material.getDefaultInstance();
    materialInstance.setTextureParameter("baseColor", texture, sampler);

    const entity = window.Filament.EntityManager.get()
      .create();
    window.Filament.RenderableManager.Builder(1)
      .boundingBox({ center: [0, 0, 0], halfExtent: [halfSize, 0, halfSize] })
      .material(0, materialInstance)
      .geometry(0, window.Filament.RenderableManager$PrimitiveType.TRIANGLES, vb, ib)
      .build(this.engine, entity);
    return entity;
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

  destroyRenderable(renderable) {
    const material = this.getRenderableMaterial(renderable);
    this.engine.destroyMaterialInstance(material);
    this.engine.destroyEntity(renderable);
    const renderableManager = this.engine.getRenderableManager();
    renderableManager.destroy(renderable);
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
    const transform = mat4.fromRotationTranslation(this.auxMat4, orientation, position);
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
    const eye = [this.focalPoint[0], this.focalPoint[1], this.focalPoint[2] + CAMERA_DISTANCE];
    const up = [0, 1, 0];
    vec3.rotateX(eye, eye, this.focalPoint, this.elevation);
    vec3.rotateY(eye, eye, this.focalPoint, this.heading);
    this.camera.lookAt(eye, this.focalPoint, up);

    const focalLength = this.focalLengthMin * (1 - this.cameraZoom)
        + this.focalLengthMax * this.cameraZoom;
    const fovY = focalLengthToFovY(focalLength);
    const aspect = this.canvas.width / this.canvas.height;
    this.camera.setProjectionFov(fovY, aspect, CAMERA_NEAR, CAMERA_FAR,
        window.Filament.Camera$Fov.VERTICAL);
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
      this.cameraZoom = this.lastZoom * (1 - k) + this.targetZoom * k;
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

    if (this.props.mode === Modes.SIMULATION) {
      this.simulation.step(deltaTime);
      const transforms = this.simulation.prismWorldTransforms;
      if (transforms && (transforms.length === this.shapeView.prismViews.length)) {
        for (let i = 0; i < this.shapeView.prismViews.length; i++) {
          const prismView = this.shapeView.prismViews[i];
          const transform = transforms[i];
          this.setRenderableTransform(prismView.renderable, transform.position,
              transform.orientation);
        }
      }
    }

    this.renderer.render(this.swapChain, this.view);
    window.requestAnimationFrame(this.renderFrame);
  }

  resize() {
    const dpr = window.devicePixelRatio;
    const width = this.canvas.width = 0.8 * window.innerWidth * dpr;
    const height = this.canvas.height = window.innerHeight * dpr;
    this.view.setViewport([0, 0, width, height]);
    this.focalLengthMin = CAMERA_FOCAL_LENGTH_MIN;
    this.focalLengthMax = CAMERA_FOCAL_LENGTH_MAX;
    if (width < height) {
      const aspect = width / height;
      this.focalLengthMin *= aspect;
      this.focalLengthMax *= aspect;
    }

    this.updateCamera();
  }

  isPrimaryPointer(e) {
    return (e.pointerType !== "touch") || e.isPrimary;
  }

  handlePointerDown(e) {
    if (!this.isPrimaryPointer(e)) {
      return;
    }

    this.pickedPrism = null;
    this.pickedJunction = null;
    this.activeJunctionPrism = null;

    if (this.props.mode === Modes.EDIT) {
      const ray = this.getCastingRay(e.clientX, e.clientY);
      const prismIntersection = this.shapeView.shape.intersect(ray);
      let junctionIntersection;
      if (this.props.activePrism) {
        junctionIntersection = this.intersectJunctions(ray);
      }
      if (junctionIntersection && (!prismIntersection
          || (junctionIntersection.hitDistance < prismIntersection.hitDistance))) {
        this.pickedJunction = junctionIntersection.hitJunction;
        this.activatePrismKnob(this.availableJunctions, this.pickedJunction);
      } else {
        this.pickedPrism = (prismIntersection) ? prismIntersection.hitPrism : null;
      }
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

    if (this.props.mode === Modes.EDIT) {
      if (this.activeJunctionPrism) {
        this.addPrism(this.activeJunctionPrism);
      } else if (!this.dragging && !this.pickedJunction) {
        this.selectPrism(this.pickedPrism, true, true);
      }
      this.hideGhostPrism();
      if (this.availableJunctions) {
        this.showPrismKnobs(this.availableJunctions);
      }
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

  computeAutoZoom(shape) {
    let autoFovY = 0;
    const point = vec3.create();
    const viewRotation = mat3.fromMat4(mat3.create(), this.camera.getViewMatrix());
    const invAspect = this.canvas.height / this.canvas.width;
    for (const prism of shape.prisms) {
      for (const vertex of prism.vertices) {
        vec3.sub(point, vertex, shape.aabb.center);
        vec3.transformMat3(point, point, viewRotation);
        const widthFitFovY = 2 * Math.atan(SHAPE_FIT_SCALE * invAspect
            * Math.abs(point[0]) / (CAMERA_DISTANCE - point[2])) * RADIANS_TO_DEGREES;
        if (widthFitFovY > autoFovY) {
          autoFovY = widthFitFovY;
        }
        const heightFitFovY = 2 * Math.atan(SHAPE_FIT_SCALE * Math.abs(point[1])
            / (CAMERA_DISTANCE - point[2])) * RADIANS_TO_DEGREES;
        if (heightFitFovY > autoFovY) {
          autoFovY = heightFitFovY;
        }
      }
    }
    if (autoFovY > 0) {
      const autoFocalLength = fovYToFocalLength(autoFovY);
      const autoZoom = (autoFocalLength - this.focalLengthMin)
          / (this.focalLengthMax - this.focalLengthMin);
      return Math.min(Math.max(autoZoom, 0), 1);
    } else {
      return 1;
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
      this.lastZoom = this.targetZoom;
      if (this.activePrismView) {
        vec3.copy(this.targetPosition, prism.worldPosition);
        this.targetZoom = 1;
      } else {
        vec3.copy(this.targetPosition, this.shapeView.shape.aabb.center);
        this.targetZoom = this.computeAutoZoom(this.shapeView.shape);
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
