import React, { Component } from 'react';
import { vec3, quat } from 'gl-matrix';
import Prism from './Prism';
import Shape from './Shape';
import ShapeView from './ShapeView';
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

    // XXX test
    const backgroundColors = [0x2a7fff, 0xff7f2a, 0xffd42a, 0x7f2aff];
    const foregroundColor = 0xf9f9f9;
    const shape = new Shape();
    for (let i = 0; i < COLOR_MASK_COUNT; i++) {
      const angle = i * 360 / COLOR_MASK_COUNT;
      const prism = new Prism();
      prism.colorMask = i;
      prism.backgroundColor = backgroundColors[i % backgroundColors.length];
      prism.foregroundColor = foregroundColor;
      quat.fromEuler(prism.orientation, 0, 0, angle);
      vec3.set(prism.position, 2, 0, 0);
      vec3.transformQuat(prism.position, prism.position, prism.orientation);
      shape.prisms.push(prism);
    }
    this.shapeView = new ShapeView(shape, this);
    this.shapeView.addToScene(this.scene);

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

  renderFrame() {
    const angle = Date.now() / 10000;
    this.shapeView.heading = angle;
    this.shapeView.elevation = Math.sin(4 * angle);
    this.shapeView.shape.roll = Math.PI / 2;
    this.shapeView.shape.pitch = Math.PI / 6;
    this.shapeView.applyTransform(this);

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
