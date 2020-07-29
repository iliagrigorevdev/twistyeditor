(this.webpackJsonptwistyeditor=this.webpackJsonptwistyeditor||[]).push([[0],{104:function(e,t,i){},270:function(e,t,i){"use strict";i.r(t);var r=i(1),n=i.n(r),a=i(92),o=i.n(a),s=(i(104),i(94)),h=i(4),l=i(5),c=i(15),u=i(14),d=(i(38),i(16)),m=i(0),p=function e(t,i){Object(h.a)(this,e),this.prism=t,this.renderable=i},f=function(){function e(t,i){Object(h.a)(this,e),this.shape=t,this.prismViews=[];for(var r=0;r<this.shape.prisms.length;r++)this.prismViews.push(this.createPrismView(this.shape.prisms[r],i));this.syncTransform(i)}return Object(l.a)(e,[{key:"createPrismView",value:function(e,t){var i=t.createPrismRenderable(e.colorMask,e.backgroundColor,e.foregroundColor);return new p(e,i)}},{key:"destroy",value:function(e){this.prismViews.forEach((function(t){return e.destroyRenderable(t.renderable)})),this.prismViews=null}},{key:"findPrismView",value:function(e){for(var t=0;t<this.prismViews.length;t++){var i=this.prismViews[t];if(i.prism.id===e)return i}return null}},{key:"addToScene",value:function(e){this.prismViews.forEach((function(t){return e.scene.addEntity(t.renderable)}))}},{key:"syncTransform",value:function(e){for(var t=0;t<this.prismViews.length;t++){var i=this.prismViews[t],r=i.prism;e.setRenderableTransform(i.renderable,r.worldPosition,r.worldOrientation)}}}]),e}(),v=i(20),g=i.n(v),y=m.d.create(),b=m.d.create(),k=m.d.create(),w=m.d.create();function P(e,t,i,r){var n=m.d.sub(y,i,t),a=m.d.sub(b,r,t),o=m.d.cross(k,e.direction,a),s=m.d.dot(n,o);if(!(s<1e-6)){var h=m.d.sub(w,e.origin,t),l=m.d.dot(h,o);if(!(l<0||l>s)){var c=m.d.cross(w,h,n),u=m.d.dot(e.direction,c);if(!(u<0||l+u>s))return m.d.dot(a,c)/s}}}function C(e,t,i){var r=m.d.sub(y,e.origin,t),n=i*i,a=m.d.squaredLength(r);if(a<=n)return 0;var o=m.d.dot(e.direction,e.direction),s=2*m.d.dot(r,e.direction),h=s*s-4*o*(a-n);if(h>=0){var l=Math.sqrt(h),c=(-s-l)/(2*o);return c<0&&(c=(-s+l)/(2*o)),c}}function M(e,t){for(var i=0,r=0,n=0;n<t.length;n++){var a=m.d.dot(e,t[n]);0===n?(i=a,r=a):(a<i&&(i=a),a>r&&(r=a))}return{dmin:i,dmax:r}}function x(e,t,i){var r=arguments.length>3&&void 0!==arguments[3]?arguments[3]:.001;if(0===t.length||0===i.length)return!1;var n=M(e,t),a=M(e,i);return n.dmin+r<a.dmax&&a.dmin+r<n.dmax}function E(e,t){var i=m.d.sub(y,t,e.origin),r=m.d.scale(b,e.direction,m.d.dot(i,e.direction));return m.d.distance(i,r)}var S=Math.PI/180,I=180/Math.PI,R=.48*Math.PI,T=-Math.PI/10,V=-Math.PI/40;var F="res/environment_ibl.ktx",O=function(e){return"res/prism"+e+".png"},A=function(e){var t=g()(e).toRgb();return[t.r/255,t.g/255,t.b/255]},J=m.c.create(),j=m.b.create(),B=function(e){Object(c.a)(i,e);var t=Object(u.a)(i);function i(){return Object(h.a)(this,i),t.apply(this,arguments)}return Object(l.a)(i,[{key:"componentDidMount",value:function(){for(var e=this,t=[F,"res/environment_skybox.ktx","res/prism.filamesh","res/prism.filamat","res/ghost.filamat","res/knob.filamesh","res/knob.filamat"],i=0;i<8;i++)t.push(O(i));window.Filament.init(t,(function(){e.init()}))}},{key:"componentDidUpdate",value:function(e){e.shape!==this.props.shape&&this.handleShapeChange()}},{key:"handleShapeChange",value:function(){this.engine&&(this.shapeView&&this.shapeView.destroy(this),this.shapeView=new f(this.props.shape,this),this.shapeView.addToScene(this),this.activePrismView=null,this.selectPrism(this.props.activePrism,!0,!1))}},{key:"init",value:function(){var e=this;this.elevation=T,this.heading=V,this.activePrismView=null,this.availableJunctions=null,this.focalLengthMin=15,this.focalLengthMax=50,this.cameraZoom=1,this.targetZoom=this.cameraZoom,this.lastZoom=this.cameraZoom,this.focalPoint=m.d.create(),this.targetPosition=m.d.create(),this.lastPosition=m.d.create(),this.highlightColor=[0,0,0,0],this.animationTimer=0,this.highlightTimer=0,this.pressing=!1,this.dragging=!1,this.pickedPrism=null,this.pickedJunction=null,this.activeJunctionPrism=null,this.pointerX=0,this.pointerY=0,this.canvas=this.filament;var t=this.engine=window.Filament.Engine.create(this.canvas);this.camera=t.createCamera(window.Filament.EntityManager.get().create()),this.scene=t.createScene();var i=t.createIblFromKtx(F);i.setIntensity(5e4),this.scene.setIndirectLight(i);var r=t.createSkyFromKtx("res/environment_skybox.ktx");this.scene.setSkybox(r),this.prismSourceMaterial=t.createMaterial("res/prism.filamat"),this.prismSourceMesh=t.loadFilamesh("res/prism.filamesh"),this.prismBoundingBox=this.getBoundingBox(this.prismSourceMesh.renderable);var n=t.createMaterial("res/ghost.filamat");this.ghostRenderable=this.buildPrismRenderable(n.getDefaultInstance()),this.knobSourceMaterial=t.createMaterial("res/knob.filamat"),this.knobSourceMesh=t.loadFilamesh("res/knob.filamesh"),this.knobBoundingBox=this.getBoundingBox(this.knobSourceMesh.renderable),this.knobRenderables=[],this.prismTextures=[];for(var a=0;a<8;a++)this.prismTextures.push(t.createTextureFromPng(O(a)));this.prismTextureSampler=new window.Filament.TextureSampler(window.Filament.MinFilter.LINEAR_MIPMAP_LINEAR,window.Filament.MagFilter.LINEAR,window.Filament.WrapMode.CLAMP_TO_EDGE),this.handleShapeChange(),this.swapChain=t.createSwapChain(),this.renderer=t.createRenderer(),this.view=t.createView(),this.view.setCamera(this.camera),this.view.setScene(this.scene),this.resize(),this.renderFrame=this.renderFrame.bind(this),this.resize=this.resize.bind(this),window.addEventListener("resize",this.resize),window.requestAnimationFrame(this.renderFrame),this.canvas.addEventListener("pointerdown",(function(t){return e.handlePointerDown(t)})),this.canvas.addEventListener("pointerup",(function(t){return e.handlePointerUp(t)})),this.canvas.addEventListener("pointermove",(function(t){return e.handlePointerMove(t)}))}},{key:"buildPrismRenderable",value:function(e){var t=window.Filament.EntityManager.get().create();return window.Filament.RenderableManager.Builder(1).boundingBox(this.prismBoundingBox).material(0,e).geometry(0,window.Filament.RenderableManager$PrimitiveType.TRIANGLES,this.prismSourceMesh.vertexBuffer,this.prismSourceMesh.indexBuffer).build(this.engine,t),t}},{key:"createPrismRenderable",value:function(e,t,i){var r=e>=0&&e<8?e:0,n=this.prismSourceMaterial.createInstance();return n.setTextureParameter("colorMask",this.prismTextures[r],this.prismTextureSampler),n.setColor3Parameter("backgroundColor",window.Filament.RgbType.sRGB,A(t)),n.setColor3Parameter("foregroundColor",window.Filament.RgbType.sRGB,A(i)),n.setColor4Parameter("highlightColor",window.Filament.RgbaType.sRGB,[0,0,0,0]),this.buildPrismRenderable(n)}},{key:"createKnobRenderable",value:function(){var e=this.knobSourceMaterial.createInstance();e.setFloatParameter("alpha",0);var t=window.Filament.EntityManager.get().create();return window.Filament.RenderableManager.Builder(1).boundingBox(this.knobBoundingBox).material(0,e).geometry(0,window.Filament.RenderableManager$PrimitiveType.TRIANGLES,this.knobSourceMesh.vertexBuffer,this.knobSourceMesh.indexBuffer).build(this.engine,t),t}},{key:"destroyRenderable",value:function(e){var t=this.getRenderableMaterial(e);this.engine.destroyMaterialInstance(t),this.engine.destroyEntity(e),this.engine.getRenderableManager().destroy(e)}},{key:"getBoundingBox",value:function(e){var t=this.engine.getRenderableManager(),i=t.getInstance(e),r=t.getAxisAlignedBoundingBox(i);return i.delete(),r}},{key:"setRenderableTransform",value:function(e,t,i){var r=this.engine.getTransformManager(),n=r.getInstance(e),a=m.b.fromRotationTranslation(j,i,t);r.setTransform(n,a),n.delete()}},{key:"getRenderableMaterial",value:function(e){var t=this.engine.getRenderableManager(),i=t.getInstance(e),r=t.getMaterialInstanceAt(i,0);return i.delete(),r}},{key:"updateCamera",value:function(){var e=[this.focalPoint[0],this.focalPoint[1],this.focalPoint[2]+10];m.d.rotateX(e,e,this.focalPoint,this.elevation),m.d.rotateY(e,e,this.focalPoint,this.heading),this.camera.lookAt(e,this.focalPoint,[0,1,0]);var t,i=this.focalLengthMin*(1-this.cameraZoom)+this.focalLengthMax*this.cameraZoom,r=(t=i,2*Math.atan(16/t)*I),n=this.canvas.width/this.canvas.height;this.camera.setProjectionFov(r,n,1,300,window.Filament.Camera$Fov.VERTICAL)}},{key:"renderFrame",value:function(e){void 0===this.lastTime&&(this.lastTime=e);var t=.001*(e-this.lastTime);if(this.lastTime=e,this.animationTimer<.3){this.animationTimer+=t;var i=Math.min(this.animationTimer/.3,1),r=i*i*(3-2*i);m.d.lerp(this.focalPoint,this.lastPosition,this.targetPosition,r),this.cameraZoom=this.lastZoom*(1-r)+this.targetZoom*r,this.updateCamera()}if(this.activePrismView){this.highlightTimer+=t,this.highlightTimer>2&&(this.highlightTimer%=2);var n=2*Math.abs(this.highlightTimer/2-.5),a=.3+.5*(n*n*(3-2*n));this.setHighlightIntensity(this.activePrismView,a)}this.renderer.render(this.swapChain,this.view),window.requestAnimationFrame(this.renderFrame)}},{key:"resize",value:function(){var e=window.devicePixelRatio,t=this.canvas.width=.8*window.innerWidth*e,i=this.canvas.height=window.innerHeight*e;if(this.view.setViewport([0,0,t,i]),this.focalLengthMin=15,this.focalLengthMax=50,t<i){var r=t/i;this.focalLengthMin*=r,this.focalLengthMax*=r}this.updateCamera()}},{key:"isPrimaryPointer",value:function(e){return"touch"!==e.pointerType||e.isPrimary}},{key:"handlePointerDown",value:function(e){if(this.isPrimaryPointer(e)){var t,i=this.getCastingRay(e.clientX,e.clientY),r=this.shapeView.shape.intersect(i);this.props.activePrism&&(t=this.intersectJunctions(i)),t&&(!r||t.hitDistance<r.hitDistance)?(this.pickedPrism=null,this.pickedJunction=t.hitJunction,this.activatePrismKnob(this.availableJunctions,this.pickedJunction)):(this.pickedPrism=r?r.hitPrism:null,this.pickedJunction=null),this.activeJunctionPrism=null,this.pressing=!0,this.dragging=!1,this.pointerX=e.clientX,this.pointerY=e.clientY}}},{key:"handlePointerUp",value:function(e){this.isPrimaryPointer(e)&&(this.activeJunctionPrism?this.addPrism(this.activeJunctionPrism):this.dragging||this.pickedJunction||this.selectPrism(this.pickedPrism,!0,!0),this.pressing=!1,this.hideGhostPrism(),this.availableJunctions&&this.showPrismKnobs(this.availableJunctions))}},{key:"handlePointerMove",value:function(e){if(this.isPrimaryPointer(e)&&this.pressing){var t=e.clientX-this.pointerX,i=e.clientY-this.pointerY;if(this.dragging)if(this.pickedJunction){var r=this.getCastingRay(e.clientX,e.clientY),n=this.pickNearestJunctionPrism(r,this.pickedJunction);n!==this.activeJunctionPrism&&(this.showGhostPrism(n.worldPosition,n.worldOrientation),this.activeJunctionPrism=n)}else this.elevation=Math.min(Math.max(this.elevation-.01*i,-R),R),this.heading=(this.heading-.01*t)%(2*Math.PI),this.updateCamera(),this.pointerX=e.clientX,this.pointerY=e.clientY;else t*t+i*i>=9&&(this.pointerX=e.clientX,this.pointerY=e.clientY,this.dragging=!0)}}},{key:"computeAutoZoom",value:function(e){var t,i,r=0,n=m.d.create(),a=m.a.fromMat4(m.a.create(),this.camera.getViewMatrix()),o=this.canvas.height/this.canvas.width,s=Object(d.a)(e.prisms);try{for(s.s();!(t=s.n()).done;){var h,l=t.value,c=Object(d.a)(l.vertices);try{for(c.s();!(h=c.n()).done;){var u=h.value;m.d.sub(n,u,e.aabb.center),m.d.transformMat3(n,n,a);var p=2*Math.atan(1.1*o*Math.abs(n[0])/(10-n[2]))*I;p>r&&(r=p);var f=2*Math.atan(1.1*Math.abs(n[1])/(10-n[2]))*I;f>r&&(r=f)}}catch(g){c.e(g)}finally{c.f()}}}catch(g){s.e(g)}finally{s.f()}if(r>0){var v=((i=r,16/Math.tan(.5*i*S))-this.focalLengthMin)/(this.focalLengthMax-this.focalLengthMin);return Math.min(Math.max(v,0),1)}return 1}},{key:"getCastingRay",value:function(e,t){var i=window.devicePixelRatio,r=2*e*i/this.canvas.width-1,n=1-2*t*i/this.canvas.height,a=m.e.fromValues(r,n,-1,1);m.e.transformMat4(a,a,window.Filament.Camera.inverseProjection(this.camera.getProjectionMatrix())),a[2]=-1,a[3]=0,m.e.transformMat4(a,a,this.camera.getModelMatrix());var o=m.d.fromValues(a[0],a[1],a[2]);return m.d.normalize(o,o),{origin:this.camera.getPosition(),direction:o}}},{key:"intersectJunctions",value:function(e){if(this.availableJunctions){for(var t,i,r=0;r<this.availableJunctions.length;r++){var n=this.availableJunctions[r],a=C(e,n.pivot,.4);void 0!==a&&(void 0===i||a<i)&&(t=n,i=a)}if(t)return{hitJunction:t,hitDistance:i}}}},{key:"pickNearestJunctionPrism",value:function(e,t){for(var i,r=null,n=0;n<t.prisms.length;n++){var a=t.prisms[n],o=E(e,a.worldPosition);(void 0===i||o<i)&&(r=a,i=o)}return r}},{key:"selectPrism",value:function(e,t,i){this.activePrismView&&this.setHighlightIntensity(this.activePrismView,0),this.activePrismView=e?this.shapeView.findPrismView(e.id):null,this.activePrismView?(this.updateHighlightColor(e),this.availableJunctions=this.shapeView.shape.getAvailableJunctions(e),this.showPrismKnobs(this.availableJunctions)):(this.availableJunctions=null,this.hidePrismKnobs()),t&&(m.d.copy(this.lastPosition,this.targetPosition),this.lastZoom=this.targetZoom,this.activePrismView?(m.d.copy(this.targetPosition,e.worldPosition),this.targetZoom=1):(m.d.copy(this.targetPosition,this.shapeView.shape.aabb.center),this.targetZoom=this.computeAutoZoom(this.shapeView.shape)),this.animationTimer=0,this.highlightTimer=0),i&&this.props.onActivePrismChange(e)}},{key:"addPrism",value:function(e){var t=this.shapeView.shape.clone();e.id=++t.lastPrismId,t.prisms.push(e),t.applyTransform(),this.selectPrism(e,!1,!0),this.props.onShapeChange(t)}},{key:"updateHighlightColor",value:function(e){var t=g.a.readability(e.backgroundColor,"#ffff40")>g.a.readability(e.backgroundColor,"#b266ff")?"#ffff40":"#b266ff",i=g()(t).toRgb();this.highlightColor[0]=i.r/255,this.highlightColor[1]=i.g/255,this.highlightColor[2]=i.b/255}},{key:"setHighlightIntensity",value:function(e,t){var i=this.getRenderableMaterial(e.renderable);this.highlightColor[3]=t,i.setColor4Parameter("highlightColor",window.Filament.RgbaType.sRGB,this.highlightColor)}},{key:"showGhostPrism",value:function(e,t){this.setRenderableTransform(this.ghostRenderable,e,t),this.scene.addEntity(this.ghostRenderable)}},{key:"hideGhostPrism",value:function(){this.scene.remove(this.ghostRenderable)}},{key:"showPrismKnobs",value:function(e){for(;this.knobRenderables.length<e.length;)this.knobRenderables.push(this.createKnobRenderable());for(var t=0;t<e.length;t++){var i=e[t],r=this.knobRenderables[t];this.getRenderableMaterial(r).setFloatParameter("alpha",.3),this.setRenderableTransform(r,i.pivot,J),this.scene.addEntity(r)}for(var n=e.length;n<this.knobRenderables.length;n++){var a=this.knobRenderables[n];this.scene.remove(a)}}},{key:"activatePrismKnob",value:function(e,t){var i=e.indexOf(t),r=this.knobRenderables[i];this.getRenderableMaterial(r).setFloatParameter("alpha",1),this.hidePrismKnobs(),this.scene.addEntity(r)}},{key:"hidePrismKnobs",value:function(){var e=this;this.knobRenderables.forEach((function(t){return e.scene.remove(t)}))}},{key:"render",value:function(){var e=this;return n.a.createElement("canvas",{className:"Viewport",ref:function(t){return e.filament=t}})}}]),i}(r.Component),L=i(2),H=i.n(L),N=i(93),Z=function(e){Object(c.a)(i,e);var t=Object(u.a)(i);function i(e){var r;return Object(h.a)(this,i),(r=t.call(this,e)).state={displayColorPicker:!1},r}return Object(l.a)(i,[{key:"handleToggleColorPicker",value:function(){this.setState({displayColorPicker:!this.state.displayColorPicker})}},{key:"handleHideColorPicker",value:function(){this.setState({displayColorPicker:!1})}},{key:"handleColorChange",value:function(e){this.props.onChange(e.hex),this.handleHideColorPicker()}},{key:"render",value:function(){var e=this,t=H()({default:{color:{width:"36px",height:"14px",borderRadius:"2px",background:this.props.color},swatch:{padding:"5px",background:"#fff",borderRadius:"1px",boxShadow:"0 0 0 1px rgba(0,0,0,.1)",display:"inline-block",cursor:"pointer"},popover:{position:"absolute",zIndex:"2"},cover:{position:"fixed",top:"0px",right:"0px",bottom:"0px",left:"0px"}}});return n.a.createElement("div",null,n.a.createElement("div",{style:t.swatch,onClick:function(){return e.handleToggleColorPicker()}},n.a.createElement("div",{style:t.color})),this.state.displayColorPicker?n.a.createElement("div",{style:t.popover},n.a.createElement("div",{style:t.cover,onClick:function(){return e.handleHideColorPicker()}}),n.a.createElement(N.SwatchesPicker,{color:this.props.color,width:"220px",height:"220px",onChange:function(t){return e.handleColorChange(t)}})):null)}}]),i}(r.Component),Y=function(e){Object(c.a)(i,e);var t=Object(u.a)(i);function i(){return Object(h.a)(this,i),t.apply(this,arguments)}return Object(l.a)(i,[{key:"modifyShape",value:function(e,t){var i=e.clone();t(i),i.applyTransform(),this.props.onShapeChange(i)}},{key:"modifyPrism",value:function(e,t,i){this.modifyShape(e,(function(e){var r=e.findPrism(t.id);i(r)}))}},{key:"handleRollChange",value:function(e,t){this.modifyShape(e,(function(e){return e.roll=parseFloat(t)||0}))}},{key:"handlePitchChange",value:function(e,t){this.modifyShape(e,(function(e){return e.pitch=parseFloat(t)||0}))}},{key:"handleYawChange",value:function(e,t){this.modifyShape(e,(function(e){return e.yaw=parseFloat(t)||0}))}},{key:"handleColorMaskChange",value:function(e,t,i){this.modifyPrism(e,t,(function(e){return e.colorMask=parseInt(i)||0}))}},{key:"handleBackgroundColorChange",value:function(e,t,i){this.modifyPrism(e,t,(function(e){return e.backgroundColor=i}))}},{key:"handleForegroundColorChange",value:function(e,t,i){this.modifyPrism(e,t,(function(e){return e.foregroundColor=i}))}},{key:"handleSwapColors",value:function(e,t){this.modifyPrism(e,t,(function(e){e.foregroundColor=t.backgroundColor,e.backgroundColor=t.foregroundColor}))}},{key:"handleDeletePrism",value:function(e,t){this.modifyShape(e,(function(e){e.prisms=e.prisms.filter((function(e){return e.id!==t.id}))}))}},{key:"renderShapeParams",value:function(e){var t=this;return n.a.createElement("div",{className:"Group"},n.a.createElement("h3",null,"Shape"),n.a.createElement("p",null,n.a.createElement("label",{htmlFor:"roll"},"Roll : "),n.a.createElement("input",{type:"number",id:"roll",name:"roll",min:"-180",max:"180",step:"15",value:e.roll,onChange:function(i){return t.handleRollChange(e,i.target.value)}})),n.a.createElement("p",null,n.a.createElement("label",{htmlFor:"pitch"},"Pitch : "),n.a.createElement("input",{type:"number",id:"pitch",name:"pitch",min:"-180",max:"180",step:"15",value:e.pitch,onChange:function(i){return t.handlePitchChange(e,i.target.value)}})),n.a.createElement("p",null,n.a.createElement("label",{htmlFor:"yaw"},"Yaw : "),n.a.createElement("input",{type:"number",id:"yaw",name:"yaw",min:"-180",max:"180",step:"15",value:e.yaw,onChange:function(i){return t.handleYawChange(e,i.target.value)}})),n.a.createElement("h3",null,"File"),n.a.createElement("p",null,n.a.createElement("button",{id:"resetShape",name:"resetShape",onClick:function(){return t.props.onShapeReset()}},"Reset"),n.a.createElement("button",{id:"showcaseShape",name:"showcaseShape",onClick:function(){return t.props.onShapeShowcase()}},"Showcase")),n.a.createElement("p",null,n.a.createElement("button",{id:"importShape",name:"importShape",onClick:function(){return t.props.onShapeImport()}},"Import"),n.a.createElement("button",{id:"exportShape",name:"exportShape",onClick:function(){return t.props.onShapeExport(e)}},"Export")))}},{key:"renderPrismParams",value:function(e,t){var i=this;return n.a.createElement("div",{className:"Group"},n.a.createElement("h3",null,"Prism"),n.a.createElement("p",null,n.a.createElement("label",{htmlFor:"colorMask"},"Mask : "),n.a.createElement("input",{type:"number",id:"colorMask",name:"colorMask",min:"0",max:7,step:"1",value:t.colorMask,onChange:function(r){return i.handleColorMaskChange(e,t,r.target.value)}})),n.a.createElement("div",null,n.a.createElement("label",{htmlFor:"backgroundColor"},"Background : "),n.a.createElement(Z,{id:"backgroundColor",name:"backgroundColor",color:t.backgroundColor,onChange:function(r){return i.handleBackgroundColorChange(e,t,r)}})),n.a.createElement("div",null,n.a.createElement("label",{htmlFor:"foregroundColor"},"Foreground : "),n.a.createElement(Z,{id:"foregroundColor",name:"foregroundColor",color:t.foregroundColor,onChange:function(r){return i.handleForegroundColorChange(e,t,r)}})),n.a.createElement("p",null,n.a.createElement("button",{id:"swapColors",name:"swapColors",onClick:function(){return i.handleSwapColors(e,t)}},"Swap")),n.a.createElement("p",null,n.a.createElement("button",{id:"deletePrism",name:"deletePrism",disabled:e.prisms.length<=1,onClick:function(){return i.handleDeletePrism(e,t)}},"Delete")))}},{key:"renderParams",value:function(){return this.props.activePrism?this.renderPrismParams(this.props.shape,this.props.activePrism):this.renderShapeParams(this.props.shape)}},{key:"renderHistory",value:function(){var e=this;return n.a.createElement("div",{className:"Group"},n.a.createElement("h3",null,"History"),n.a.createElement("button",{id:"undoHistory",name:"undoHistory",disabled:this.props.historyIndex<=0,onClick:function(){return e.props.onHistoryChange(e.props.historyIndex-1)}},"Undo"),n.a.createElement("button",{id:"redoHistory",name:"redoHistory",disabled:this.props.historyIndex>=this.props.historyEntries.length-1,onClick:function(){return e.props.onHistoryChange(e.props.historyIndex+1)}},"Redo"))}},{key:"render",value:function(){return n.a.createElement("div",{className:"Toolbar"},this.renderHistory(),this.renderParams())}}]),i}(r.Component);function z(e,t){return{position:e,orientation:t}}function G(e,t,i,r){var n=m.c.setAxisAngle(m.c.create(),i,r),a=m.d.sub(m.d.create(),e.position,t);m.d.transformQuat(a,a,n),m.d.add(a,a,t);var o=m.c.mul(n,n,e.orientation);return m.c.normalize(o,o),z(a,o)}function D(e,t){var i=m.d.transformQuat(m.d.create(),t.position,e.orientation);m.d.add(i,i,e.position);var r=m.c.mul(m.c.create(),e.orientation,t.orientation);return m.c.normalize(r,r),z(i,r)}var X=Math.sqrt(2),K=.5*X,Q=[m.d.fromValues(-1,-.5,-K),m.d.fromValues(-1,-.5,K),m.d.fromValues(0,.5,-K),m.d.fromValues(0,.5,K),m.d.fromValues(1,-.5,-K),m.d.fromValues(1,-.5,K)],U=[0,1,2,2,1,3,2,3,4,4,3,5,4,5,0,0,5,1,0,2,4,5,3,1],_=[[0,1,2,3],[2,3,5,4],[1,0,4,5],[0,2,4],[5,3,1]].map((function(e){var t=Q[e[0]],i=Q[e[1]],r=Q[e[2]],n=m.d.sub(m.d.create(),i,t);return m.d.cross(n,n,m.d.sub(m.d.create(),r,t)),m.d.normalize(n,n)})),q=m.d.fromValues(-.5,0,0),W=m.d.fromValues(.5,0,0),$=m.d.rotateZ(m.d.create(),m.d.fromValues(0,1,0),m.d.fromValues(0,0,0),.25*Math.PI),ee=m.d.rotateZ(m.d.create(),m.d.fromValues(0,1,0),m.d.fromValues(0,0,0),-.25*Math.PI),te=z(m.d.fromValues(-1,0,0),m.c.fromEuler(m.c.create(),-180,0,0)),ie=z(m.d.fromValues(1,0,0),m.c.fromEuler(m.c.create(),180,0,0)),re=[{swapColors:!0,pivot:q,normal:$,transforms:[te,G(te,q,$,.5*Math.PI),G(te,q,$,Math.PI),G(te,q,$,-.5*Math.PI)]},{swapColors:!0,pivot:W,normal:ee,transforms:[ie,G(ie,W,ee,-.5*Math.PI),G(ie,W,ee,Math.PI),G(ie,W,ee,.5*Math.PI)]},{swapColors:!1,pivot:m.d.fromValues(0,-.5/6,K),normal:m.d.fromValues(0,0,1),transforms:[z(m.d.fromValues(0,0,X),m.c.create())]},{swapColors:!1,pivot:m.d.fromValues(0,-.5/6,-K),normal:m.d.fromValues(0,0,-1),transforms:[z(m.d.fromValues(0,0,-X),m.c.create())]},{swapColors:!1,pivot:m.d.fromValues(0,-.5,0),normal:m.d.fromValues(0,-1,0),transforms:[z(m.d.fromValues(0,-1,0),m.c.fromEuler(m.c.create(),180,0,0))]}],ne=function(){function e(){Object(h.a)(this,e),this.id=0,this.colorMask=0,this.backgroundColor="#000",this.foregroundColor="#fff",this.position=m.d.create(),this.orientation=m.c.create(),this.worldPosition=m.d.create(),this.worldOrientation=m.c.create(),this.vertices=Q.map((function(e){return m.d.clone(e)})),this.polygonNormals=_.map((function(e){return m.d.clone(e)}))}return Object(l.a)(e,[{key:"applyTransform",value:function(e){m.d.transformQuat(this.worldPosition,this.position,e),m.c.multiply(this.worldOrientation,e,this.orientation);for(var t=0;t<this.vertices.length;t++){var i=this.vertices[t];m.d.transformQuat(i,Q[t],this.worldOrientation),m.d.add(i,i,this.worldPosition)}for(var r=0;r<this.polygonNormals.length;r++)m.d.transformQuat(this.polygonNormals[r],_[r],this.worldOrientation)}},{key:"intersect",value:function(e){return function(e,t,i){for(var r,n=0;n<i.length;n+=3){var a=P(e,t[i[n]],t[i[n+1]],t[i[n+2]]);void 0!==a&&(void 0===r||a<r)&&(r=a)}return r}(e,this.vertices,U)}},{key:"collides",value:function(e){return t=this.vertices,i=this.polygonNormals,r=e.vertices,n=e.polygonNormals,i.every((function(e){return x(e,t,r)}))&&n.every((function(e){return x(e,t,r)}));var t,i,r,n}},{key:"getJunctions",value:function(){for(var t=[],i=z(this.position,this.orientation),r=0;r<re.length;r++){for(var n=re[r],a=[],o=0;o<n.transforms.length;o++){var s=D(i,n.transforms[o]),h=new e;h.colorMask=this.colorMask,h.backgroundColor=n.swapColors?this.foregroundColor:this.backgroundColor,h.foregroundColor=n.swapColors?this.backgroundColor:this.foregroundColor,m.d.copy(h.position,s.position),m.c.copy(h.orientation,s.orientation),a.push(h)}var l=m.d.transformQuat(m.d.create(),n.pivot,this.orientation);m.d.add(l,l,this.position);var c=m.d.transformQuat(m.d.create(),n.normal,this.orientation);t.push({pivot:l,normal:c,prisms:a})}return t}},{key:"toArchive",value:function(){return{id:this.id,colorMask:this.colorMask,backgroundColor:this.backgroundColor,foregroundColor:this.foregroundColor,position:this.position,orientation:this.orientation}}},{key:"fromArchive",value:function(e){this.id=e.id,this.colorMask=e.colorMask,this.backgroundColor=e.backgroundColor,this.foregroundColor=e.foregroundColor,m.d.copy(this.position,e.position),m.c.copy(this.orientation,e.orientation)}},{key:"clone",value:function(){var t=new e;return t.id=this.id,t.colorMask=this.colorMask,t.backgroundColor=this.backgroundColor,t.foregroundColor=this.foregroundColor,m.d.copy(t.position,this.position),m.c.copy(t.orientation,this.orientation),m.d.copy(t.worldPosition,this.worldPosition),m.c.copy(t.worldOrientation,this.worldOrientation),t}}]),e}(),ae=Math.PI/180,oe=function(){function e(){Object(h.a)(this,e),this.prisms=[],this.lastPrismId=0,this.roll=0,this.pitch=0,this.yaw=0,this.aabb={min:m.d.create(),max:m.d.create(),center:m.d.create()}}return Object(l.a)(e,[{key:"getOrientation",value:function(){var e=m.c.create();return m.c.rotateY(e,e,this.yaw*ae),m.c.rotateX(e,e,this.roll*ae),m.c.rotateZ(e,e,this.pitch*ae),e}},{key:"applyTransform",value:function(){var e=this.getOrientation();m.d.zero(this.aabb.min),m.d.zero(this.aabb.max);for(var t=0;t<this.prisms.length;t++){var i=this.prisms[t];i.applyTransform(e);for(var r=0;r<i.vertices.length;r++){var n=i.vertices[r];0===t&&0===r?(m.d.copy(this.aabb.min,n),m.d.copy(this.aabb.max,n)):(m.d.min(this.aabb.min,this.aabb.min,n),m.d.max(this.aabb.max,this.aabb.max,n))}}m.d.add(this.aabb.center,this.aabb.min,this.aabb.max),m.d.scale(this.aabb.center,this.aabb.center,.5)}},{key:"translate",value:function(e){this.prisms.forEach((function(t){return m.d.add(t.position,t.position,e)}))}},{key:"rotate",value:function(e){this.prisms.forEach((function(t){m.d.transformQuat(t.position,t.position,e),m.c.multiply(t.orientation,e,t.orientation)}))}},{key:"findPrism",value:function(e){for(var t=0;t<this.prisms.length;t++){var i=this.prisms[t];if(i.id===e)return i}return null}},{key:"intersect",value:function(e){for(var t,i,r=0;r<this.prisms.length;r++){var n=this.prisms[r],a=n.intersect(e);void 0!==a&&(void 0===i||a<i)&&(t=n,i=a)}if(t)return{hitPrism:t,hitDistance:i}}},{key:"getAvailableJunctions",value:function(e){var t=this,i=this.getOrientation(),r=e.getJunctions();return r.forEach((function(r){m.d.transformQuat(r.pivot,r.pivot,i),m.d.transformQuat(r.normal,r.normal,i),r.prisms.forEach((function(e){return e.applyTransform(i)})),r.prisms=r.prisms.filter((function(i){return t.prisms.every((function(t){return t===e||!t.collides(i)}))}))})),r.filter((function(e){return e.prisms.length>0}))}},{key:"toArchive",value:function(){return{prisms:this.prisms.map((function(e){return e.toArchive()})),lastPrismId:this.lastPrismId,roll:this.roll,pitch:this.pitch,yaw:this.yaw}}},{key:"fromArchive",value:function(e){this.prisms=e.prisms.map((function(e){var t=new ne;return t.fromArchive(e),t})),this.lastPrismId=e.lastPrismId,this.roll=e.roll,this.pitch=e.pitch,this.yaw=e.yaw}},{key:"clone",value:function(){for(var t=new e,i=0;i<this.prisms.length;i++)t.prisms.push(this.prisms[i].clone());return t.lastPrismId=this.lastPrismId,t.roll=this.roll,t.pitch=this.pitch,t.yaw=this.yaw,m.d.copy(t.aabb.min,this.aabb.min),m.d.copy(t.aabb.max,this.aabb.max),m.d.copy(t.aabb.center,this.aabb.center),t}}],[{key:"createInitialShape",value:function(){var t=new e,i=new ne;return i.id=++t.lastPrismId,i.backgroundColor="#1976d2",i.foregroundColor="#d9d9d9",t.prisms.push(i),t.applyTransform(),t}}]),e}(),se=Math.PI/180,he=function(){function e(){Object(h.a)(this,e),this.pieceCount=0,this.shape=new oe}return Object(l.a)(e,[{key:"addPrism",value:function(e,t,i){var r;this.shape.prisms.length>0?r=this.shape.prisms[this.shape.prisms.length-1].getJunctions()[1].prisms[0]:r=new ne;r.id=++this.shape.lastPrismId,r.colorMask=e,r.backgroundColor=t,r.foregroundColor=i,this.shape.prisms.push(r),this.pieceCount++}},{key:"fold",value:function(e){var t,i=e.split("-"),r=Object(d.a)(i);try{for(r.s();!(t=r.n()).done;){var n=t.value,a=void 0,o=void 0;if(-1!==(a=n.indexOf("L")))o=!0;else{if(-1===(a=n.indexOf("R")))return!1;o=!1}var s=n.substring(0,a);if(!s)return!1;var h=2*(parseInt(s,10)-1);if(h<0||h>=this.pieceCount)return!1;var l=n.substring(a+1);if(!l)return!1;var c=parseInt(l,10);if(c){if(c<1||c>3)return!1;if(c<3){for(var u=0;u<c;u++)if(!this.twist(h,o,o))return!1}else if(!this.twist(h,o,!o))return!1}}}catch(m){r.e(m)}finally{r.f()}return!0}},{key:"twist",value:function(e,t,i){if(e<0||e>=this.pieceCount)return!1;var r=this.shape.prisms[e].getJunctions(),n=t?r[0]:r[1],a=(i?1:-1)*Math.PI/2;if(t)for(var o=e-1;o>=0;o--)this.twistPrism(o,n.pivot,n.normal,a);else for(var s=e+1;s<this.pieceCount;s++)this.twistPrism(s,n.pivot,n.normal,a);return!0}},{key:"twistPrism",value:function(e,t,i,r){var n=this.shape.prisms[e],a=G(z(n.position,n.orientation),t,i,r);m.d.copy(n.position,a.position),m.c.copy(n.orientation,a.orientation)}},{key:"applyRotations",value:function(e){if(0===e.length)return!0;var t,i=m.c.create(),r=m.c.create(),n=m.d.create(),a=Object(d.a)(e);try{for(a.s();!(t=a.n()).done;){var o=t.value;if(4!==o.length)return!1;m.d.set(n,o[0],o[2],-o[1]),m.d.normalize(n,n),m.c.setAxisAngle(r,n,o[3]*se),m.c.multiply(i,r,i)}}catch(s){a.e(s)}finally{a.f()}return this.shape.rotate(i),!0}}],[{key:"build",value:function(t,i){var r=i.definitions.find((function(e){return e.name===t}));if(r){var n=e.compileSkin(r.skin,i);if(n){for(var a=new e,o=0;o<r.pieces;o++){var s=n.colors[o%n.colors.length];a.addPrism(n.mask,s[0],s[1])}if(a.fold(r.notation)&&a.applyRotations(r.rotations)){var h=a.shape;return h.applyTransform(),h.translate(m.d.negate(m.d.create(),h.aabb.center)),h.applyTransform(),h}}}}},{key:"compileSkin",value:function(e,t){var i="~"===e.charAt(0)?1:0,r=e.lastIndexOf(":"),n=e.substring(i,-1!==r?r:e.length),a=t.skins.definitions.find((function(e){return e.name===n}));if(a){var o=t.skins.patterns.find((function(e){return e.key===a.pattern}));if(o){var s,h=-1===r?a.mask:parseInt(e.substring(r+1)),l=[],c=Object(d.a)(o.value);try{for(c.s();!(s=c.n()).done;){var u,m=s.value,p=[],f=Object(d.a)(m);try{var v=function(){var e=u.value;if(e<1||e>a.colors.length)return{v:void 0};var i=a.colors[e-1],r=t.skins.colors.find((function(e){return e.key===i}));if(!r)return{v:void 0};p.push(r.value)};for(f.s();!(u=f.n()).done;){var g=v();if("object"===typeof g)return g.v}}catch(y){f.e(y)}finally{f.f()}l.push(p)}}catch(y){c.e(y)}finally{c.f()}return i>0&&l.reverse(),{mask:h,colors:l}}}}}]),e}(),le=function(e){Object(c.a)(i,e);var t=Object(u.a)(i);function i(e){var r;Object(h.a)(this,i),r=t.call(this,e);var n=oe.createInitialShape();return r.state={shape:n,activePrism:null,historyEntries:[],historyIndex:-1},r.figures=null,r.figureRandomIndices=null,r.figureIndex=-1,r.addHistoryEntry(r.state,n),r}return Object(l.a)(i,[{key:"addHistoryEntry",value:function(e,t){var i=e.historyIndex+1,r=i>=30?i-30+1:0;i=Math.min(i,29),e.historyEntries=e.historyEntries.splice(r,i),e.historyEntries.push({shape:t,activePrism:this.state.activePrism}),e.historyIndex=e.historyEntries.length-1}},{key:"showFigure",value:function(e){var t=he.build(e,this.figures);t&&this.handleShapeChange(t,!0)}},{key:"handleShapeChange",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]&&arguments[1],i={shape:e,historyEntries:this.state.historyEntries,historyIndex:this.state.historyIndex};t?i.activePrism=null:this.state.activePrism&&(i.activePrism=e.findPrism(this.state.activePrism.id)),this.addHistoryEntry(i,e),this.setState(i)}},{key:"handleActivePrismChange",value:function(e){this.setState({activePrism:e})}},{key:"handleHistoryChange",value:function(e){if(!(e<0||e>=this.state.historyEntries.length)){var t=this.state.historyEntries[e],i={shape:t.shape,activePrism:t.activePrism,historyIndex:e};this.setState(i)}}},{key:"handleShapeReset",value:function(){this.handleShapeChange(oe.createInitialShape(),!0)}},{key:"handleShapeShowcase",value:function(){var e=this;if(this.figures){this.figureIndex=(this.figureIndex+1)%this.figureRandomIndices.length;var t=this.figures.definitions[this.figureRandomIndices[this.figureIndex]].name;this.showFigure(t)}else fetch("res/figures.rsf").then((function(e){return e.json()})).then((function(t){e.figures=t,e.figureRandomIndices=Object(s.a)(Array(e.figures.definitions.length).keys()).map((function(e){return{sort:Math.random(),value:e}})).sort((function(e,t){return e.sort-t.sort})).map((function(e){return e.value})),e.figureIndex=-1,e.handleShapeShowcase()}))}},{key:"handleShapeImport",value:function(){var e=this,t=document.createElement("input");t.setAttribute("type","file"),t.setAttribute("accept",".twy"),t.addEventListener("change",(function(){if(t.files.length){var r=t.files[0],n=new FileReader;n.onload=function(t){var r=i.archiveToShape(t.target.result);r&&e.handleShapeChange(r,!0)},n.readAsText(r)}})),t.click()}},{key:"handleShapeExport",value:function(e){var t=prompt("Enter shape name: ");if(t){var r=document.createElement("a"),n=i.shapeToArchive(e),a=new Blob([n],{type:"text/plain;charset=utf-8"});r.href=URL.createObjectURL(a),r.download=t+".twy",document.body.appendChild(r),r.click()}}},{key:"render",value:function(){var e=this;return n.a.createElement("div",{className:"App"},n.a.createElement(B,{shape:this.state.shape,activePrism:this.state.activePrism,onShapeChange:function(t){return e.handleShapeChange(t)},onActivePrismChange:function(t){return e.handleActivePrismChange(t)}}),n.a.createElement(Y,{shape:this.state.shape,activePrism:this.state.activePrism,historyEntries:this.state.historyEntries,historyIndex:this.state.historyIndex,onShapeChange:function(t){return e.handleShapeChange(t)},onHistoryChange:function(t){return e.handleHistoryChange(t)},onShapeReset:function(){return e.handleShapeReset()},onShapeShowcase:function(){return e.handleShapeShowcase()},onShapeImport:function(){return e.handleShapeImport()},onShapeExport:function(t){return e.handleShapeExport(t)}}))}}],[{key:"shapeToArchive",value:function(e){return JSON.stringify({version:1,shape:e.toArchive()})}},{key:"archiveToShape",value:function(e){var t=JSON.parse(e);if(1===t.version){var i=new oe;return i.fromArchive(t.shape),i.applyTransform(),i}alert("Unsupported version: "+t.version)}}]),i}(r.Component);Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));o.a.render(n.a.createElement(n.a.StrictMode,null,n.a.createElement(le,null)),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then((function(e){e.unregister()})).catch((function(e){console.error(e.message)}))},38:function(e,t,i){},99:function(e,t,i){e.exports=i(270)}},[[99,1,2]]]);
//# sourceMappingURL=main.2c716421.chunk.js.map