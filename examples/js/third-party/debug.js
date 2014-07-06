'use strict';

var video, canvas, context, imageData, detector, posit;

var renderer, scene, camera;

var mesh;

var clock = new THREE.Clock();

var step = 0.0;

var modelSize = 44.0; //millimeters

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var RAD_2_DEG = 180/Math.PI;

var vrHMD = {
  position: [0,0,0],
  orientation: [0,0,0]
};

var trackingInfo = {
  lastTrackTime: 0,
  haveTracking: false,
  neverTracked: true,
  translation: [0,0,0],
  orientation: [0,0,0]
};

var trackingData = {
  x: [],
  y: [],
  z: []
};

var zOffset = -0.5;


var settings = {
  scale: 1/70,
  filtering: {
    enabled: true,
    num_samples: 3
  },
  prediction: {
    enabled: false,
    delta: 0.05
  }
};

var markers = [
  {face: 'front', id: 265, position: [0,0,0], orientation: [0,0,0]},
  {face: 'left', id: 376, position: [0,0,0], orientation: [0,0,0]},
  {face: 'right', id: 121, position: [0,0,0], orientation: [0,0,0]},
  {face: 'top', id: 28, position: [0,0,0], orientation: [0,0,0]}
];
var markerProperties = {
  size: 4.4 // cm
};

var alpha, beta, gamma;

function moving_average(period) {
  var nums = [];
  return function(num) {
    nums.push(num);
    if (nums.length > period)
      nums.splice(0,1);
    var sum = 0;
    for (var i in nums)
      sum += nums[i];
    var n = period;
    if (nums.length < period)
      n = nums.length;
    return(sum/n);
  }
}

var num_samples = settings.filtering.num_samples;

var max = moving_average(num_samples);
var may = moving_average(num_samples);
var maz = moving_average(num_samples);

function onLoad(){
  video = document.getElementById('video');
  canvas = document.getElementById('video-canvas');
  context = canvas.getContext('2d');

  canvas.width = parseInt(canvas.style.width);
  canvas.height = parseInt(canvas.style.height);
  
  if (navigator.getUserMedia){
    init();
  }
};

function init(){
  navigator.getUserMedia({video:true}, 
    function (stream){
      if (window.webkitURL) {
        video.src = window.webkitURL.createObjectURL(stream);
      } else if (video.mozSrcObject !== undefined) {
        video.mozSrcObject = stream;
      } else {
        video.src = stream;
      }
    },
    function(error){
      console.log('stream not found');
    }
  );
  
  setupRendering();
  setupScene();
  setupEvents();

  detector = new AR.Detector();
  posit = new POS.Posit(modelSize, canvas.width);

  requestAnimationFrame(tick);
};

function setOrientationControls(e) {
  if (!e.alpha) {
    return;
  }

  alpha.innerHTML = e.alpha;
  beta.innerHTML  = e.beta;
  gamma.innerHTML = e.gamma;

  window.removeEventListener('deviceorientation', setOrientationControls);
}

function setupEvents() {
  alpha = document.getElementById('alpha');
  beta  = document.getElementById('beta');
  gamma = document.getElementById('gamma');

  window.addEventListener('deviceorientation', setOrientationControls, true);
}


function tick(){
  requestAnimationFrame(tick);
  
  if (video.readyState === video.HAVE_ENOUGH_DATA){
    snapshot();

    var markers = detector.detect(imageData);
    drawCorners(markers);

    updateScene(markers);

    var dt = clock.getDelta();

    var obj = camera;

    if (!trackingInfo.neverTracked) {
      var trans = trackingInfo.translation;
      var tx = settings.filtering.enabled ? max(-trans[0]) : -trans[0];
      var ty = settings.filtering.enabled ? may(trans[1]) : trans[1];
      var tz = settings.filtering.enabled ? maz(trans[2]) : trans[2];

      obj.position.x = tx * settings.scale;
      obj.position.y = ty * settings.scale;
      obj.position.z = (tz * settings.scale) - zOffset;
    }

  }

  mesh.rotation.y += 0.004;
  
  render(dt);

};

function setupScene(){
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(90, 1, 0.001, 700);
  camera.position.set(0, 0, 3);

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

function render(dt){
  renderer.render(scene, camera);
};

function snapshot(){
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  imageData = context.getImageData(0, 0, canvas.width, canvas.height);
};

function drawCorners(markers){
  var corners, corner, i, j;

  context.lineWidth = 3;

  for (i = 0; i < markers.length; ++ i){
    corners = markers[i].corners;
    
    context.strokeStyle = "red";
    context.beginPath();
    
    for (j = 0; j < corners.length; ++ j){
      corner = corners[j];
      context.moveTo(corner.x, corner.y);
      corner = corners[(j + 1) % corners.length];
      context.lineTo(corner.x, corner.y);
    }

    context.stroke();
    context.closePath();
    
    context.strokeStyle = "green";
    context.strokeRect(corners[0].x - 2, corners[0].y - 2, 4, 4);
  }
};


function updateScene(markers){
  var corners, corner, pose, i;
  

  if (markers.length == 0) {
    trackingInfo.haveTracking = false;
    return;
  }

  trackingInfo.neverTracked = false;
  trackingInfo.haveTracking = true;

  corners = markers[0].corners;
  
  for (i = 0; i < corners.length; ++ i){
    corner = corners[i];
    
    corner.x = corner.x - (canvas.width / 2);
    corner.y = (canvas.height / 2) - corner.y;
  }
  
  pose = posit.pose(corners);

  updatePose("pose1", markers[0].id, pose.bestError, pose.bestRotation, pose.bestTranslation);
  //updatePose("pose2", markers[0].id, pose.alternativeError, pose.alternativeRotation, pose.alternativeTranslation);
  
  step += 0.025;
};

function updateObject(object, rotation, translation){
  object.scale.x = modelSize;
  object.scale.y = modelSize;
  object.scale.z = modelSize;
  
  object.rotation.x = -Math.asin(-rotation[1][2]);
  object.rotation.y = -Math.atan2(rotation[0][2], rotation[2][2]);
  object.rotation.z = Math.atan2(rotation[1][0], rotation[1][1]);

  object.position.x = translation[0];
  object.position.y = translation[1];
  object.position.z = -translation[2];
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
              + " z: " + (t[2] | 0);
              //+ "<br/>" + orientationStr;

  trackingInfo.translation = t;

  var marker = document.getElementById('marker');
  marker.innerHTML = "markerID: " + id;

  trackingInfo.orientation = [-yaw * RAD_2_DEG, -pitch * RAD_2_DEG, roll * RAD_2_DEG];
};

window.onload = onLoad;