var THREE = require('three');

var colorEarth = new THREE.Color(0.7, 0.4, 0.2);
var shininessEarth = 10;
var colorGrass = new THREE.Color(0.5, 0.9, 0.3);
var shininessGrass = 100;

function WorldGrid(cols=256, rows=256, layers=32, unitScale = 0.025) {
    var boundsMax = new THREE.Vector3(
        cols * unitScale,
        layers * unitScale,
        rows * unitScale
    );
    var boundsMin = new THREE.Vector3();
    var bounds = new THREE.Box3(boundsMin, boundsMax);
    this.bounds = bounds;
    var totalCells = cols * layers * rows;
    var bytes = totalCells * 4;
    var densityFieldBuffer = new ArrayBuffer(bytes);
    var densityFieldData = new Int16Array(densityFieldBuffer);
    var velFieldXBuffer = new ArrayBuffer(bytes);
    var velFieldXData = new Float32Array(velFieldXBuffer);
    var velFieldYBuffer = new ArrayBuffer(bytes);
    var velFieldYData = new Float32Array(velFieldYBuffer);
    var velFieldZBuffer = new ArrayBuffer(bytes);
    var velFieldZData = new Float32Array(velFieldZBuffer);
    var actorSunlight = [];
    var actorMaterials = [];
    var actorPositions = [];
    var actorVelocities = [];
    var actorElementIds = [];
    var unitScaleInv = 1 / unitScale;

    var gravity = -0.005;

    var xOffset = 1;
    var zOffset = cols;
    var yOffset = cols * rows;

    var rangeX = cols * unitScale;
    var rangeY = layers * unitScale;
    var rangeZ = rows * unitScale;

    function clamp(val, min, max) {
        if(val >= max) return max;
        if(val <= min) return min;
        return val;
    }

    function getIndexFromPos(pos) {
        var xi = clamp(Math.round(pos.x * unitScaleInv), 0, cols-1);
        var zi = clamp(Math.round(pos.z * unitScaleInv), 0, rows-1) * zOffset;
        var yi = clamp(Math.round(pos.y * unitScaleInv), 0, layers-1) * yOffset;
        return xi + zi + yi;
    }

    function getCellFromPos(pos) {
        var xi = clamp(Math.round(pos.x * unitScaleInv), 0, cols);
        var zi = clamp(Math.round(pos.z * unitScaleInv), 0, rows);
        var yi = clamp(Math.round(pos.y * unitScaleInv), 0, layers);
        return xi +" "+ zi +" "+ yi;
    }
    // var position = new THREE.Vector3();
    // function getIndexFromPos(pos) {
        // var xi = clamp(Math.round(pos.x * unitScaleInv), 0, cols);
        // var yi = clamp(Math.round(pos.y * unitScaleInv), 0, rows) * yOffset;
        // var zi = clamp(Math.round(pos.z * unitScaleInv), 0, layers) * zOffset;
        // return xi + yi + zi;
    // }
    function sampleDensity(pos) {
        return densityFieldData[getIndexFromPos(pos)];
    }
    function GetDensitySafe(index) {
        return densityFieldData[clamp(index, 0, totalCells-1)];
    }


    var normal = new THREE.Vector3();
    function n(x, y, z) {
        return new THREE.Vector3(x * unitScale, y * unitScale, z * unitScale).multiplyScalar(0.25);
    }
    var indexOffset = [
        -yOffset,
        -yOffset+xOffset,
        -yOffset-xOffset,
        -yOffset+zOffset,
        -yOffset-zOffset,
        xOffset,
        -xOffset,
        zOffset,
        -zOffset,
        yOffset,
        yOffset+xOffset,
        yOffset-xOffset,
        yOffset+zOffset,
        yOffset-zOffset
    ];
    var offsetNormals = [
        n(0, -1, 0),
        n(1, -1, 0),
        n(-1, -1, 0),
        n(0, -1, 1),
        n(0, -1, -1),
        n(1, 0, 0),
        n(-1, 0, 0),
        n(0, 0, 1),
        n(0, 0, -1),
        n(0, 1, 0),
        n(1, 1, 0),
        n(-1, 1, 0),
        n(0, 1, 1),
        n(0, 1, -1)
    ];
    var indexOffsetDownhill = [
         xOffset -yOffset,
        -xOffset -yOffset,
                 -yOffset +zOffset,
                 -yOffset -zOffset,
        +xOffset -yOffset +zOffset,
        -xOffset -yOffset -zOffset,
        -xOffset -yOffset +zOffset,
        +xOffset -yOffset -zOffset
    ];
    var offsetNormalsDownhill = [
        n(1, -1, 0),
        n(-1, -1, 0),
        n(0, -1, 1),
        n(0, -1, -1),
        n(1, -1, 1),
        n(-1, -1, -1),
        n(-1, -1, 1),
        n(1, -1, -1),
    ];
    function downhill(index) {
        for(var i = 0; i < totalOffsets; i++) {
            if(densityFieldData[index + indexOffsetDownhill[i]] == 0) {
                normal.copy(offsetNormalsDownhill[i]);
                return true;
            }
        }
        return false;
    }
    var offsetNormalsUpish = offsetNormals.slice(offsetNormals.length - 5, offsetNormals.length);
    var totalOffsets = indexOffset.length;
    function calculateLessDenseNormalNearIndex(index, density) {
        for(var i = 0; i < totalOffsets; i++) {
            if(densityFieldData[index + indexOffset[i]] < density) {
                normal.copy(offsetNormals[i]);
                return true;
            }
        }
        return false;
    }
	var randPos = () => Math.random() - 0.5;
    function wiggle(index, density) {
        var nearby = calculateLessDenseNormalNearIndex(index, density);
        if(!nearby) {
            normal.copy(offsetNormalsUpish[~~(offsetNormalsUpish.length * Math.random())]);
            // normal.x = randPos();
            // normal.y = randPos();
            // normal.z = randPos();
            // normal.normalize().multiplyScalar(unitScale);
        }
        // normal.multiplyScalar(0.25);
        return normal;
    }
    function getDensityNormal(pos) {
        var i = getIndexFromPos(pos);
        normal.x = GetDensitySafe(i-xOffset) - GetDensitySafe(i+xOffset);
        normal.y = GetDensitySafe(i-yOffset) - GetDensitySafe(i+yOffset);
        normal.z = GetDensitySafe(i-zOffset) - GetDensitySafe(i+zOffset);
        normal.normalize().multiplyScalar(unitScale * 0.25);
        return normal;
    }

    var lastTime = Date.now();
    var timeStep = 1000/60;

    this.onEnterFrame = function onEnterFrame() {
        var now = Date.now();
        var ticksAllowed = 4;
        while(now > lastTime + timeStep && ticksAllowed > 0) {
            lastTime += timeStep;
            tickPhysics();
            ticksAllowed--;
        }
        if(ticksAllowed == 0) {
            lastTime = now;
        }
    }
    function tickPhysics() {
        var totalActors = actorElementIds.length;
        //move out of highly dense areas
        for(var i = totalActors-1; i >= 0; i--) {
            var pos = actorPositions[i];
            var index = actorElementIds[i];
            densityFieldData[index]--;
            if(densityFieldData[index] > 0) {
                pos.add(getDensityNormal(pos));
                pos.x = (pos.x + rangeX) % rangeX;
                pos.y = clamp(pos.y, 0, rangeY);
                pos.z = (pos.z + rangeZ) % rangeZ;
                index = getIndexFromPos(pos);
            }
            densityFieldData[index]++;
            actorElementIds[i] = index;
        }
        //integrate actor velocities and gravity
        //exchange velocity information with the velocity field
        for(var i = totalActors-1; i >= 0; i--) {
            var index = actorElementIds[i];
            densityFieldData[index]--;
            var oldIndex = index;
            var pos = actorPositions[i];
            // console.log(i + ": " + getCellFromPos(pos));
            var vel = actorVelocities[i];
            var thickness = 4 / (4 + densityFieldData[index]);
            var invThickness = 1 - thickness;
            vel.x *= thickness;
            vel.y *= thickness;
            vel.z *= thickness;
            velFieldXData[index] += vel.x * invThickness;
            velFieldYData[index] += vel.y * invThickness;
            velFieldZData[index] += vel.z * invThickness;
            vel.x += velFieldXData[index] * invThickness;
            vel.y += velFieldYData[index] * invThickness;
            vel.z += velFieldZData[index] * invThickness;

            velFieldXData[index] *= 0.8;
            velFieldYData[index] *= 0.8;
            velFieldZData[index] *= 0.8;

            var yNormal = GetDensitySafe(index-yOffset);

            if(yNormal == 0 && pos.y > 0.01) {
                vel.y += gravity;
                vel.x *= 0.98;
                vel.z *= 0.98;
                getCellFromPos(pos);
            } else {
                vel.y = 0;
                if(pos.y <= 0.1) {
                    vel.x *= 0.9;
                    vel.z *= 0.9;
                }
            }
            
            pos.x = (pos.x + vel.x + rangeX) % rangeX;
            pos.y = clamp(pos.y + vel.y, 0, rangeY);
            pos.z = (pos.z + vel.z + rangeZ) % rangeZ;

            if(pos.y < 0) {
                pos.y = 0;
                vel.y = 0;
            } else if(pos.y > rangeY) {
                pos.y = rangeY;
                vel.y = 0;
            }
            index = getIndexFromPos(pos);
            actorElementIds[i] = index;
            densityFieldData[index]++;
            if(oldIndex != index && densityFieldData[oldIndex] == 0) {
                velFieldXData[index] += velFieldXData[oldIndex] * 0.9;
                velFieldYData[index] += velFieldYData[oldIndex] * 0.9;
                velFieldZData[index] += velFieldZData[oldIndex] * 0.9;
                velFieldXData[oldIndex] = 0;
                velFieldYData[oldIndex] = 0;
                velFieldZData[oldIndex] = 0;
            }
        }
        //wiggle actors stuck in highly dense areas with no obvious gradient
        //otherwise just snap them to their closest cell
        for(var i = totalActors-1; i >= 0; i--) {
            if(actorMaterials[i].emissive.r > 0) {
                actorMaterials[i].emissive.r -= 0.01;
                actorMaterials[i].emissive.g -= 0.005;
            }
            var index = actorElementIds[i];
            densityFieldData[index]--;
            var density = densityFieldData[index];
            var pos = actorPositions[i];
            if(density >= 1) {
                pos.add(wiggle(index, density));
                // actorMaterials[i].color.set(0xffff00);
            } else {
                // if(downhill(index)) {
                //     pos.add(normal);
                // } else {
                    pos.x -= (pos.x - Math.round(pos.x / unitScale) * unitScale) * 0.25;
                    pos.y -= (pos.y - Math.round(pos.y / unitScale) * unitScale) * 0.25;
                    pos.z -= (pos.z - Math.round(pos.z / unitScale) * unitScale) * 0.25;
                    // actorMaterials[i].color.set(0xffffff);
                // }
            }
            index = getIndexFromPos(pos);
            actorElementIds[i] = index;
            densityFieldData[index]++;
        }
        //sunlight and materials
        for(var i = totalActors-1; i >= 0; i--) {
            var index = actorElementIds[i];
            var density = densityFieldData[index + yOffset];
            var changed = false;
            var sunlight = actorSunlight[i];
            if(density == 0 && sunlight < 1) {
                sunlight += 0.001;
                changed = true;
            } else if(density > 0 && sunlight > 0) {
                sunlight -= 0.01;
                changed = true;
            }
            if(changed) {
                actorSunlight[i] = sunlight;
                actorMaterials[i].color.copy(colorEarth).lerp(colorGrass, sunlight);
                actorMaterials[i].shininess = shininessEarth * (1-sunlight) + shininessGrass * sunlight;
            }
        }
    }

    this.addActorPosition = function addActorPosition(pos, vel, mat) {
        actorPositions.push(pos);
        actorVelocities.push(vel);
        actorMaterials.push(mat);
        mat.color.copy(colorEarth);
        mat.shininess = shininessEarth;
        actorSunlight.push(0);
        actorElementIds.push(getIndexFromPos(pos));
        densityFieldData[getIndexFromPos(pos)]++;
    }
    this.removeActorPosition = function removeActorPosition(pos) {
        var index = actorPositions.indexOf(pos);
        if(index != -1) {
            densityFieldData[getIndexFromPos(actorPositions[index])]--;
            actorPositions.splice(index, 1);
            actorVelocities.splice(index, 1);
            actorElementIds.splice(index, 1);
            actorMaterials.splice(index, 1);
            actorSunlight.splice(index, 1);
        }        
    }

    var position = new THREE.Vector3();
    function boom(pos, radius) {
        var startIndex;
        do {
            startIndex = getIndexFromPos(pos);
            pos.y += unitScale;
        } while (densityFieldData[startIndex] > 0)

        var radiusSquared = radius * radius;
        for(var ix = pos.x - radius; ix < pos.x + radius; ix += unitScale) {
            for(var iy = pos.y - radius; iy < pos.y + radius; iy += unitScale) {
                for(var iz = pos.z - radius; iz < pos.z + radius; iz += unitScale) {
                    position.set(ix, iy, iz);
                    var index = getIndexFromPos(position);
                    position.sub(pos);
                    if(position.lengthSq() < radiusSquared) {
                        position.normalize().multiplyScalar(0.0525);
                        position.y += 0.15;
                        // velFieldXData[index] += position.x;
                        // velFieldYData[index] += position.y;
                        // velFieldZData[index] += position.z;
                        var actorIndex = actorElementIds.indexOf(index);
                        if(actorIndex != -1) {
                            actorVelocities[actorIndex].add(position);
                            actorMaterials[actorIndex].emissive.r += 0.5;
                            actorMaterials[actorIndex].emissive.g += 0.25;
                            actorSunlight[actorIndex] = -0.25;
                        }
                    }
                }
            }
        }
    }
    this.boom = boom; 

    this.boomFromRay = function boomFromRay(pos, normal) {
        // var fastestAxis = Math.abs(normal.x) > Math.abs(normal.y) ? "x" : "y";
        // fastestAxis = Math.abs(normal[fastestAxis]) > Math.abs(normal.z) ? fastestAxis : "z";
        var hit = false;
        normal.normalize().multiplyScalar(0.5);
        while(!hit && bounds.containsPoint(pos)) {
            var i = getIndexFromPos(pos);
            hit = GetDensitySafe(i) > 0;
            pos.add(normal);
        }
        if(hit) {
            boom(pos, 1);
        }
    }
}

module.exports = WorldGrid;
