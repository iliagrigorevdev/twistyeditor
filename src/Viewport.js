import React, { Component } from 'react';
import { vec3, vec4, quat, mat3, mat4 } from 'gl-matrix';
import ShapeView from './ShapeView';
import './App.css';
import tinycolor from 'tinycolor2';
import { intersectSphere, rayToPointDistance } from './Collision';
import { AppMode } from './App';
import Prism from './Prism';
import Section, { SectionType } from './Section';
import { createTransform, multiplyTransforms } from './Transform';
import Shape from './Shape';

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

const COLOR_MASK_COUNT = 8;
const POINTER_DRAG_THRESHOLD = 3;
const POINTER_DRAG_THRESHOLD_SQUARED = POINTER_DRAG_THRESHOLD * POINTER_DRAG_THRESHOLD;
const POINTER_DRAG_FACTOR = 0.01;
const ELEVATION_LIMIT = 0.48 * Math.PI;
const CAMERA_ANIMATION_TIME = 0.3;
const CAMERA_ANIMATION_FOLLOW_TIME = 0.25 * CAMERA_ANIMATION_TIME;
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

const FOG_COLOR = "#e6e6e6ff";
const FOG_DISTANCE = 30;
const GROUND_HALF_SIZE = 1000;
const GROUND_GRID_SIZE = 4;

const HIGHLIGHT_PRIMARY_COLOR = "#ffff40";
const HIGHLIGHT_ALTERNATE_COLOR = "#b266ff";
const HIGHLIGHT_OPAQUE_BLEND = 0.8;
const HIGHLIGHT_START_BLEND = 0.3;
const HIGHLIGHT_RANGE_BLEND = HIGHLIGHT_OPAQUE_BLEND - HIGHLIGHT_START_BLEND;
const HIGHLIGHT_ANIMATION_TIME = 2;

const KNOB_RADIUS = 0.4;

const SECTION_COLORS = new Map([
  [SectionType.SEPARATOR, "#4caf50"],
  [SectionType.ACTUATOR, "#ff9800"]
]);
const INDICATION_COLOR = "#90caf960";
const CREATION_COLOR = "#fff59d60";

