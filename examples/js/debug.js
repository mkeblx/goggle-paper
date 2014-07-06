'use strict';

var renderer, scene, camera;

var mesh;

var clock = new THREE.Clock();

var zOffset = -0.5;

var useMarkerOrientation = false, markerBtn;

var settings = {
  scale: 1/70,
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

var alpha, beta, gamma;

var num_samples = settings.filtering.num_samples;

var max = moving_average(num_samples);
var may = moving_average(num_samples);
var maz = moving_average(num_samples);

var _pt;

function onLoad(){

  _pt = new GP.PaperTracker(settings);

  if (navigator.getUserMedia){
    init();
  }
};

function init(){
  _pt.postInit();

  setupRendering();
  setupScene();
  setupEvents();

  requestAnimationFrame(animate);
};

function setOrientationControls(e) {
  if (!e.alpha) {
    return;
  }

  alpha.innerHTML = e.alpha.toFixed(2);
  beta.innerHTML  = e.beta.toFixed(2);
  gamma.innerHTML = e.gamma.toFixed(2);

  window.removeEventListener('deviceorientation', setOrientationControls);
}

function setupEvents() {
  alpha = document.getElementById('alpha');
  beta  = document.getElementById('beta');
  gamma = document.getElementById('gamma');

  window.addEventListener('deviceorientation', setOrientationControls, true);

  markerBtn = document.getElementById('toggle-marker-orientation');
  markerBtn.addEventListener('click', toggleMarkerOrientation, true);
}

function toggleMarkerOrientation() {
  useMarkerOrientation = !useMarkerOrientation;
  markerBtn.innerHTML = (useMarkerOrientation) ? 'Don\'t Use Marker Orientation' : 'Use Marker Orientation';
}

function setupScene(){
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(90, 1, 0.001, 700);
  camera.position.set(0, 0, 5);

  camera.rotation.x = 0;

  scene.add(camera);

  var light = new THREE.HemisphereLight(0x777777, 0x000000, 0.6);
  scene.add(light);

  var geometry = new THREE.IcosahedronGeometry(1, 1);
  var material = new THREE.MeshNormalMaterial();
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 2;
  scene.add(mesh);

  var texture = THREE.ImageUtils.loadTexture(
    'textures/checker.png'
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat = new THREE.Vector2(50, 50);
  texture.anisotropy = renderer.getMaxAnisotropy();

  var mat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    specular: 0xffffff,
    shininess: 20,
    shading: THREE.FlatShading,
    map: texture
  });

  var geo = new THREE.PlaneGeometry(1000, 1000);

  var floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -6;
  scene.add(floor);
}

function setupRendering(){
  var container = document.getElementById('scene-container');

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setSize(320*2, 240*2);

  container.appendChild(renderer.domElement);
}

function animate(){
  requestAnimationFrame(animate);
  
  var dt = clock.getDelta();
  
  var success = _pt.process();

  if (success && _pt.updateTracking() && _pt.trackingInfo.translation != undefined) {
    updateObject(camera, _pt.trackingInfo.rotation, _pt.trackingInfo.translation, _pt.camDirection);
    updatePose("pose1", _pt.markers[0].id, "", _pt.trackingInfo.rotation, _pt.trackingInfo.translation);
  }

  mesh.rotation.y += 0.004;
  
  render(dt);
};

function render(dt){
  renderer.render(scene, camera);
};

function updateObject(obj, rotation, translation, camDir){
  var trans = translation;
  if (trans == undefined) {
    return false;
  }
  var tx = !settings.filtering.enabled ?
    -trans[0] :
    max(-trans[0]);
  var ty = settings.filtering.enabled ? may(trans[1]) : trans[1];
  var tz = settings.filtering.enabled ? maz(trans[2]) : trans[2];

  obj.position.x = tx * settings.scale * (camDir == 'back' ? -1 : 1);
  obj.position.y = ty * settings.scale;
  obj.position.z = tz * settings.scale - 0.5;

  if (useMarkerOrientation) {
    obj.rotation.x = -Math.asin(-rotation[1][2]);
    obj.rotation.y = -Math.atan2(rotation[0][2], rotation[2][2]);
    obj.rotation.z = Math.atan2(rotation[1][0], rotation[1][1]);
  }
};

function updatePose(elId, id, error, rotation, translation){
  var yaw = -Math.atan2(rotation[0][2], rotation[2][2]);
  var pitch = -Math.asin(-rotation[1][2]);
  var roll = Math.atan2(rotation[1][0], rotation[1][1]);
  
  var orientationStr = "yaw: " + Math.round(-yaw * 180.0/Math.PI)
              + " pitch: " + Math.round(-pitch * 180.0/Math.PI)
              + " roll: " + Math.round(roll * 180.0/Math.PI);

  var t = translation;

  var d = document.getElementById(elId);
  d.innerHTML = " x: " + (t[0] | 0)
              + " y: " + (t[1] | 0)
              + " z: " + (t[2] | 0)
              + "<br/>" + orientationStr;

  var marker = document.getElementById('marker');
  marker.innerHTML = "markerID: " + id;
};

window.onload = onLoad;
