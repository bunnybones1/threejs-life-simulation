var THREE = require('three');
var Animal = require('./GameObjects/Animal');
var WorldGrid = require('./physics/WorldGrid');

var birthBoxSize = 1;
var birthBoxSizeHalf = birthBoxSize * .5;
var randPos = () => Math.random() * birthBoxSize - birthBoxSizeHalf;

function LifeSimulation(maxAnimals, material) {
	THREE.Object3D.call(this);
	material = material ? material : new THREE.MeshBasicMaterial();

	//all units are in metres
	this.maxAnimals = maxAnimals !== undefined ? maxAnimals : 100;
	var animals = [];


	//for center of gravity
	this.totalMass = 0;
	this.centerOfMass = new THREE.Vector3();
	
	var radius = 0.15;
	this.worldGrid = new WorldGrid(512, 512, 128, radius * 2 * 0.66);


	function makeAnimal(pos, vel) {
		var animal = new Animal(radius, material.clone());
		if(pos) {
			animal.position.copy(pos);
		} else {
			animal.position.set(randPos()+25, randPos(), randPos()+20);
		}
		this.totalMass += animal.mass;
		
		animals.push(animal);
		animal.color = animal.material.color;
		animal.colorGlow = animal.material.emissive;
		// this.add(animal);
		var velocity = vel || new THREE.Vector3(randPos()*4, randPos() + birthBoxSize * 6, randPos()+5);
		velocity.normalize();
		velocity.multiplyScalar(0.5);
		this.worldGrid.addActorPosition(animal.position, velocity, animal.material);
	}
	this.timer = 0;
	this.makeAnimal = makeAnimal;
	this.animals = animals;

	var particlesMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
		size: 1,
		sizeAttenuation: true,
		map: null,
		// depthWrite: true,
		alphaTest: 0.5,
		transparent: true,
		vertexColors: THREE.VertexColors,
		vertexColorsGlow: THREE.VertexColors,
		blending: material.blending
		// defines: ["USE_COLOR", "USE_COLOR_GLOW"]
	});
	Object.defineProperty(this, "texture", {
		set: function(value) {
			particlesMaterial.map = value;
		}
	})
    var particlesGeometry = new THREE.BufferGeometry();
    var positionBuffer = new Float32Array(3 * maxAnimals);
    var colorBuffer = new Float32Array(3 * maxAnimals);
    var colorGlowBuffer = new Float32Array(3 * maxAnimals);
    for(var i = 0 ; i < positionBuffer.length; i++) {
        positionBuffer[i] = randPos() * 3;
        colorBuffer[i] = Math.random();
        colorGlowBuffer[i] = 0;
    }
	var positionAttribute = new THREE.BufferAttribute(positionBuffer, 3);
	particlesGeometry.addAttribute("position", positionAttribute);
	var colorAttribute = new THREE.BufferAttribute(colorBuffer, 3);
	particlesGeometry.addAttribute("color", colorAttribute);
	var colorGlowAttribute = new THREE.BufferAttribute(colorGlowBuffer, 3);
	particlesGeometry.addAttribute("colorGlow", colorGlowAttribute);

	var particles = new THREE.Points(particlesGeometry, particlesMaterial);
	particles.setThings = function setThings(index, position, color, colorGlow) {
		var i3 = index * 3;
		position.toArray(positionBuffer, i3);
		color.toArray(colorBuffer, i3);
		colorGlow.toArray(colorGlowBuffer, i3);
	}
	particles.updateAttributes = function updateAttributes() {
		positionAttribute.needsUpdate = true;
		colorAttribute.needsUpdate = true;
		colorGlowAttribute.needsUpdate = true;
	}
	// particles.position.set(randPos()+25, randPos(), randPos()+20);
	this.add(particles);
	this.particles = particles;

	this.optimizeForCamera = function(camera) {
		var total = animals.length;
		for(var i = 0; i < total; i++) {
			animals[i].sortDistance = camera.position.distanceToSquared(animals[i].position);
		}
		animals.sort(function(a, b) {
			return a.sortDistance - b.sortDistance;
		});
	}

	//let make some animals!
	// for (var i = this.maxAnimals - 1; i >= 0; i--) {
	// 	//standard threejs animal stuff
	// 	makeAnimal();
	// }
}

LifeSimulation.prototype = Object.create(THREE.Object3D.prototype);

var boomed = false;
//on every frame
var lastTime = Date.now();
LifeSimulation.prototype.onEnterFrame = function () {
	this.timer += (Date.now() - lastTime) * 0.001;
	lastTime = Date.now();
	this.worldGrid.onEnterFrame();
	if(this.animals.length < this.maxAnimals) {
		var newAnimals = (Math.sin(this.timer) + 1) * 20;
		newAnimals += Math.max(0, Math.cos(this.timer * 4.5) - 0.7) * 500;
		for(var i = 0; i < newAnimals; i++) {
			this.makeAnimal();
		}
	}
	// console.log(FPS.animSpeedCompensation);
	//calculate center of gravity
	this.centerOfMass.set(0,0,0);
	for (var i = this.animals.length - 1; i >= 0; i--) {
		var animal = this.animals[i];
		this.centerOfMass.add(animal.position);
	};
	this.centerOfMass.multiplyScalar(1/this.animals.length);
	// //keeps the center of gravity from drifting into space
	// this.centerOfMass.multiplyScalar(.99);
	// //apply physics
	// for (var i = this.totalAnimals - 1; i >= 0; i--) {
	// 	var animal = this.animals[i];
	// 	var dist = animal.position.clone().sub(this.centerOfMass);
	// 	animal.velocity.sub(
	// 		dist.multiplyScalar(.00001 / (animal.mass * dist.length()))
	// 	);
	// 	animal.position.add(animal.velocity);
	// 	animal.scale.z = 1 + animal.velocity.length() * 30;
	// 	animal.scale.x = animal.scale.y = 1/Math.sqrt(animal.scale.z);
	// 	animal.lookAt(animal.position.clone().add(animal.velocity))
	// };
	if(this.timer >= 10) {
		this.timer = 9.8;
		this.worldGrid.boom(new THREE.Vector3(randPos()*6+25, randPos()+0.5, randPos()*8+24), Math.random() * 0.5 + 0.75);
	}

	var particles = this.particles;
	var animals = this.animals;
	var total = this.animals.length;
	for(var i = 0; i < total; i++) {
		var animal = animals[i];
		particles.setThings(i, animal.position, animal.color, animal.colorGlow);
	}
	particles.updateAttributes();

}

module.exports = LifeSimulation;