'use strict';

var camera, scene, renderer;
var effect, controls;
var element, container;

var mesh;

var clock = new THREE.Clock();

var _pt;

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

var useMarkerOrientation = false;

var num_samples = settings.filtering.num_samples;

var max = moving_average(num_samples);
var may = moving_average(num_samples);
var maz = moving_average(num_samples);

init();
animate();

function init() {
  renderer = new THREE.WebGLRenderer();
  element = renderer.domElement;
  container = document.getElementById('example');
  container.appendChild(element);

  effect = new THREE.StereoEffect(renderer);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(90, 1, 0.001, 700);
  camera.position.set(0, 10, 0);
  scene.add(camera);

  var geo = new THREE.IcosahedronGeometry(1, 1);
  var mat = new THREE.MeshNormalMaterial();
  mesh = new THREE.Mesh(geo, mat);
  mesh.position.x = 0;
  mesh.position.y = 10;
  mesh.position.z = 3;
  scene.add(mesh);

  controls = new THREE.OrbitControls(camera, element);
  controls.rotateUp(Math.PI / 4);
  controls.target.set(
    mesh.position.x,
    mesh.position.y,
    mesh.position.z
  );
  controls.noZoom = true;
  controls.noPan = true;
  controls.autoRotate = false;

  _pt = new GP.PaperTracker(settings);

  _pt.postInit();

  function setOrientationControls(e) {
    if (!e.alpha) {
      return;
    }

    controls = new THREE.DeviceOrientationControls(camera, true);
    controls.connect();
    controls.update();

    element.addEventListener('click', fullscreen, false);

    window.removeEventListener('deviceorientation', setOrientationControls);
  }
  window.addEventListener('deviceorientation', setOrientationControls, true);


  var light = new THREE.HemisphereLight(0x777777, 0x000000, 0.6);
  scene.add(light);

  var texture = THREE.ImageUtils.loadTexture(
    'textures/checker.png'
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat = new THREE.Vector2(50, 50);
  texture.anisotropy = renderer.getMaxAnisotropy();

  var material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    specular: 0xffffff,
    shininess: 20,
    shading: THREE.FlatShading,
    map: texture
  });

  var geometry = new THREE.PlaneGeometry(1000, 1000);

  var floorMesh = new THREE.Mesh(geometry, material);
  floorMesh.rotation.x = -Math.PI / 2;
  scene.add(floorMesh);

  window.addEventListener('resize', resize, false);
  setTimeout(resize, 1);
}

function resize() {
  var width = container.offsetWidth;
  var height = container.offsetHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  effect.setSize(width, height);
}

function update(dt) {
  resize();

  //camera.updateProjectionMatrix();

  controls.update(dt);

  var success = _pt.process();

  if (success && _pt.updateTracking() && _pt.trackingInfo.translation != undefined) {
    updateObject(camera, _pt.trackingInfo.rotation, _pt.trackingInfo.translation, _pt.camDirection);
  }

  mesh.rotation.y += 0.004;
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
  obj.position.y = ty * settings.scale + 10;
  obj.position.z = tz * settings.scale - 0.5;

  if (useMarkerOrientation && false) {
    obj.rotation.x = -Math.asin(-rotation[1][2]);
    obj.rotation.y = -Math.atan2(rotation[0][2], rotation[2][2]);
    obj.rotation.z = Math.atan2(rotation[1][0], rotation[1][1]);
  }
};

function render(dt) {
  effect.render(scene, camera);
}

function animate(t) {
  requestAnimationFrame(animate);

  update(clock.getDelta());
  render(clock.getDelta());
}

function fullscreen() {
  if (container.requestFullscreen) {
    container.requestFullscreen();
  } else if (container.msRequestFullscreen) {
    container.msRequestFullscreen();
  } else if (container.mozRequestFullScreen) {
    container.mozRequestFullScreen();
  } else if (container.webkitRequestFullscreen) {
    container.webkitRequestFullscreen();
  }
}
