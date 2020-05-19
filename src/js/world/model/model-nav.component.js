import * as THREE from 'three';
// import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
// import { RoughnessMipmapper } from 'three/examples/jsm/utils/RoughnessMipmapper.js';
import { environment } from '../../../environment/environment';
import { BASE_HREF } from '../../const';
import InteractiveMesh from '../interactive/interactive.mesh';
import WorldComponent from '../world.component';
import ModelComponent from './model.component';

const NAV_RADIUS = 100;
const ORIGIN = new THREE.Vector3();

export default class ModelNavComponent extends ModelComponent {

	static getLoader() {
		return ModelNavComponent.loader || (ModelNavComponent.loader = new THREE.TextureLoader());
	}

	static getTexture() {
		return ModelNavComponent.texture || (ModelNavComponent.texture = ModelNavComponent.getLoader().load(BASE_HREF + environment.paths.textures + 'ui/pin.png'));
	}

	onInit() {
		super.onInit();
		// console.log('ModelNavComponent.onInit');
	}

	onDestroy() {
		InteractiveMesh.dispose(this.mesh);
		super.onDestroy();
	}

	create(callback) {
		const geometry = new THREE.PlaneBufferGeometry(2, 2, 2, 2);
		const map = ModelNavComponent.getTexture();
		const material = new THREE.MeshBasicMaterial({
			// alphaMap: texture,
			map: map,
			transparent: true,
			opacity: 0,
		});
		const mesh = this.mesh = new InteractiveMesh(geometry, material);
		this.item.mesh = mesh;
		mesh.on('over', () => {
			const from = { scale: mesh.scale.x };
			gsap.to(from, 0.4, {
				scale: 3,
				delay: 0,
				ease: Power2.easeInOut,
				onUpdate: () => {
					mesh.scale.set(from.scale, from.scale, from.scale);
				}
			});
			this.over.next(this.item);
		});
		mesh.on('out', () => {
			const from = { scale: mesh.scale.x };
			gsap.to(from, 0.4, {
				scale: 1,
				delay: 0,
				ease: Power2.easeInOut,
				onUpdate: () => {
					mesh.scale.set(from.scale, from.scale, from.scale);
				}
			});
			this.out.next(this.item);
		});
		mesh.on('down', () => {
			this.down.next(this.item);
		});
		// this.renderOrder = 1;
		const position = new THREE.Vector3().set(...this.item.position).normalize().multiplyScalar(NAV_RADIUS);
		mesh.position.set(position.x, position.y, position.z);
		mesh.lookAt(ORIGIN);
		const from = { opacity: 0 };
		gsap.to(from, 0.7, {
			opacity: 1,
			delay: 0.1 * this.item.index,
			ease: Power2.easeInOut,
			onUpdate: () => {
				// console.log(index, from.opacity);
				material.opacity = from.opacity;
				material.needsUpdate = true;
			}
		});
		if (typeof callback === 'function') {
			callback(mesh);
		}
	}

}

ModelNavComponent.meta = {
	selector: '[model-nav]',
	hosts: { host: WorldComponent },
	outputs: ['over', 'out', 'down'],
	inputs: ['item'],
};
