import React, { Component } from 'react';
import { vec3, quat, mat4 } from 'gl-matrix';
import Prism from './Prism';
import './App.css';

const COLOR_MASK_COUNT = 8;

const iblUrl = "res/environment_ibl.ktx";
const skyboxUrl = "res/environment_skybox.ktx";
const prismMeshUrl = "res/prism.filamesh";
const prismMaterialUrl = "res/prism.filamat";
const getPrismTextureUrl = ((maskIndex) => "res/prism" + maskIndex + ".png");
const convertColor = ((hex) =>
  [((hex >> 16) & 0xff) / 0xff, ((hex >> 8) & 0xff) / 0xff, (hex & 0xff) / 0xff]);

class Viewport extends Component {
  constructor(props) {
    super(props);

    this.prismTextures = null;
    this.prismMaterials = null;
    this.prismSourceMaterial = null;
    this.prismSourceMesh = null;
    this.prismBoundingBox = null;
    this.prismTextureSampler = null;
    this.shapeView = null;
  }

  componentDidMount() {
    let assets = [iblUrl, skyboxUrl, prismMeshUrl, prismMaterialUrl];
    for (let i = 0; i < COLOR_MASK_COUNT; i++) {
      assets.push(getPrismTextureUrl(i));
    }
    window.Filament.init(assets, () => {
      this.init();
    });
  }

  init() {
    this.canvas = this.filament;
    const engine = this.engine = window.Filament.Engine.create(this.canvas);
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

    // XXX test
    const backgroundColors = [0x2a7fff, 0xff7f2a, 0xffd42a, 0x7f2aff];
    const foregroundColor = 0xf9f9f9;
    const prisms = [];
    for (let i = 0; i < COLOR_MASK_COUNT; i++) {
      const angle = i * 360 / COLOR_MASK_COUNT;
      const prism = new Prism();
      prism.colorMask = i;
      prism.backgroundColor = backgroundColors[i % backgroundColors.length];
      prism.foregroundColor = foregroundColor;
      quat.fromEuler(prism.orientation, 0, 0, angle);
      vec3.set(prism.position, 2, 0, 0);
      vec3.transformQuat(prism.position, prism.position, prism.orientation);
      prisms.push(prism);
    }
    this.shapeView = this.createShapeView(prisms);

    this.swapChain = engine.createSwapChain();
    this.renderer = engine.createRenderer();
    this.camera = engine.createCamera();
    this.view = engine.createView();
    this.view.setCamera(this.camera);
    this.view.setScene(this.scene);

    this.resize();
    this.renderFrame = this.renderFrame.bind(this);
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    window.requestAnimationFrame(this.renderFrame);
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

  createPrismView(prism) {
    const renderable = this.createPrismRenderable(prism.colorMask,
        prism.backgroundColor, prism.foregroundColor);
    const transform = mat4.fromRotationTranslation(mat4.create(),
        prism.orientation, prism.position);
    const transformManager = this.engine.getTransformManager();
    const transformInstance = transformManager.getInstance(renderable);
    transformManager.setTransform(transformInstance, transform);
    transformInstance.delete();
    this.scene.addEntity(renderable);
    return {
      prism: prism,
      renderable: renderable
    };
  }

  createShapeView(prisms) {
    const prismViews = [];
    for (let i = 0; i < prisms.length; i++) {
      prismViews.push(this.createPrismView(prisms[i]));
    }
    return {
      prismViews: prismViews,
      pivot: vec3.create(),
      position: vec3.create(),
      orientation: quat.create()
    };
  }

  applyShapeTransform(shapeView) {
    const transformManager = this.engine.getTransformManager();
    const position = vec3.create();
    const orientation = quat.create();
    for (let i = 0; i < shapeView.prismViews.length; i++) {
      const prismView = shapeView.prismViews[i]
      vec3.copy(position, prismView.prism.position);
      quat.copy(orientation, prismView.prism.orientation);
      vec3.subtract(position, position, shapeView.pivot);
      vec3.transformQuat(position, position, shapeView.orientation);
      vec3.add(position, position, shapeView.pivot);
      vec3.add(position, position, shapeView.position);
      quat.multiply(orientation, shapeView.orientation, orientation);
      const transformInstance = transformManager.getInstance(prismView.renderable);
      const transform = mat4.fromRotationTranslation(mat4.create(), orientation, position);
      transformManager.setTransform(transformInstance, transform);
      transformInstance.delete();
    }
  }

  renderFrame() {
    const angle = Date.now() / 100;

    const eye = [0, 0, 10];
    const center = [0, 0, 0];
    const up = [0, 1, 0];
    vec3.rotateY(eye, eye, center, 0.01 * angle);
    this.camera.lookAt(eye, center, up);

    quat.fromEuler(this.shapeView.orientation, 0, 3 * angle, angle);
    this.applyShapeTransform(this.shapeView);

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

  render() {
    return <canvas className="Viewport" ref={ref => (this.filament = ref)} />
  }
}

export default Viewport;
