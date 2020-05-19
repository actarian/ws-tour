import * as THREE from 'three';
import WorldComponent from '../world.component';
import ModelComponent from './model.component';

export default class ModelPictureComponent extends ModelComponent {

	onInit() {
		super.onInit();
		console.log('ModelPictureComponent.onInit');
	}

	create(callback) {
		const mesh = new THREE.Group();
		if (typeof callback === 'function') {
			callback(mesh);
		}
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}
}

ModelPictureComponent.meta = {
	selector: '[model-picture]',
	hosts: { host: WorldComponent },
	inputs: ['item'],
};
