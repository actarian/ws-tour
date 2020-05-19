import * as THREE from 'three';
import { EnvMapLoader } from '../envmap/envmap.loader';
import InteractiveMesh from '../interactive/interactive.mesh';
import { VideoTexture } from '../video-texture';

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
	vUv = uv;
	// gl_PointSize = 8.0;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
varying vec2 vUv;
uniform vec2 resolution;
uniform float pow;
uniform bool rgbe;
uniform sampler2D texture;

vec3 ACESFilmicToneMapping_( vec3 color ) {
	color *= 1.8;
	return saturate( ( color * ( 2.51 * color + 0.03 ) ) / ( color * ( 2.43 * color + 0.59 ) + 0.14 ) );
}

vec4 getColor(vec2 p) {
	return texture2D(texture, p);
}

vec3 encodeColor(vec4 color) {
	return ACESFilmicToneMapping_(RGBEToLinear(color).rgb);
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 Blur(vec2 st, vec4 color) {
	const float directions = 16.0;
	const float quality = 3.0;
	float size = 16.0;
	const float PI2 = 6.28318530718;
	const float qq = 1.0;
	const float q = 1.0 / quality;
	vec2 radius = size / resolution.xy;
	for (float d = 0.0; d < PI2; d += PI2 / directions) {
		for (float i = q; i <= qq; i += q) {
			vec2 dUv = vec2(cos(d), sin(d)) * radius * i;
			color += getColor(st + dUv);
        }
	}
	return color /= quality * directions - 15.0 + rand(st) * 4.0;
}

void main() {
	vec4 color = texture2D(texture, vUv);
	// color = Blur(vUv, color);
	if (rgbe) {
		color = vec4(encodeColor(color) * pow + rand(vUv) * 0.05, 1.0);
	} else {
		color = vec4(color.rgb * pow + rand(vUv) * 0.05, 1.0);
	}
	gl_FragColor = color;
}
`;

export default class Panorama {

	constructor() {
		this.pow = 0;
		this.create();
	}

	create() {
		const geometry = new THREE.SphereBufferGeometry(500, 60, 40);
		geometry.scale(-1, 1, 1);
		geometry.rotateY(Math.PI);
		const material = new THREE.ShaderMaterial({
			vertexShader: VERTEX_SHADER,
			fragmentShader: FRAGMENT_SHADER,
			uniforms: {
				texture: { type: "t", value: null },
				resolution: { value: new THREE.Vector2() },
				pow: { value: 0 },
				rgbe: { value: false },
			},
		});
		/*
		const material = new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0,
		});
		*/
		const mesh = this.mesh = new InteractiveMesh(geometry, material);
	}

	swap(item, renderer, callback) {
		if (this.pow > 0) {
			const material = this.mesh.material;
			gsap.to(this, 0.5, {
				pow: 0,
				ease: Power2.easeInOut,
				onUpdate: () => {
					material.uniforms.pow.value = this.pow;
					material.needsUpdate = true;
				},
				onComplete: () => {
					this.load(item, renderer, callback);
				}
			});
		} else {
			this.load(item, renderer, callback);
		}
	}

	load(item, renderer, callback) {
		if (this.mesh.material.uniforms.texture.value) {
			const texture = this.mesh.material.uniforms.texture.value;
			texture.dispose();
			this.mesh.material.uniforms.texture.value = null;
		}
		EnvMapLoader.load(item, renderer, (envMap, texture, rgbe, video, pmremGenerator) => {
			texture.magFilter = THREE.LinearFilter;
			texture.needsUpdate = true;
			const material = this.mesh.material;
			// material.map = texture;
			material.uniforms.texture.value = texture;
			material.uniforms.resolution.value = new THREE.Vector2(texture.width, texture.height);
			material.uniforms.pow.value = 0;
			material.uniforms.rgbe.value = rgbe;
			// console.log(texture.width, texture.height);
			material.needsUpdate = true;
			gsap.to(this, 0.5, {
				pow: 1,
				ease: Power2.easeInOut,
				onUpdate: () => {
					material.uniforms.pow.value = this.pow;
					material.needsUpdate = true;
				}
			});
			if (typeof callback === 'function') {
				callback(envMap, texture, rgbe);
			}
		});
	}

	loadVideo(src) {
		const video = document.createElement('video');
		/*
		const temp = document.querySelector('.temp');
		temp.appendChild(video);
		*/
		video.src = src;
		video.muted = true;
		video.playsInline = true;
		video.play();
		this.setVideo(video);
	}

	setVideo(video) {
		// console.log('Panorama.setVideo', video);
		if (video) {
			let videoReady = false;
			const onPlaying = () => {
				const texture = new VideoTexture(video);
				texture.minFilter = THREE.LinearFilter;
				texture.magFilter = THREE.LinearFilter;
				texture.format = THREE.RGBFormat;
				texture.needsUpdate = true;
				const material = this.mesh.material;
				material.map = texture;
				material.uniforms.texture.value = texture;
				material.uniforms.resolution.value = new THREE.Vector2(texture.width, texture.height);
				// console.log(texture.width, texture.height);
				material.needsUpdate = true;
				// video.currentTime = 1;
				// video.load();
			};
			// video.addEventListener('playing', onPlaying);
			video.crossOrigin = 'anonymous';
			video.oncanplay = () => {
				videoReady = true;
				// console.log('videoReady', videoReady);
				onPlaying();
			};
			/*
			video.width = 640;
			video.height = 480;
			*/
			/*
			video.addEventListener("play", function() {
				frameloop();
			});
			*/
		}
	}

}
