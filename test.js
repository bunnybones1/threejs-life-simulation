var THREE = require('three');
// require('./utils/threeSafety');
window.THREE = THREE;
var ManagedView = require('threejs-managed-view');
var LifeSimulation = require('./');
var makeCubeletTexture = require('./makeCubeletTexture');
var urlparam = require('urlparam');
var view = new ManagedView.View({
	skipFrames: 10
});

var debugOverdraw = false;
//lights
var light = new THREE.PointLight(0xffffff, 0.7);
light.position.x += 100;
light.position.y += 100;
view.scene.add(light);
var hemisphereLight = new THREE.HemisphereLight(0x4f7f8f, 0x4f2f00);
view.scene.add(hemisphereLight);
var matParams = {
	color: 0xffffff,
	emissive: 0x000000,
	// color: 0xff4422,
	shininess: 100,
	blending: debugOverdraw ? THREE.AdditiveBlending : THREE.NormalBlending
};
var mat = new THREE.MeshPhongMaterial(matParams);

view.renderer.setClearColor(debugOverdraw ? 0x000000 : 0xdfefef, 1);

var life = new LifeSimulation(urlparam('particles', 1000), mat);

// for(var y = 0; y < 2; y += 0.125) {
// 	life.makeAnimal(new THREE.Vector3(20, y, 20), new THREE.Vector3());
// }
view.scene.add(life);

view.renderManager.onEnterFrame.add(() => life.onEnterFrame());
view.camera.position.x += 13;
view.camera.position.y += 2;
view.camera.position.z += 15;
view.camera.fov = 70;
view.camera.updateProjectionMatrix();
// var first = true;
var centerOfView = new THREE.Vector3();
var tasks = [];
view.renderManager.onEnterFrame.add(function updateCubelet() {
	makeCubeletTexture(
		view.renderer,
		[light, hemisphereLight],
		view.camera.rotation,
		function recieveTexture(tex) {
			life.texture = tex;
		}
	);
});

//it costs more to sort for lower overdraw than it saves
// setInterval(function() {
// 	life.optimizeForCamera(view.camera);
// }, 1000);

function onEnterFrame() {
	if(tasks.length > 0) {
		for(var i = 0; i < tasks.length; i++) {
			tasks[i]();
		}
		tasks.length = 0;
	}
	//put light and camera focus in the center of gravity
	light.position.copy(life.centerOfMass);
	light.position.x += 10;
	light.position.y += 10;
	var delta = view.camera.position.clone().sub(life.centerOfMass);
	var angle = Math.atan2(delta.z, delta.x);
	angle += 0.002;
	var distance = Math.sqrt(delta.x*delta.x + delta.z*delta.z);
	var delta2 = delta.clone();
	delta2.x = Math.cos(angle) * distance;
	delta2.z = Math.sin(angle) * distance;
	life.cameraFov = view.camera.fov * camController.panZoomRegion.zoomValue;
	// view.camera.position.add(delta.sub(delta2));
	// if(first) {
		centerOfView.lerp(life.centerOfMass, 0.15);
		view.camera.lookAt(centerOfView);
		// view.camera.rotation.x -= 0.3;
		// view.camera.rotation.y += 0.3;
		// first = false;
	// }
}
view.renderManager.onEnterFrame.add(onEnterFrame);

var RafTweener = require("raf-tweener");
var Pointers = require('input-unified-pointers');
var MouseWheel = require('input-mousewheel');
var CameraController = require("threejs-camera-controller-pan-zoom-unified-pointer");

var pointers = new Pointers(view.canvas);
var mouseWheel = new MouseWheel(view.canvas);
var rafTweener = new RafTweener();
rafTweener.start();
var camController = new CameraController({
	camera: view.camera,
	tweener: rafTweener,
	pointers: pointers,
	mouseWheel: mouseWheel,
	panSpeed: 0.02,
	fovMin: 50,
	fovMax: 70,
	zoomMax: 0.25
});
camController.setState(true);
camController.setSize(window.innerWidth, window.innerHeight);

var otherCamera = new THREE.PerspectiveCamera();
otherCamera.updateProjectionMatrix();

function setOtherCameraSize(w, h) {
	otherCamera.setViewOffset(
		w, 
		h, 
		w * 0.25, 
		h * 0.25, 
		w * 0.5, 
		h * 0.5
	);
}
setOtherCameraSize(window.innerWidth, window.innerHeight);
view.onResizeSignal.add(setOtherCameraSize);

view.renderManager.onEnterFrame.add(function(){
	camController.precomposeViewport(otherCamera);
});
view.renderManager.skipFrames = urlparam('skipFrames', 0);