function makeBallTexture(renderer, lights = null, reciever) {
	var circleMap = new THREE.WebGLRenderTarget(32, 32, {
		format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType
    });
    var camera = new THREE.OrthographicCamera(-16, 16, 16, -16, -16, 16);
    camera.setRotationFromEuler(new THREE.Euler(Math.PI * -0.25, 0, 0));
	var scene = new THREE.Scene();
	var ball = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 16), new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 40
    }));
	scene.add(camera);
	scene.add(ball);
    if(lights) {
        lights.forEach(function(light) {
            light = light.clone();
            scene.add(light);
        });
    }
    var color = renderer.getClearColor().clone();
    var alpha = renderer.getClearAlpha();
    renderer.setClearColor(0xffffff, 0);
    renderer.render(scene, camera, circleMap);
    renderer.setClearColor(color, alpha);
    reciever(circleMap.texture);
}

module.exports = makeBallTexture;