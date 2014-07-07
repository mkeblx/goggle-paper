"use strict";

var camera, scene, mesh;
var renderCanvas, renderer, vrrenderer;
var vrHMD, vrPosDev;

var _pt;

var settings = {
  scale: 1/200,
  modelSize: 44.0,
  filtering: {
    enabled: true,
    num_samples: 3
  },
  prediction: {
    enabled: false,
    delta: 0.05
  }
};

var useMarkerOrientation = false;

var num_samples = settings.filtering.num_samples;

var max = moving_average(num_samples);
var may = moving_average(num_samples);
var maz = moving_average(num_samples);



var hasVR = !!(navigator.mozGetVRDevices) || !!(navigator.getVRDevices);

window.addEventListener("load", function() {
    if (navigator.getVRDevices) {
        navigator.getVRDevices().then(EnumerateVRDevices);
    } else if (navigator.mozGetVRDevices) {
        navigator.mozGetVRDevices(EnumerateVRDevices);
    }
}, false);

window.addEventListener("keypress", function(e) {
    if (e.charCode == 'f'.charCodeAt(0)) {
        /*renderCanvas.mozRequestFullScreen({
            vrDisplay: vrHMD
        });*/

        if (renderCanvas.webkitRequestFullscreen) {
            renderCanvas.webkitRequestFullscreen({ vrDisplay: vrHMD, vrDistortion: true });
        } else if (renderCanvas.mozRequestFullScreen) {
            renderCanvas.mozRequestFullScreen({ vrDisplay: vrHMD });
        }

    }
}, false);

function EnumerateVRDevices(vrdevs) {
    for (var i = 0; i < vrdevs.length; ++i) {
        if (vrdevs[i] instanceof HMDVRDevice) {
            vrHMD = vrdevs[i];
            break;
        }
    }
    for (var i = 0; i < vrdevs.length; ++i) {
        if (vrdevs[i] instanceof PositionSensorVRDevice &&
            vrdevs[i].hardwareUnitId == vrHMD.hardwareUnitId) {
            vrPosDev = vrdevs[i];
            break;
        }
    }
    init();
    render();
}

function init() {
    _pt = new GP.PaperTracker(settings);
    _pt.postInit();

    initRenderer();
    initScene();
}

function initScene() {
    camera = new THREE.PerspectiveCamera(60, 1280 / 800, 0.001, 10000);
    camera.position.z = 0.4;

    scene = new THREE.Scene();

    var light = new THREE.HemisphereLight(0x777777, 0x000000, 0.6);
    scene.add(light);

    var geometry = new THREE.IcosahedronGeometry(5, 1);
    var material = new THREE.MeshNormalMaterial();
    mesh = new THREE.Mesh(geometry, material);
    var s = 0.1;
    mesh.scale.set(s,s,s);
    mesh.position.y = -0.25;
    scene.add(mesh);

    var texture = THREE.ImageUtils.loadTexture(
        'textures/checker.png'
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat = new THREE.Vector2(100, 100);
    texture.anisotropy = renderer.getMaxAnisotropy();

    var mat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        specular: 0xffffff,
        shininess: 20,
        shading: THREE.FlatShading,
        map: texture
    });

    var geo = new THREE.PlaneGeometry(1000, 1000);

    var floorMesh = new THREE.Mesh(geo, mat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -2;
    scene.add(floorMesh);
}

function initRenderer() {
    renderCanvas = document.getElementById("render-canvas");
    renderer = new THREE.WebGLRenderer({
        canvas: renderCanvas
    });
    renderer.setClearColor(0x111111);
    var s = 1.5;
    renderer.setSize(1280*s, 800*s, false);
    vrrenderer = new THREE.VRRenderer(renderer, vrHMD);
}

function updateObject(obj, rotation, translation, camDir){
  var trans = translation;
  if (trans == undefined) {
    return false;
  }
  var tx = !settings.filtering.enabled ? -trans[0] : max(-trans[0]);
  var ty = settings.filtering.enabled ? may(trans[1]) : trans[1];
  var tz = settings.filtering.enabled ? maz(trans[2]) : trans[2];

  obj.position.x = tx * settings.scale * (camDir == 'back' ? -1 : 1);
  obj.position.y = ty * settings.scale + 1;
  obj.position.z = tz * settings.scale;

  if (useMarkerOrientation && !hasVR) {
    obj.rotation.x = -Math.asin(-rotation[1][2]);
    obj.rotation.y = -Math.atan2(rotation[0][2], rotation[2][2]);
    obj.rotation.z = Math.atan2(rotation[1][0], rotation[1][1]);
  }
};

function render() {
    requestAnimationFrame(render);

    var success = _pt.process();

    if (success && _pt.updateTracking() && _pt.trackingInfo.translation != undefined) {
       updateObject(camera, _pt.trackingInfo.rotation, _pt.trackingInfo.translation, _pt.camDirection);
    }

    mesh.rotation.y += 0.006;
    var state = vrPosDev.getState();
    var o = state.orientation;    
    camera.quaternion.set(o.x, o.y, o.z, o.w);
    vrrenderer.render(scene, camera);
}
