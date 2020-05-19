import { Component, getContext } from 'rxcomp';
import * as THREE from 'three';
// import Ease from '../ease/ease';
import WorldComponent from '../world.component';

const deg = THREE.Math.degToRad;

const GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
// const GEOMETRY = new THREE.IcosahedronBufferGeometry(0.5, 1);

export default class ModelComponent extends Component {

	onInit() {
		// console.log('ModelComponent.onInit');
		// console.log('item', this.item, 'host', this.host);
		if (!this.host) {
			throw ('ModelComponent host is undefined');
		}
		this.scale = new THREE.Vector3(1.0, 1.0, 1.0);
		this.position = new THREE.Vector3();
		const group = this.group = new THREE.Group();
		group.renderOrder = 3;
		group.userData.render = (time, tick) => {
			// if (this.intersection) {
			this.render(this, time, tick);
			// }
		};
		this.host.objects.add(group);
		this.create((mesh) => this.loaded(mesh));
	}

	onDestroy() {
		this.host.objects.remove(this.group);
		delete this.group.userData.render;
		this.group = null;
	}

	create(callback) {
		const material = new THREE.MeshStandardMaterial({
			color: new THREE.Color('#ffcc00'),
			roughness: 0.4,
			metalness: 0.01,
			flatShading: true,
			transparent: true,
			opacity: 0.9,
		});
		const mesh = new THREE.Mesh(GEOMETRY, material);
		if (typeof callback === 'function') {
			callback(mesh);
		}
		return mesh;
	}

	loaded(mesh) {
		this.mesh = mesh;
		this.group.add(mesh);
		// this.host.render(); !!!
		/*
		const node = this.node;
		DomService.scrollIntersection$(node).subscribe(event => {
			this.scroll = event.scroll;
			this.intersection = event.intersection;
			this.calculateScaleAndPosition();
		});
		*/
		// console.log('Model.loaded', mesh);
	}

	calculateScaleAndPosition() {
		const { node } = getContext(this);
		this.host.repos(this, node.getBoundingClientRect());
	}

	render(time, tick) {
		this.calculateScaleAndPosition();
		const group = this.group;
		const scale = this.scale;
		// group.scale.set(scale.x, scale.y, scale.z);
		const position = this.position;
		group.position.set(position.x, 0, 0);
		// const pow = this.pow();
		// group.rotation.x = deg(180) * pow;
		// group.rotation.y = deg(360) * pow;
	}

	getScroll(offset) {
		const scroll = this.intersection.scroll(offset);
		// console.log(scroll);
		return scroll;
	}

	getPow(offset) {
		let pow = Math.min(0.0, this.intersection.offset(offset)) + 1;
		pow = Math.max(0.0, pow);
		// pow = Ease.Sine.InOut(pow);
		pow -= 1;
		return pow;
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

}

ModelComponent.meta = {
	selector: '[model]',
	hosts: { host: WorldComponent },
	inputs: ['item'],
};
