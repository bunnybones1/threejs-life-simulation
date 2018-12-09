var THREE = require('three');

function WorldGrid(cols=256, rows=256, layers=32, unitScale = 0.025) {
    var totalCells = cols * layers * rows;
    var bytes = totalCells * 4;
    var densityFieldBuffer = new ArrayBuffer(bytes);
    var densityFieldData = new Float32Array(densityFieldBuffer);
    var velFieldXBuffer = new ArrayBuffer(bytes);
    var velFieldXData = new Float32Array(velFieldXBuffer);
    var velFieldYBuffer = new ArrayBuffer(bytes);
    var velFieldYData = new Float32Array(velFieldYBuffer);
    var velFieldZBuffer = new ArrayBuffer(bytes);
    var velFieldZData = new Float32Array(velFieldZBuffer);
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
        var xi = clamp(Math.round(pos.x * unitScaleInv), 0, cols);
        var zi = clamp(Math.round(pos.z * unitScaleInv), 0, rows) * zOffset;
        var yi = clamp(Math.round(pos.y * unitScaleInv), 0, layers) * yOffset;
        return xi + zi + yi;
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
	var randPos = () => Math.random() - 0.5;
    function wiggle() {
        normal.x = randPos();
        normal.y = randPos();
        normal.z = randPos();
        normal.normalize().multiplyScalar(unitScale * 0.15);
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

    this.onEnterFrame = function onEnterFrame() {
        var totalActors = actorElementIds.length;
        //move out of highly dense areas
        for(var i = totalActors-1; i >= 0; i--) {
            var pos = actorPositions[i];
            var index = actorElementIds[i];
            densityFieldData[index]--;
            pos.add(getDensityNormal(pos));
            pos.x = (pos.x + rangeX) % rangeX;
            pos.y = clamp(pos.y, 0, rangeY);
            pos.z = (pos.z + rangeZ) % rangeZ;
            index = getIndexFromPos(pos);
            densityFieldData[index]++;
            actorElementIds[i] = index;
        }
        //integrate actor velocities and gravity
        //exchange velocity information with the velocity field
        for(var i = totalActors-1; i >= 0; i--) {
            var index = actorElementIds[i];
            var oldIndex = index;
            var pos = actorPositions[i];
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

            densityFieldData[index]--;
            var yNormal = GetDensitySafe(index-yOffset);
            if(yNormal == 0 && pos.y > 0.01) {
                vel.y += gravity;
            } else {
                vel.y = 0;
                if(pos.y <= 0.1) {
                    vel.x *= 0.9;
                    vel.z *= 0.9;
                }
            }
            pos.add(vel);
            pos.y = clamp(pos.y, 0, rangeY);
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
            var index = actorElementIds[i];
            densityFieldData[index]--;
            var density = densityFieldData[index];
            var pos = actorPositions[i];
            if(density >= 1) {
                pos.add(wiggle());
            } else {
                pos.x -= (pos.x - Math.round(pos.x / unitScale) * unitScale) * 0.25;
                pos.y -= (pos.y - Math.round(pos.y / unitScale) * unitScale) * 0.25;
                pos.z -= (pos.z - Math.round(pos.z / unitScale) * unitScale) * 0.25;
            }
            index = getIndexFromPos(pos);
            actorElementIds[i] = index;
            densityFieldData[index]++;
        }
    }

    this.addActorPosition = function addActorPosition(pos, vel) {
        actorPositions.push(pos);
        actorVelocities.push(vel);
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
        }        
    }
}

module.exports = WorldGrid;
