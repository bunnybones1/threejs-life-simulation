var THREE = require('three');

function WorldGrid(cols=256, rows=256, layers=32, unitScale = 0.025) {
    var totalCells = cols * rows * layers;
    var bytes = totalCells * 4;
    var densityBuffer = new ArrayBuffer(bytes);
    var densityData = new Float32Array(densityBuffer);
    var velXBuffer = new ArrayBuffer(bytes);
    var velXData = new Float32Array(velXBuffer);
    var velYBuffer = new ArrayBuffer(bytes);
    var velYData = new Float32Array(velYBuffer);
    var velZBuffer = new ArrayBuffer(bytes);
    var velZData = new Float32Array(velZBuffer);
    var actorPositions = [];
    var actorVelocities = [];
    var actorElementIds = [];
    var unitScaleInv = 1 / unitScale;

    var xOffset = 1;
    var yOffset = cols;
    var zOffset = rows * cols;

    var rangeX = cols * unitScale;
    var rangeY = rows * unitScale;
    var rangeZ = layers * unitScale;

    function clamp(val, min, max) {
        if(val >= max) return max;
        if(val <= min) return min;
        return val;
    }

    function posToIndex(pos) {
        var xi = clamp(Math.round(pos.x * unitScaleInv), 0, cols);
        var yi = clamp(Math.round(pos.y * unitScaleInv), 0, rows) * yOffset;
        var zi = clamp(Math.round(pos.z * unitScaleInv), 0, layers) * zOffset;
        return xi + yi + zi;
    }
    function sampleDensity(pos) {
        return densityData[posToIndex(pos)];
    }
    function GetDensitySafe(index) {
        return densityData[clamp(index, 0, totalCells-1)];
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
        var i = posToIndex(pos);
        normal.x = GetDensitySafe(i-xOffset) - GetDensitySafe(i+xOffset);
        normal.y = GetDensitySafe(i-yOffset) - GetDensitySafe(i+yOffset);
        normal.z = GetDensitySafe(i-zOffset) - GetDensitySafe(i+zOffset);
        normal.normalize().multiplyScalar(unitScale * 0.25);
        return normal;
    }

    this.onEnterFrame = function onEnterFrame() {
        var totalActors = actorElementIds.length;
        // //repopulate density
        // for(var i = totalActors-1; i >= 0; i--) {
        //     densityData[posToIndex(actorPositions[i])]++;
        // }
        //move actors by surrounding density normals
        for(var i = totalActors-1; i >= 0; i--) {
            var pos = actorPositions[i];
            densityData[actorElementIds[i]]--;
            pos.add(getDensityNormal(pos));
            pos.x = (pos.x + rangeX) % rangeX;
            pos.y = clamp(pos.y, 0, rangeY);
            pos.z = (pos.z + rangeZ) % rangeZ;
            actorElementIds[i] = posToIndex(pos);
            densityData[actorElementIds[i]]++;
        }
        for(var i = totalActors-1; i >= 0; i--) {
            var index = actorElementIds[i];
            var pos = actorPositions[i];
            var vel = actorVelocities[i];
            var thickness = 4 / (4 + densityData[index]);
            var invThickness = 1 - thickness;
            vel.x *= thickness;
            vel.y *= thickness;
            vel.z *= thickness;
            velXData[index] += vel.x * invThickness;
            velYData[index] += vel.y * invThickness;
            velZData[index] += vel.z * invThickness;
            vel.x += velXData[index] * invThickness;
            vel.y += velYData[index] * invThickness;
            vel.z += velZData[index] * invThickness;

            velXData[index] *= 0.8;
            velYData[index] *= 0.8;
            velZData[index] *= 0.8;

            densityData[index]--;

            var yNormal = GetDensitySafe(index-yOffset);
            if(yNormal < 2) {
                vel.y -= 0.01;
            } else {
                vel.y = 0;
            }
            if(pos.y <= 0.1) {
                vel.x *= 0.9;
                vel.z *= 0.9;
            }
            pos.add(vel);
            pos.y = clamp(pos.y, 0, rangeY);
            index = posToIndex(pos);
            actorElementIds[i] = index;
            densityData[index]++;
        }
        
        for(var i = totalActors-1; i >= 0; i--) {
            if(densityData[actorElementIds[i]] > 1) {
                // actorPositions[i].add(wiggle());
            }
        }
        // //clear density
        // for(var i = totalActors-1; i >= 0; i--) {
        //     densityData[actorElementIds[i]] = 0;
        // }
    }

    this.addActorPosition = function addActorPosition(pos, vel) {
        actorPositions.push(pos);
        actorVelocities.push(vel);
        actorElementIds.push(posToIndex(pos));
        densityData[posToIndex(pos)]++;
    }
    this.removeActorPosition = function removeActorPosition(pos) {
        var index = actorPositions.indexOf(pos);
        if(index != -1) {
            densityData[posToIndex(actorPositions[index])]--;
            actorPositions.splice(index, 1);
            actorVelocities.splice(index, 1);
            actorElementIds.splice(index, 1);
        }        
    }
}

module.exports = WorldGrid;
