function makeBallTexture(renderer, light = null) {
	var circleMap = new THREE.WebGLRenderTarget(32, 32);
	var tempCamera = new THREE.OrthographicCamera(-16, 16, -16, 16, -16, 16);
	var tempScene = new THREE.Scene();
	var tempBall = new THREE.Mesh(new THREE.SphereGeometry(16));
	tempScene.add(tempCamera);
	tempScene.add(tempBall);
    if(light) {
        light = light.clone();
        tempScene.add(light);
    }
    
	renderer.render();
}

module.exports = makeBallTexture;