const GOAL_ARCHIVE = "{\"version\":3,\"shape\":{\"name\":\"Goal\",\"prisms\":[{\"id\":1,\"colorMask\":3,\"backgroundColor\":\"#d32f2f\",\"foregroundColor\":\"#d9d9d9\",\"position\":{\"0\":0,\"1\":0.5,\"2\":-1.5739213228225708},\"orientation\":{\"0\":0,\"1\":0,\"2\":0,\"3\":1}},{\"id\":2,\"colorMask\":3,\"backgroundColor\":\"#d9d9d9\",\"foregroundColor\":\"#d32f2f\",\"position\":{\"0\":1,\"1\":0.5,\"2\":-1.5739213228225708},\"orientation\":{\"0\":1,\"1\":0,\"2\":0,\"3\":6.123234262925839e-17}},{\"id\":3,\"colorMask\":3,\"backgroundColor\":\"#d32f2f\",\"foregroundColor\":\"#d9d9d9\",\"position\":{\"0\":2,\"1\":0.5,\"2\":-1.5739213228225708},\"orientation\":{\"0\":1.2246468525851679e-16,\"1\":0,\"2\":0,\"3\":-1}},{\"id\":4,\"colorMask\":3,\"backgroundColor\":\"#d9d9d9\",\"foregroundColor\":\"#d32f2f\",\"position\":{\"0\":1,\"1\":1.5,\"2\":-1.5739213228225708},\"orientation\":{\"0\":1.2246468525851679e-16,\"1\":0,\"2\":0,\"3\":-1}},{\"id\":5,\"colorMask\":3,\"backgroundColor\":\"#d32f2f\",\"foregroundColor\":\"#d9d9d9\",\"position\":{\"0\":0.5,\"1\":2,\"2\":-1.5739213228225708},\"orientation\":{\"0\":1.7934537957764396e-17,\"1\":-1.2989341566884322e-16,\"2\":-0.7071067690849304,\"3\":0.7071067690849304}},{\"id\":6,\"colorMask\":3,\"backgroundColor\":\"#d32f2f\",\"foregroundColor\":\"#d9d9d9\",\"position\":{\"0\":1.5,\"1\":2,\"2\":-1.5739213228225708},\"orientation\":{\"0\":-1.911257582981016e-16,\"1\":4.329780632585522e-17,\"2\":0.7071067690849304,\"3\":0.7071067690849304}},{\"id\":7,\"colorMask\":3,\"backgroundColor\":\"#d9d9d9\",\"foregroundColor\":\"#d32f2f\",\"position\":{\"0\":1.5,\"1\":3,\"2\":-1.5739213228225708},\"orientation\":{\"0\":0.7071067690849304,\"1\":0.7071067690849304,\"2\":-2.3657788664006152e-24,\"3\":2.344235679326793e-16}},{\"id\":8,\"colorMask\":3,\"backgroundColor\":\"#d9d9d9\",\"foregroundColor\":\"#d32f2f\",\"position\":{\"0\":0.5000000596046448,\"1\":3,\"2\":-1.5739213228225708},\"orientation\":{\"0\":2.7772137756725695e-16,\"1\":4.329780301713277e-17,\"2\":-0.7071067690849304,\"3\":-0.7071067690849304}},{\"id\":9,\"colorMask\":3,\"backgroundColor\":\"#d32f2f\",\"foregroundColor\":\"#d9d9d9\",\"position\":{\"0\":0.5000001192092896,\"1\":4,\"2\":-1.5739213228225708},\"orientation\":{\"0\":-0.7071067690849304,\"1\":-0.7071067690849304,\"2\":-8.659560603426554e-17,\"3\":-3.210191872018346e-16}},{\"id\":10,\"colorMask\":3,\"backgroundColor\":\"#d32f2f\",\"foregroundColor\":\"#d9d9d9\",\"position\":{\"0\":1.5,\"1\":4,\"2\":-1.5739213228225708},\"orientation\":{\"0\":2.7772137756725695e-16,\"1\":4.329780301713277e-17,\"2\":-0.7071067690849304,\"3\":-0.7071067690849304}},{\"id\":11,\"colorMask\":3,\"backgroundColor\":\"#d9d9d9\",\"foregroundColor\":\"#d32f2f\",\"position\":{\"0\":1,\"1\":4.5,\"2\":-1.5739213228225708},\"orientation\":{\"0\":-2.702926603918203e-16,\"1\":6.12323624815931e-17,\"2\":1,\"3\":0}},{\"id\":12,\"colorMask\":3,\"backgroundColor\":\"#d9d9d9\",\"foregroundColor\":\"#d32f2f\",\"position\":{\"0\":1,\"1\":5.5,\"2\":-1.5739213228225708},\"orientation\":{\"0\":-1.6550653361678656e-32,\"1\":1,\"2\":-1.9852334701272664e-23,\"3\":2.702926603918203e-16}}],\"sections\":[],\"lastPlaceableId\":12,\"roll\":0,\"pitch\":0,\"yaw\":0,\"showPose\":true}}";

const iblUrl = "res/environment_ibl.ktx";
const prismMeshUrl = "res/prism.filamesh";
const prismMaterialUrl = "res/prism.filamat";
const ghostMaterialUrl = "res/ghost.filamat";
const highcolMaterialUrl = "res/highcol.filamat";
const knobMeshUrl = "res/knob.filamesh";
const groundMaterialUrl = "res/ground.filamat";
const groundTextureUrl = "res/ground.png";
const sectionMeshUrl = "res/section.filamesh";

const getPrismTextureUrl = ((maskIndex) => "res/prism" + maskIndex + ".png");
const colorToFloat3 = ((color) => {
  const rgb = tinycolor(color).toRgb();
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
});
const colorToFloat4 = ((color) => {
  const rgb = tinycolor(color).toRgb();
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a];
});

class Viewport extends Component {
  constructor(props) {
    super(props);

    this.auxMat4 = mat4.create();
    this.auxTransform = createTransform();
  }

  componentDidMount() {
    let assets = [iblUrl, prismMeshUrl, prismMaterialUrl,
        ghostMaterialUrl, highcolMaterialUrl, knobMeshUrl,
        groundMaterialUrl, groundTextureUrl, sectionMeshUrl];
    for (let i = 0; i < COLOR_MASK_COUNT; i++) {
      assets.push(getPrismTextureUrl(i));
    }
    window.Filament.init(assets, () => {
      this.init();
    });
  }

