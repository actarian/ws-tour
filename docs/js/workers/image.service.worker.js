/**
 * @license ws-tour v1.0.0
 * (c) 2020 Luca Zampetti <lzampetti@gmail.com>
 * License: MIT
 */

(function (factory) {
	typeof define === 'function' && define.amd ? define(factory) :
	factory();
}((function () { 'use strict';

	var controllers = {};
	self.addEventListener("message", function (event) {
	  var id = event.data.id;
	  var src = event.data.src;

	  if (id && !src) {
	    var controller = controllers[id];

	    if (controller) {
	      controller.abort();
	    }

	    return;
	  }

	  var options;

	  if (typeof fetch === 'function') {
	    if (self.AbortController) {
	      var _controller = new AbortController();

	      options = {
	        signal: _controller.signal
	      };
	      controllers[id] = _controller;
	    }

	    var response = fetch(src, options).then(function (response) {
	      return response.blob();
	    }).then(function (blob) {
	      delete controllers[id];
	      self.postMessage({
	        src: src,
	        blob: blob
	      });
	    });
	  } else {
	    var request = new XMLHttpRequest();
	    request.open('GET', src);
	    request.responseType = 'blob';

	    request.onload = function () {
	      if (request.status < 300) {
	        self.postMessage({
	          src: src,
	          blob: request.response
	        });
	      }
	    };

	    request.onerror = function () {// new Error('There was a network error.');
	    };

	    request.send();
	  }
	});
	/*
	self.addEventListener('message', function(event) {
		// console.log(event);
		const src = event.data;
		const response = fetch(src).then(function(response) {
			return response.blob();
		}).then(function(blob) {
			// Send the image data to the UI thread!
			self.postMessage({
				src: src,
				blob: blob,
			});
		});
	});
	*/

})));
