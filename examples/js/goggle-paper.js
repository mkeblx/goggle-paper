/* google-paper.js */
'use strict';

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var RAD_2_DEG = 180/Math.PI;

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

var GP = GP || {};

GP.PaperTracker = function(options){

	this.options = options || {};

	this.video;
	this.canvas;
	this.context;

  this.camDirection = 'front'; // back

	this.imageData;

	this.detector;
	this.posit;

	this.markers;

	this.init(options);
};

GP.PaperTracker.prototype.init = function(options){
	this.video = document.getElementById('video');
	this.canvas = document.getElementById('video-canvas');
	this.context = this.canvas.getContext('2d');

	this.canvas.width = parseInt(this.canvas.style.width);
	this.canvas.height = parseInt(this.canvas.style.height);

	this.trackingInfo = {
	  lastTrackTime: 0,
	  haveTracking: false,
	  neverTracked: true,
	  translation: [0,0,0],
	  orientation: [0,0,0],
	  rotation: [0,0,0]
	};

	this.detector = new AR.Detector();
	this.posit = new POS.Posit(this.options.modelSize, this.canvas.width);
};

GP.PaperTracker.prototype.postInit = function(){
  var vid = this.video;
  
  MediaStreamTrack.getSources(function(mediaSources) {
    mediaSources.forEach(function(mediaSource){
      if (mediaSource.kind === 'video' && mediaSource.facing == "environment") {
	navigator.getUserMedia({video: {optional: [{sourceId: mediaSource.id}]}}, 
          function (stream){
      	    if (window.webkitURL) {
              vid.src = window.webkitURL.createObjectURL(stream);
            } else if (vid.mozSrcObject !== undefined) {
              vid.mozSrcObject = stream;
            } else {
              vid.src = stream;
            }
          },
          function(error){
            console.log('stream not found');
          }
        );
      }
    });
  });
};

GP.PaperTracker.prototype.snapshot = function(){
  this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
  this.imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
};

GP.PaperTracker.prototype.detect = function(){
	var markers = this.detector.detect(this.imageData);
	this.markers = markers;
	return markers;
};

GP.PaperTracker.prototype.process = function(){
  if (this.video.readyState === this.video.HAVE_ENOUGH_DATA){
    this.snapshot();

    this.detect();
    this.drawCorners();
    return true;
  }

  return false;
};

GP.PaperTracker.prototype.drawCorners = function(){

  var corners, corner, i, j;

  this.context.lineWidth = 3;

  for (i = 0; i < this.markers.length; ++ i){
    corners = this.markers[i].corners;
    
    this.context.strokeStyle = "red";
    this.context.beginPath();
    
    for (j = 0; j < corners.length; ++ j){
      corner = corners[j];
      this.context.moveTo(corner.x, corner.y);
      corner = corners[(j + 1) % corners.length];
      this.context.lineTo(corner.x, corner.y);
    }

    this.context.stroke();
    this.context.closePath();
    
    this.context.strokeStyle = "blue";
    this.context.strokeRect(corners[0].x - 2, corners[0].y - 2, 4, 4);
  }

};

GP.PaperTracker.prototype.updateTracking = function(){
  var corners, corner, pose, i;
  
  if (this.markers.length == 0) {
    this.trackingInfo.haveTracking = false;
    return false;
  }

  this.trackingInfo.neverTracked = false;
  this.trackingInfo.haveTracking = true;

  corners = this.markers[0].corners;
  
  for (i = 0; i < corners.length; ++ i){
    corner = corners[i];
    
    corner.x = corner.x - (this.canvas.width / 2);
    corner.y = (this.canvas.height / 2) - corner.y;
  }
  
  pose = this.posit.pose(corners);

  var rotation = pose.bestRotation;
  var translation = pose.bestTranslation;

  this.trackingInfo.translation = translation;
  this.trackingInfo.rotation = rotation;

  return this.trackingInfo;
};

