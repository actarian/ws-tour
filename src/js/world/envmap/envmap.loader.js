import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { environment } from '../../../environment/environment';
import { BASE_HREF } from '../../const';

export class EnvMapLoader {

	static load(item, renderer, callback) {
		if (item.envMapFile.indexOf('.hdr') !== -1) {
			return this.loadRgbeBackground(BASE_HREF + environment.paths.textures + item.envMapFolder, item.envMapFile, renderer, callback);
		} else if (item.envMapFile.indexOf('.mp4') !== -1) {
			return this.loadVideoBackground(BASE_HREF + environment.paths.textures + item.envMapFolder, item.envMapFile, renderer, callback);
		} else if (item.envMapFile.indexOf('.m3u8') !== -1) {
			return this.loadHlslVideoBackground(item.envMapFile, renderer, callback);
		} else {
			return this.loadBackground(BASE_HREF + environment.paths.textures + item.envMapFolder, item.envMapFile, renderer, callback);
		}
	}

	static loadBackground(path, file, renderer, callback) {
		const pmremGenerator = new THREE.PMREMGenerator(renderer);
		pmremGenerator.compileEquirectangularShader();
		const loader = new THREE.TextureLoader();
		loader
			.setPath(path)
			.load(file, (texture) => {
				const envMap = pmremGenerator.fromEquirectangular(texture).texture;
				// texture.dispose();
				pmremGenerator.dispose();
				if (typeof callback === 'function') {
					callback(envMap, texture, false);
				}
			});
		return loader;
	}

	static loadVideoBackground(path, file, renderer, callback) {
		const video = document.createElement('video');
		/*
		const temp = document.querySelector('.temp');
		temp.appendChild(video);
		*/
		video.src = path + file;
		video.loop = true;
		video.muted = true;
		video.playsInline = true;
		video.play();
		let videoReady = false;
		const onPlaying = () => {
			video.oncanplay = null;
			const texture = new THREE.VideoTexture(video);
			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
			texture.format = THREE.RGBFormat;
			texture.needsUpdate = true;
			// const envMap = new THREE.VideoTexture(video);
			const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024, {
				generateMipmaps: true,
				// minFilter: THREE.LinearMipmapLinearFilter,
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBFormat
			}).fromEquirectangularTexture(renderer, texture);
			// texture.dispose();
			if (typeof callback === 'function') {
				callback(cubeRenderTarget.texture, texture, false);
			}
		};
		// video.addEventListener('playing', onPlaying);
		video.crossOrigin = 'anonymous';
		video.oncanplay = () => {
			videoReady = true;
			// console.log('videoReady', videoReady);
			onPlaying();
		};
	}

	static loadHlslVideoBackground(src, renderer, callback) {
		const video = document.createElement('video');
		video.loop = true;
		video.muted = true;
		video.playsInline = true;
		video.crossOrigin = 'anonymous';
		const onPlaying = () => {
			video.oncanplay = null;
			const texture = new THREE.VideoTexture(video);
			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
			texture.format = THREE.RGBFormat;
			texture.needsUpdate = true;
			// const envMap = new THREE.VideoTexture(video);
			const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024, {
				generateMipmaps: true,
				// minFilter: THREE.LinearMipmapLinearFilter,
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBFormat
			}).fromEquirectangularTexture(renderer, texture);
			// texture.dispose();
			if (typeof callback === 'function') {
				callback(cubeRenderTarget.texture, texture, false);
			}
		};
		let videoReady = false;
		video.oncanplay = () => {
			videoReady = true;
			// console.log('videoReady', videoReady);
			onPlaying();
		};
		if (Hls.isSupported()) {
			var hls = new Hls();
			// bind them together
			hls.attachMedia(video);
			hls.on(Hls.Events.MEDIA_ATTACHED, () => {
				hls.loadSource(src);
				hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
					console.log('HlsDirective', data.levels);
					video.play();
				});
			});
		}
	}

	static loadRgbeBackground(path, file, renderer, callback) {
		const pmremGenerator = new THREE.PMREMGenerator(renderer);
		pmremGenerator.compileEquirectangularShader();
		const loader = new RGBELoader();
		loader
			.setDataType(THREE.UnsignedByteType)
			// .setDataType(THREE.FloatType)
			.setPath(path)
			.load(file, (texture) => {
				const envMap = pmremGenerator.fromEquirectangular(texture).texture;
				// texture.dispose();
				pmremGenerator.dispose();
				if (typeof callback === 'function') {
					callback(envMap, texture, true);
				}
			});
		return loader;
	}

}
