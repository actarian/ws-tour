const controllers = {};

self.addEventListener("message", function(event) {
	const id = event.data.id;
	const src = event.data.src;
	if (id && !src) {
		const controller = controllers[id];
		if (controller) {
			controller.abort();
		}
		return;
	}
	let options;
	if (typeof fetch === 'function') {
		if (self.AbortController) {
			const controller = new AbortController();
			options = {
				signal: controller.signal,
			};
			controllers[id] = controller;
		}
		const response = fetch(src, options)
			.then(function(response) {
				return response.blob();
			})
			.then(function(blob) {
				delete controllers[id];
				self.postMessage({
					src: src,
					blob: blob
				});
			});
	} else {
		const request = new XMLHttpRequest();
		request.open('GET', src);
		request.responseType = 'blob';
		request.onload = function() {
			if (request.status < 300) {
				self.postMessage({
					src: src,
					blob: request.response
				});
			} else {
				// new Error('Image didn\'t load successfully; error code:' + request.statusText);
			}
		};
		request.onerror = function() {
			// new Error('There was a network error.');
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
