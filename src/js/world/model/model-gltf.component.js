import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
// import { RoughnessMipmapper } from 'three/examples/jsm/utils/RoughnessMipmapper.js';
import { environment } from '../../../environment/environment';
import { BASE_HREF } from '../../const';
import WorldComponent from '../world.component';
import ModelComponent from './model.component';

export default class ModelGltfComponent extends ModelComponent {

	onInit() {
		super.onInit();
		this.progress = 0;
		console.log('ModelGltfComponent.onInit');
	}

	createStand() {
		const geometry = new THREE.BoxBufferGeometry(3, 3, 3);
		const material = new THREE.MeshBasicMaterial();
		/*
		const material = new THREE.ShaderMaterial({
			vertexShader: VERTEX_SHADER,
			fragmentShader: FRAGMENT_SHADER,
			uniforms: {
				texture: { type: "t", value: null },
				resolution: { value: new THREE.Vector2() }
			},
		});
		*/
		const stand = this.stand = new THREE.Mesh(geometry, material);
	}

	create(callback) {
		this.loadGltfModel(BASE_HREF + environment.paths.models + this.item.gltfFolder, this.item.gltfFile, (mesh) => {
			// scale
			const box = new THREE.Box3().setFromObject(mesh);
			const size = box.max.clone().sub(box.min);
			const max = Math.max(size.x, size.y, size.z);
			const scale = 1.7 / max;
			// mesh.position.y = -1 + size.y / 2 * scale;
			// const scale = 2.5 / size.length();
			mesh.scale.set(scale, scale, scale);
			// repos
			const dummy = new THREE.Group();
			dummy.add(mesh);
			box.setFromObject(dummy);
			const center = box.getCenter(new THREE.Vector3());
			dummy.position.set(
				mesh.position.x - center.x,
				mesh.position.y - center.y, // center
				// mesh.position.y - center.y + size.y / 2 * scale - 0.5, // bottom
				mesh.position.z - center.z
			);
			// stand
			/*
			this.createStand();
			this.stand.position.y = -2;
			this.group.add(this.stand);
			*/
			//
			if (typeof callback === 'function') {
				callback(dummy);
			}
			this.progress = 0;
			this.pushChanges();
		});
		/*
		this.loadRgbeBackground(BASE_HREF + environment.paths.textures + this.item.envMapFolder, this.item.envMapFile, (envMap) => {
			this.loadGltfModel(BASE_HREF + environment.paths.models + this.item.gltfFolder, this.item.gltfFile, (mesh) => {
				const box = new THREE.Box3().setFromObject(mesh);
				const center = box.getCenter(new THREE.Vector3());
				mesh.position.x += (mesh.position.x - center.x);
				mesh.position.y += (mesh.position.y - center.y);
				mesh.position.z += (mesh.position.z - center.z);
				const size = box.max.clone().sub(box.min).length();
				const scale = 2.5 / size;
				mesh.scale.set(scale, scale, scale);
				if (typeof callback === 'function') {
					callback(mesh);
				}
			});
		});
		*/
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	/*
	loadAssets() {
		this.loadRgbeBackground(BASE_HREF + environment.paths.textures + this.item.envMapFolder, this.item.envMapFile, (envMap) => {
			this.loadGltfModel(BASE_HREF + environment.paths.models + this.item.gltfFolder, this.item.gltfFile, (model) => {
				const scene = this.host.scene;
				scene.add(model);
				this.host.render();
			});
		});
	}
	*/

	/*
	loadRgbeBackground(path, file, callback) {
		const scene = this.host.scene;
		const renderer = this.host.renderer;
		const pmremGenerator = new THREE.PMREMGenerator(renderer);
		pmremGenerator.compileEquirectangularShader();
		const loader = new RGBELoader();
		loader
			.setDataType(THREE.UnsignedByteType)
			.setPath(path)
			.load(file, (texture) => {
				const envMap = pmremGenerator.fromEquirectangular(texture).texture;
				scene.background = envMap;
				scene.environment = envMap;
				this.host.render();
				texture.dispose();
				pmremGenerator.dispose();
				if (typeof callback === 'function') {
					callback(envMap);
				}
			});
		return loader;
	}
	*/

	loadGltfModel(path, file, callback) {
		const renderer = this.host.renderer;
		// const roughnessMipmapper = new RoughnessMipmapper(renderer); // optional
		const loader = new GLTFLoader().setPath(path);
		loader.load(file, (gltf) => {
			gltf.scene.traverse((child) => {
				if (child.isMesh) {
					// roughnessMipmapper.generateMipmaps(child.material);
				}
			});
			if (typeof callback === 'function') {
				callback(gltf.scene);
			}
			this.progress = 0;
			this.pushChanges();
			// roughnessMipmapper.dispose();
		}, (progressEvent) => {
			if (progressEvent.lengthComputable) {
				this.progress = Math.round(progressEvent.loaded / progressEvent.total * 100);
			} else {
				this.progress = this.progress || 0;
				this.progress = Math.min(100, this.progress + 1);
			}
			// console.log('progressEvent', progressEvent.loaded, progressEvent.total);
			this.pushChanges();
		});
	}

}

ModelGltfComponent.meta = {
	selector: '[model-gltf]',
	hosts: { host: WorldComponent },
	inputs: ['item'],
};
