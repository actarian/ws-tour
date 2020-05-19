/* jshint esversion: 6 */

import DomService from '../../dom/dom.service';
import { randomColor } from '../colors/colors';
import Ease from '../ease/ease';

const deg = THREE.Math.degToRad;

const GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
// const GEOMETRY = new THREE.IcosahedronBufferGeometry(0.5, 1);

export default class Model {

	constructor(node, options) {
		if (!options) {
			return console.error('Model options undefiend!');
		}
		if (!options.world) {
			return console.error('Model options.world undefiend!');
		}
		this.node = node;
		Object.assign(this, options);
		this.scale = new THREE.Vector3();
		this.position = new THREE.Vector3();
		this.create((mesh) => this.loaded(mesh));
	}

	create(callback) {
		const material = new THREE.MeshStandardMaterial({
			color: randomColor(),
			roughness: 0.4,
			metalness: 0.01,
			flatShading: true,
			transparent: true,
			opacity: 0.9,
		});
		const mesh = new THREE.Mesh(GEOMETRY, material);
		mesh.renderOrder = 3;
		if (typeof callback === 'function') {
			callback(mesh);
		}
		return mesh;
	}

	loaded(mesh) {
		this.mesh = mesh;
		mesh.userData.render = (time, tick) => {
			if (this.intersection) {
				this.render(this, time, tick);
			}
		};
		const world = this.world;
		world.scene.add(mesh);
		const node = this.node;
		DomService.scrollIntersection$(node).subscribe(event => {
			this.scroll = event.scroll;
			this.intersection = event.intersection;
			this.calculateScaleAndPosition();
		});
		// console.log('Model.loaded', mesh);
	}

	calculateScaleAndPosition() {
		this.world.repos(this, this.intersection);
	}

	render(time, tick) {
		const mesh = this.mesh;
		const scale = this.scale;
		mesh.scale.set(scale.x, scale.y, scale.z);
		const position = this.position;
		mesh.position.set(position.x, position.y, position.z);
		const pow = this.pow();
		mesh.rotation.x = deg(180) * pow;
		mesh.rotation.y = deg(360) * pow;
	}

	getScroll(offset) {
		const scroll = this.intersection.scroll(offset);
		// console.log(scroll);
		return scroll;
	}

	getPow(offset) {
		let pow = Math.min(0.0, this.intersection.offset(offset)) + 1;
		pow = Math.max(0.0, pow);
		pow = Ease.Sine.InOut(pow);
		pow -= 1;
		return pow;
	}

}
