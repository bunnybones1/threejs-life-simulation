var THREE = require('three');
//for ball physics
var __initVelocity = .0002;
var __initVelocityHalf = __initVelocity * .5;

var __geometry;
function __getGeometry(radius) {
    if(__geometry == null) {
        __geometry = new THREE.SphereGeometry(radius);
    }
    return __geometry;
}

function Animal(radius, material) {
    THREE.Mesh.call(
        this,
        __getGeometry(radius),
        material
    );
    //extra stuff for physics
    var mass = Math.pow(radius, 3)
    this.mass = mass;
    this.velocity = new THREE.Vector3(
        (Math.random() * __initVelocity - __initVelocityHalf) / mass,
        (Math.random() * __initVelocity - __initVelocityHalf) / mass,
        (Math.random() * __initVelocity - __initVelocityHalf) / mass
    );
}
Animal.prototype = Object.create(THREE.Mesh.prototype);

module.exports = Animal;
