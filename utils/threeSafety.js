var THREE = require('three');

Object.defineProperty(THREE.Vector3.prototype, "x", {
        set: function(value) {
            if(isNaN(value)) {
                debugger;
            }
            this._x = value;
        },
        get: function() {
            return this._x;
        }
    }
);