var THREE = require('three');
window.THREE = THREE;
var ManagedView = require('threejs-managed-view');
var LifeSimulation = require('./');
var urlparam = require('urlparam');
var view = new ManagedView.View({
	skipFrames: 10
});

//lights
var light = new THREE.PointLight(0xffffff, 0.7);
view.scene.add(light);
var hemisphereLight = new THREE.HemisphereLight(0x4f7f8f, 0x4f2f00);
view.scene.add(hemisphereLight);
var mat = new THREE.MeshPhongMaterial({
	// color: 0xffffff
	shininess: 100,
	color: 0xff4422
});

view.renderer.setClearColor(0xdfefef);

var life = new LifeSimulation(5000, mat);
view.scene.add(life);

view.renderManager.onEnterFrame.add(() => life.onEnterFrame());
view.camera.position.x += 15;
view.camera.position.z += 5;
// view.camera.fov *= 0.5;
view.camera.updateProjectionMatrix();
var first = true;
function onEnterFrame() {
	//put light and camera focus in the center of gravity
	light.position.copy(life.centerOfMass);
	light.position.x += 10;
	light.position.y += 10;
	var delta = view.camera.position.clone().sub(life.centerOfMass);
	var angle = Math.atan2(delta.z, delta.x);
	// angle += 0.002;
	var distance = Math.sqrt(delta.x*delta.x + delta.z*delta.z);
	var delta2 = delta.clone();
	delta2.x = Math.cos(angle) * distance;
	delta2.z = Math.sin(angle) * distance;
	view.camera.position.add(delta.sub(delta2));
	if(first) {
		view.camera.lookAt(life.centerOfMass);
		view.camera.rotation.x -= 0.3;
		view.camera.rotation.y += 0.3;
		first = false;
	}
}
view.renderManager.onEnterFrame.add(onEnterFrame);

view.renderManager.skipFrames = urlparam('skipFrames', 0);