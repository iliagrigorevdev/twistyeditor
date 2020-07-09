import React, { Component } from 'react';
import { vec3 } from 'gl-matrix';
import Trackball from 'gltumble';
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

    this.handleShapeChange();

    this.swapChain = engine.createSwapChain();
    this.renderer = engine.createRenderer();
    this.view = engine.createView();
    this.view.setCamera(this.camera);
    this.view.setScene(this.scene);

    this.trackball = new Trackball(this.canvas, {
      autoTick: false,
      clampTilt: 0.48 * Math.PI
    });

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
    this.trackball.tick();
    const [spin, tilt] = this.trackball.getAngles();

    this.heading = -spin;
    this.elevation = -tilt;
    const eye = [0, 0, this.distance];
    const up = [0, 1, 0];
    vec3.rotateX(eye, eye, this.target, this.elevation);
    vec3.rotateY(eye, eye, this.target, this.heading);
    this.camera.lookAt(eye, this.target, up);

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
