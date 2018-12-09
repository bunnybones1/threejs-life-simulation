var THREE = require('three');
var Animal = require('./GameObjects/Animal');
var WorldGrid = require('./physics/WorldGrid');

function LifeSimulation(maxAnimals, material) {
	THREE.Object3D.call(this);
	material = material ? material : new THREE.MeshBasicMaterial();

	//all units are in metres
	this.maxAnimals = maxAnimals ? maxAnimals : 100;
	this.animals = [];

	var birthBoxSize = 1;
	var birthBoxSizeHalf = birthBoxSize * .5;
	var randPos = () => Math.random() * birthBoxSize - birthBoxSizeHalf;

	//for center of gravity
	this.totalMass = 0;
	this.centerOfMass = new THREE.Vector3();
	
	var radius = 0.15;
	this.worldGrid = new WorldGrid(512, 512, 128, radius * 0.66);


	function makeAnimal() {
		var animal = new Animal(radius, material);
		animal.position.set(randPos()+25, randPos(), randPos()+20);
		this.totalMass += animal.mass;
		this.animals.push(animal);
		this.add(animal);
		var vel = new THREE.Vector3(randPos()*4, randPos() + birthBoxSize * 6, randPos()+7);
		vel.normalize();
		vel.multiplyScalar(0.4);
		this.worldGrid.addActorPosition(animal.position, vel);
	}
	this.timer = 0;
	this.makeAnimal = makeAnimal;
	//let make some animals!
	// for (var i = this.maxAnimals - 1; i >= 0; i--) {
	// 	//standard threejs animal stuff
	// 	makeAnimal();
	// }
}

LifeSimulation.prototype = Object.create(THREE.Object3D.prototype);

//on every frame
LifeSimulation.prototype.onEnterFrame = function () {
	this.timer += 0.2;
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
}

module.exports = LifeSimulation;