  componentDidUpdate(prevProps) {
    const modeChanged = (prevProps.mode !== this.props.mode);
    const shapeChanged = (prevProps.originalShape !== this.props.originalShape);
    const trainingStateChanged = (prevProps.trainingState !== this.props.trainingState);
    if (modeChanged || shapeChanged) {
      this.refreshShapeView();
    }
    this.prepareGoalView();
    if (trainingStateChanged) {
      this.updateShapeView(this.props.trainingState.transforms);
      this.updateGoalView(this.props.trainingState.goalPosition);
    }
  }

  refreshShapeView() {
    if (!this.engine) {
      return;
    }
    if (this.shapeView) {
      this.shapeView.destroy(this);
    }
    const showSections = (this.props.mode === AppMode.EDIT);
    this.shapeView = new ShapeView(this.props.finalShape, showSections, this);
    this.shapeView.addToScene(this);
    this.activePlaceableView = null;
    const activePlaceable = (this.props.mode === AppMode.EDIT
        ? this.props.finalShape.findPlaceable(this.props.activePlaceableId) : null);
    this.selectPlaceable(activePlaceable, true, false);
  }

  prepareGoalView() {
    if (!this.engine) {
      return;
    }
    if (!this.goalShape) {
      const archive = JSON.parse(GOAL_ARCHIVE);
      this.goalShape = new Shape();
      this.goalShape.fromArchive(archive.shape, archive.version);
      this.goalShape.applyTransform(true);
    }
    if (!this.goalView) {
      if (this.props.mode !== AppMode.EDIT) {
        this.goalView = new ShapeView(this.goalShape, false, this);
      }
    } else if (this.goalPosition) {
      this.goalView.removeFromScene(this);
    }
    this.goalPosition = null;
  }

  init() {
    this.elevation = DEFAULT_ELEVATION;
    this.heading = DEFAULT_HEADING;
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

    this.shapeView = null;
    this.activePlaceableView = null;
    this.availableJunctions = null;
    this.originalAvailableJunctions = null;

    this.goalPosition = null;
    this.goalShape = null;
    this.goalView = null;

    this.pressing = false;
    this.dragging = false;
    this.pickedPlaceable = null;
    this.pickedJunction = null;
    this.activeJunctionPrism = null;
    this.pointerX = 0;
    this.pointerY = 0;

    this.canvas = this.filament;
    const engine = this.engine = window.Filament.Engine.create(this.canvas);
    this.camera = engine.createCamera(window.Filament.EntityManager.get().create());
    this.scene = engine.createScene();

    const sunlight = window.Filament.EntityManager.get().create();
    window.Filament.LightManager.Builder(window.Filament.LightManager$Type.SUN)
      .color([0.98, 0.92, 0.89])
      .intensity(70000.0)
      .direction([0.6, -1.0, -0.8])
      .sunAngularRadius(1.9)
      .sunHaloSize(10.0)
      .sunHaloFalloff(80.0)
      .castShadows(true)
      .build(engine, sunlight);
    this.scene.addEntity(sunlight);

    const indirectLight = engine.createIblFromKtx(iblUrl);
    indirectLight.setIntensity(40000);
    this.scene.setIndirectLight(indirectLight);

    this.prismMaterial = engine.createMaterial(prismMaterialUrl);
    this.prismMesh = engine.loadFilamesh(prismMeshUrl);
    this.ghostMaterial = engine.createMaterial(ghostMaterialUrl);
    this.ghostRenderable = this.createRenderable(this.createGhostMaterial(), this.prismMesh);
    this.highcolMaterial = engine.createMaterial(highcolMaterialUrl);
    this.knobMesh = engine.loadFilamesh(knobMeshUrl);
    this.knobRenderables = [];
    this.sectionMesh = engine.loadFilamesh(sectionMeshUrl);
    this.sectionRenderables = [];

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

    this.refreshShapeView();

    this.swapChain = engine.createSwapChain();
    this.renderer = engine.createRenderer();
    this.view = engine.createView();
    this.view.setCamera(this.camera);
    this.view.setScene(this.scene);
    this.view.setFogOptions({ color: colorToFloat3(FOG_COLOR), distance: FOG_DISTANCE, enabled: true });
    this.renderer.setClearOptions({ clearColor: colorToFloat4(FOG_COLOR), clear: true });

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
      .castShadows(false)
      .receiveShadows(true)
      .build(this.engine, entity);
    return entity;
  }

