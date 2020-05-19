import html2canvas from 'html2canvas';
import { getContext } from 'rxcomp';
import * as THREE from 'three';
import WorldComponent from '../world.component';
import ModelComponent from './model.component';

const PANEL_RADIUS = 102;
const ORIGIN = new THREE.Vector3();

export default class ModelPanelComponent extends ModelComponent {

	onInit() {
		super.onInit();
		// console.log('ModelPanelComponent.onInit', this.item);
	}

	onView() {
		if (this.panel) {
			return;
		}
		this.getCanvasTexture().then(texture => {
			const aspect = texture.width / texture.height;
			const width = PANEL_RADIUS / 8;
			const height = PANEL_RADIUS / 8 / aspect;
			const geometry = new THREE.PlaneBufferGeometry(width, height, 3, 3);
			const material = new THREE.MeshBasicMaterial({
				map: texture.map,
				transparent: true,
				opacity: 0,
				// side: THREE.DoubleSide,
			});
			const position = this.item.mesh.position.normalize().multiplyScalar(PANEL_RADIUS);
			const panel = this.panel = new THREE.Mesh(geometry, material);
			panel.position.set(position.x, position.y, position.z);
			panel.lookAt(ORIGIN);
			this.mesh.add(panel);
			const from = { value: 0 };
			gsap.to(from, 0.5, {
				value: 1,
				delay: 0.0,
				ease: Power2.easeInOut,
				onUpdate: () => {
					panel.position.set(position.x, position.y + height * from.value, position.z);
					panel.lookAt(ORIGIN);
					panel.material.opacity = from.value;
					panel.material.needsUpdate = true;
				}
			});
		});
	}

	create(callback) {
		const mesh = new THREE.Group();
		if (typeof callback === 'function') {
			callback(mesh);
		}
	}

	getCanvasTexture() {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				const { node } = getContext(this);
				html2canvas(node, {
					backgroundColor: '#ffffff00',
				}).then(canvas => {
					// !!!
					// document.body.appendChild(canvas);
					// const alpha = this.getAlphaFromCanvas(canvas);
					// document.body.appendChild(alpha);
					const map = new THREE.CanvasTexture(canvas);
					// const alphaMap = new THREE.CanvasTexture(alpha);
					resolve({
						map: map,
						// alphaMap: alphaMap,
						width: canvas.width,
						height: canvas.height,
					});
				}, error => {
					reject(error);
				});
			}, 1);
		});
	}

}

ModelPanelComponent.ORIGIN = new THREE.Vector3();

ModelPanelComponent.meta = {
	selector: '[model-panel]',
	hosts: { host: WorldComponent },
	outputs: ['over', 'out', 'down'],
	inputs: ['item'],
};
