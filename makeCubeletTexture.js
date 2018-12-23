var initd = false;
var circleMap, camera, scene, ball, temp;

function makeCubeletTexture(renderer, lights = null, angle = 0, reciever) {
    if(!initd) {
        var size = 16;
        var halfSize = size * 0.5;
        var cornerRoundness = 0.25;
        var cornerRadius = halfSize * cornerRoundness;
        var nonRoundHalfSize = halfSize - cornerRadius;
        initd = true;
        circleMap = new THREE.WebGLRenderTarget(64, 64, {
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType
        });
        camera = new THREE.OrthographicCamera(-16, 16, 16, -16, -16, 16);
        scene = new THREE.Scene();
        ball = new THREE.Mesh(new THREE.SphereGeometry(cornerRadius, 32, 16), new THREE.MeshPhongMaterial({
            color: 0xffffff,
            shininess: 40
        }));
        temp = new THREE.Vector3();
        ball.geometry.vertices.forEach( vertex => {
            temp.copy(vertex);
            temp.x += temp.x > 0 ? nonRoundHalfSize : -nonRoundHalfSize;
            temp.y += temp.y > 0 ? nonRoundHalfSize : -nonRoundHalfSize;
            temp.z += temp.z > 0 ? nonRoundHalfSize : -nonRoundHalfSize;
            vertex.add(temp);
        })
        scene.add(camera);
        scene.add(ball);
        if(lights) {
            lights.forEach(function(light) {
                light = light.clone();
                scene.add(light);
            });
        }
    }
    camera.rotation.copy(angle);
    var color = renderer.getClearColor().clone();
    var alpha = renderer.getClearAlpha();
    renderer.setClearColor(0xffffff, 0);
    renderer.render(scene, camera, circleMap);
    renderer.setClearColor(color, alpha);
    reciever(circleMap.texture);
}

module.exports = makeCubeletTexture;