  createRenderable(material, mesh, castShadows = false, receiveShadows = false) {
    const renderable = window.Filament.EntityManager.get()
      .create();
    window.Filament.RenderableManager.Builder(1)
      .boundingBox(this.getBoundingBox(mesh.renderable))
      .material(0, material)
      .geometry(0, window.Filament.RenderableManager$PrimitiveType.TRIANGLES,
          mesh.vertexBuffer, mesh.indexBuffer)
      .castShadows(castShadows)
      .receiveShadows(receiveShadows)
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

  createGhostMaterial() {
    const material = this.ghostMaterial.createInstance();
    material.setColor4Parameter("baseColor",
        window.Filament.RgbaType.sRGB, colorToFloat4(INDICATION_COLOR));
    return material;
  }

  createHighcolMaterial(color) {
    const material = this.highcolMaterial.createInstance();
    material.setColor3Parameter("baseColor",
        window.Filament.RgbaType.sRGB, colorToFloat3(color));
    material.setColor4Parameter("highlightColor",
        window.Filament.RgbaType.sRGB, [0, 0, 0, 0]);
    return material;
  }

  createPrismRenderable(prism) {
    const validColorMask = (prism.colorMask >= 0) && (prism.colorMask < COLOR_MASK_COUNT)
        ? prism.colorMask : 0;
    const material = this.prismMaterial.createInstance();
    material.setTextureParameter("colorMask",
        this.prismTextures[validColorMask], this.prismTextureSampler);
    material.setColor3Parameter("backgroundColor",
        window.Filament.RgbType.sRGB, colorToFloat3(prism.backgroundColor));
    material.setColor3Parameter("foregroundColor",
        window.Filament.RgbType.sRGB, colorToFloat3(prism.foregroundColor));
    material.setColor4Parameter("highlightColor",
        window.Filament.RgbaType.sRGB, [0, 0, 0, 0]);
    return this.createRenderable(material, this.prismMesh, true, true);
  }

  createGhostKnobRenderable() {
    return this.createRenderable(this.createGhostMaterial(), this.knobMesh);
  }

  createGhostSectionRenderable() {
    return this.createRenderable(this.createGhostMaterial(), this.sectionMesh);
  }

  createSectionRenderable(section) {
    return this.createRenderable(this.createHighcolMaterial(SECTION_COLORS.get(section.type)),
        this.sectionMesh);
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

  updateFollowPosition(position) {
    vec3.copy(this.lastPosition, this.focalPoint);
    vec3.copy(this.targetPosition, position);
    this.lastZoom = this.cameraZoom;
    this.animationTimer = CAMERA_ANIMATION_FOLLOW_TIME;
  }

  updateShapeView(transforms) {
    const baseLink = (this.props.rigidInfo.baseLinks.length > 0
                      ? this.props.rigidInfo.baseLinks[0] : null);
    for (let i = 0; i < transforms.length; i++) {
      const partTransform = transforms[i];
      const link = this.props.rigidInfo.links[i];
      if (link === baseLink) {
        this.updateFollowPosition(partTransform.position);
      }
      for (let j = 0; j < link.prisms.length; j++) {
        const prismId = link.prisms[j].id;
        const viewTransform = link.viewTransforms[j];
        multiplyTransforms(this.auxTransform, partTransform, viewTransform);
        const placeableView = this.shapeView.findPlaceableView(prismId);
        this.setRenderableTransform(placeableView.renderable, this.auxTransform.position,
                                    this.auxTransform.orientation);
      }
    }
  }

  updateGoalView(goalPosition) {
    if (!this.goalPosition) {
      this.goalView.addToScene(this);
    }
    if (!this.goalPosition || !vec3.equals(this.goalPosition, goalPosition)) {
      this.goalView.placeableViews.forEach(placeableView => {
        quat.copy(this.auxTransform.orientation, placeableView.placeable.worldOrientation);
        vec3.add(this.auxTransform.position, placeableView.placeable.worldPosition, goalPosition);
        this.setRenderableTransform(placeableView.renderable, this.auxTransform.position,
                                    this.auxTransform.orientation);
      });
      this.goalPosition = goalPosition;
    }
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

    if (this.activePlaceableView) {
      this.highlightTimer += deltaTime;
      if (this.highlightTimer > HIGHLIGHT_ANIMATION_TIME) {
        this.highlightTimer %= HIGHLIGHT_ANIMATION_TIME;
      }
      const t = 2 * Math.abs(this.highlightTimer / HIGHLIGHT_ANIMATION_TIME - 0.5);
      const k = t * t * (3 - 2 * t);
      const highlightIntensity = HIGHLIGHT_START_BLEND + k * HIGHLIGHT_RANGE_BLEND;
      this.setHighlightIntensity(this.activePlaceableView, highlightIntensity);
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

    this.pickedPlaceable = null;
    this.pickedJunction = null;
    this.activeJunctionPrism = null;

    if (this.props.mode === AppMode.EDIT) {
      const ray = this.getCastingRay(e.clientX, e.clientY);
      const placeableIntersection = this.props.finalShape.intersect(ray);
      let junctionIntersection;
      if (this.props.activePlaceableId) {
        junctionIntersection = this.intersectJunctions(ray);
      }
      if (junctionIntersection && (!placeableIntersection
          || (junctionIntersection.hitDistance < placeableIntersection.hitDistance))) {
        this.pickedJunction = junctionIntersection.hitJunction;
        if (this.pickedJunction.section) {
          this.activatePrismSection(this.availableJunctions, this.pickedJunction);
        } else {
          this.activatePrismKnob(this.availableJunctions, this.pickedJunction);
        }
      } else {
        this.pickedPlaceable = (placeableIntersection) ? placeableIntersection.hitPlaceable : null;
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

    if (this.props.mode === AppMode.EDIT) {
      if (this.pickedJunction) {
        if (this.pickedJunction.section || this.activeJunctionPrism) {
          const originalPickedJunction = this.originalAvailableJunctions.find(
            junction => junction.face === this.pickedJunction.face);
          if (originalPickedJunction.section) {
            this.addSection(originalPickedJunction.section);
          } else {
            const activeJunctionPrismIndex = this.pickedJunction.prisms.findIndex(prism => prism === this.activeJunctionPrism);
            const originalActiveJunctionPrism = originalPickedJunction.prisms[activeJunctionPrismIndex];
            this.addPrism(originalActiveJunctionPrism);
          }
        }
      } else if (!this.dragging) {
        this.selectPlaceable(this.pickedPlaceable, true, true);
      }
      this.hideGhostPrism();
      if (this.availableJunctions) {
        this.showPrismKnobs(this.availableJunctions);
        this.showPrismSections(this.availableJunctions);
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
      if (this.pickedJunction && !this.pickedJunction.section) {
        const ray = this.getCastingRay(e.clientX, e.clientY);
        const nearestJunctionPrism = this.pickNearestJunctionPrism(ray, this.pickedJunction);
        if (nearestJunctionPrism !== this.activeJunctionPrism) {
          this.showGhostPrism(nearestJunctionPrism.worldPosition, nearestJunctionPrism.worldOrientation);
          this.activeJunctionPrism = nearestJunctionPrism;
        }
      } else if (!this.pickedJunction) {
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
      let junctionHitDistance;
      if (junction.section) {
        junctionHitDistance = junction.section.intersect(ray);
      } else {
        junctionHitDistance = intersectSphere(ray, junction.pivot, KNOB_RADIUS);
      }
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

  selectPlaceable(placeable, animate, notify) {
    if (this.activePlaceableView) {
      this.setHighlightIntensity(this.activePlaceableView, 0);
    }
    if (placeable) {
      this.activePlaceableView = this.shapeView.findPlaceableView(placeable.id);
    } else {
      this.activePlaceableView = null;
    }
    if (this.activePlaceableView) {
      this.updateHighlightColor(placeable);
    }
    if ((placeable instanceof Prism) && this.activePlaceableView) {
      const originalPlaceable = this.props.originalShape.findPlaceable(placeable.id);
      this.availableJunctions = this.props.finalShape.getAvailableJunctions(placeable);
      this.originalAvailableJunctions = this.props.originalShape.getAvailableJunctions(originalPlaceable);
      this.showPrismKnobs(this.availableJunctions);
      this.showPrismSections(this.availableJunctions);
    } else {
      this.availableJunctions = null;
      this.originalAvailableJunctions = null;
      this.hidePrismKnobs();
      this.hidePrismSections();
    }
    if (animate) {
      vec3.copy(this.lastPosition, this.targetPosition);
      this.lastZoom = this.targetZoom;
      if (this.activePlaceableView) {
        vec3.copy(this.targetPosition, placeable.worldPosition);
        this.targetZoom = 1;
      } else {
        vec3.copy(this.targetPosition, this.props.finalShape.aabb.center);
        this.targetZoom = this.computeAutoZoom(this.props.finalShape);
      }
      this.animationTimer = 0;
      this.highlightTimer = 0;
    }
    if (notify) {
      this.props.onActivePlaceableChange(placeable ? placeable.id : 0);
    }
  }

  addPrism(prism) {
    const shape = this.props.originalShape.clone();
    prism.id = ++shape.lastPlaceableId;
    shape.prisms.push(prism);
    shape.applyTransform();
    this.props.onShapeChange(shape, prism.id);
  }

  addSection(section) {
    const shape = this.props.originalShape.clone();
    section.id = ++shape.lastPlaceableId;
    shape.sections.push(section);
    shape.applyTransform();
    this.props.onShapeChange(shape, section.id);
  }

  updateHighlightColor(placeable) {
    let placeableColor;
    if (placeable instanceof Prism) {
      placeableColor = placeable.backgroundColor;
    } else if (placeable instanceof Section) {
      placeableColor = SECTION_COLORS.get(placeable.type);
    }
    if (!placeableColor) {
      return;
    }
    const primaryReadability = tinycolor.readability(placeableColor, HIGHLIGHT_PRIMARY_COLOR);
    const alternateReadability = tinycolor.readability(placeableColor, HIGHLIGHT_ALTERNATE_COLOR);
    const colorStr = (primaryReadability > alternateReadability)
        ? HIGHLIGHT_PRIMARY_COLOR : HIGHLIGHT_ALTERNATE_COLOR;
    const rgb = tinycolor(colorStr).toRgb();
    this.highlightColor[0] = rgb.r / 255;
    this.highlightColor[1] = rgb.g / 255;
    this.highlightColor[2] = rgb.b / 255;
  }

  setHighlightIntensity(placeableView, intensity) {
    const material = this.getRenderableMaterial(placeableView.renderable);
    this.highlightColor[3] = intensity;
    material.setColor4Parameter("highlightColor",
        window.Filament.RgbaType.sRGB, this.highlightColor);
  }

  setGhostColor(renderable, color) {
    const material = this.getRenderableMaterial(renderable);
    material.setColor4Parameter("baseColor",
        window.Filament.RgbaType.sRGB, colorToFloat4(color));
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
      this.knobRenderables.push(this.createGhostKnobRenderable());
    }
    for (let i = 0; i < junctions.length; i++) {
      const junction = junctions[i];
      const knobRenderable = this.knobRenderables[i];
      this.setGhostColor(knobRenderable, INDICATION_COLOR);
      this.setRenderableTransform(knobRenderable, junction.pivot, quat.create());
      this.scene.addEntity(knobRenderable);
    }
    for (let i = junctions.length; i < this.knobRenderables.length; i++) {
      this.scene.remove(this.knobRenderables[i])
    }
  }

  activatePrismKnob(junctions, activeJunction) {
    const junctionIndex = junctions.indexOf(activeJunction);
    const knobRenderable = this.knobRenderables[junctionIndex];
    this.setGhostColor(knobRenderable, CREATION_COLOR);
    this.hidePrismKnobs();
    this.scene.addEntity(knobRenderable);
  }

  hidePrismKnobs() {
    this.knobRenderables.forEach(knobRenderable => this.scene.remove(knobRenderable));
  }

  showPrismSections(junctions) {
    let index = 0;
    for (const junction of junctions) {
      if (!junction.section) {
        continue;
      }
      if (this.sectionRenderables.length <= index) {
        this.sectionRenderables.push(this.createGhostSectionRenderable());
      }
      const sectionRenderable = this.sectionRenderables[index];
      this.setGhostColor(sectionRenderable, INDICATION_COLOR);
      this.setRenderableTransform(sectionRenderable, junction.section.worldPosition,
          junction.section.worldOrientation);
      this.scene.addEntity(sectionRenderable);
      index++;
    }
    for (let i = index; i < this.sectionRenderables.length; i++) {
      this.scene.remove(this.sectionRenderables[i])
    }
  }

  activatePrismSection(junctions, activeJunction) {
    let index = -1;
    for (const junction of junctions) {
      if (!junction.section) {
        continue;
      }
      index++;
      if (junction === activeJunction) {
        break;
      }
    }
    const sectionRenderable = this.sectionRenderables[index];
    this.setGhostColor(sectionRenderable, CREATION_COLOR);
    this.hidePrismSections();
    this.scene.addEntity(sectionRenderable);
  }

  hidePrismSections() {
    this.sectionRenderables.forEach(sectionRenderable => this.scene.remove(sectionRenderable));
  }

  render() {
    return <canvas className="Viewport" ref={ref => (this.filament = ref)} />
  }
}

export default Viewport;
export { COLOR_MASK_COUNT };
