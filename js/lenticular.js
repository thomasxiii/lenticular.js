/*
 * Lenticular
 * http://lenticular.attasi.com
 *
 * Licensed under the MIT license.
 * Copyright 2012 Tom Giannattasio
 */





var Lenticular = {
	version: '0.3',

	images: [],

	axisTable: {
		landscape: {
			x: 'gamma',
			y: 'beta',
			z: 'alpha'
		},
		portrait: {
			x: 'beta',
			y: 'gamma',
			z: 'alpha'
		}
	},

	clamp: function(val, min, max) {
	    if(val > max) return max;
	    if(val < min) return min;
	    return val;
	},

	updateFrames: function(e) {
		for(var img in Lenticular.images) {
			var image = Lenticular.images[img];
			if(!image.isActive) {
				return;
			}

			// pull proper angle based on orientation
			var axis = Lenticular.axisTable[Lenticular.orientation][image.axis];
			var angle = e[axis];

			// show the proper frame
			var percent = Lenticular.clamp((angle - image.adjustedMin) / image.tiltRange, 0, 1);
			image.showFrame(Math.floor(percent * (image.frames - 1)));
		}
	},

	updateOrientation: function(e) {
		Lenticular.orientation = window.orientation == 0 ? 'portrait' : 'landscape';

		for(var img in Lenticular.images) {
			var image = Lenticular.images[img];

			// reset min and max based on orientation
			image.adjustedMin = image.minTilt;
			if(image.axis == 'x') {
				image.adjustedMin = window.orientation == 90 ? image.adjustedMin - 45 : image.vadjustedMin + 45;
			}
		}
	}
};

Lenticular.Image = function(element, settings) {
	// settings
	var self = this;
	this.element = element;
	this.axis = settings.axis || 'y';
	this.images = settings.images || null;
	this.frames = settings.frames;
	this.minTilt = settings.min || -10;
	this.maxTilt = settings.max || 10;
	this.isActive = settings.isActive === false ? false : true;
	this.tiltRange = this.maxTilt - this.minTilt;
	this.useTilt = settings.useTilt === false ? false : true;

	// split the image path
	var splitImagePath = this.images.split('##');
	this.imagePrefix = splitImagePath[0];
	this.imageSuffix = splitImagePath[1];

	// add to global image stack
	Lenticular.images.push(this);

	// create image set
	this.imageSet = document.createElement('div');
	this.imageSet.setAttribute('class', 'lenticular-set');
	this.imageSet.style.cssText = 'position: relative; width: 100%; height: 100%; overflow: hidden;';
	this.imageSet.frames = [];

	// add images to DOM
	var loaders = [];
	var loadTimer = setInterval(function() {
		var isFinished = true;
		for(var loader in loaders) {
			if(loaders[loader].isLoaded === false) {
				isFinished = false;
				break;
			}
		}
		if(loaders.length == self.frames && isFinished) {
			clearInterval(loadTimer);
			self.element.dispatchEvent(new Event('load'));
		}
	}, 100);

	for(var i = 1; i <= this.frames; i++) {
		var frame = document.createElement('img');
		frame.isLoaded = false;
		frame.index = i;
		loaders.push(frame);
		frame.addEventListener('error', function() {
			this.isLoaded = true;
			self.frames--;
			loaders.splice(loaders.indexOf(this), 1);
		}, false);
		frame.addEventListener('load', function() {
			this.isLoaded = true;
		}, false);
		frame.setAttribute('src', this.imagePrefix + i + this.imageSuffix);
		frame.style.cssText = 'position: absolute; top: 0; left: 0; display: none;';
		this.imageSet.appendChild(frame);
		this.imageSet.frames.push(frame);
	}

	this.element.appendChild(this.imageSet);

	// activate
	if(Lenticular.images.length == 1 && this.useTilt) {
		Lenticular.updateOrientation();
		window.addEventListener('orientationchange', Lenticular.updateOrientation, false);
		window.addEventListener('deviceorientation', Lenticular.updateFrames, false);
	}
};

Lenticular.Image.prototype.showFrame = function(index) {
	// move the last frame out of the viewport
	if(this.lastFrame) {
		this.lastFrame.style.display = 'none';
	}

	// set the correct frame
	var imageToShow = this.imageSet.frames[index];
	imageToShow.style.display = 'block';
	this.lastFrame = imageToShow;
};

Lenticular.Image.prototype.activate = function() {
	this.isActive = true;
};

Lenticular.Image.prototype.deactivate = function() {
	this.isActive = false;
};

Lenticular.Image.prototype.destroy = function() {
	Lenticular.images.splice(Lenticular.images.indexOf(this), 1);
	if(Lenticular.images.length == 0 && this.useTilt) {
		window.removeEventListener('orientationchange', Lenticular.updateOrientation);
		window.removeEventListener('deviceorientation', Lenticular.updateFrames);
	}
};