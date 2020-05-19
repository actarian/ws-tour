import { Component, getContext } from 'rxcomp';
import { takeUntil, tap } from 'rxjs/operators';
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { environment } from '../../environment/environment';
// import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import AgoraService, { MessageType } from '../agora/agora.service';
import { BASE_HREF, DEBUG } from '../const';
import DragService, { DragDownEvent, DragMoveEvent, DragUpEvent } from '../drag/drag.service';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Rect } from '../rect/rect';
import InteractiveMesh from './interactive/interactive.mesh';
import OrbitService from './orbit/orbit';
import Panorama from './panorama/panorama';
import VRService from './vr.service';

const POINTER_RADIUS = 99;
const ORIGIN = new THREE.Vector3();

export default class WorldComponent extends Component {

	get error() {
		return this.error_;
	}

	set error(error) {
		if (this.error_ !== error) {
			this.error_ = error;
			this.pushChanges();
		}
	}

	get view() {
		return this.view_;
	}

	set view(view) {
		if (this.view_ !== view) {
			this.view_ = view;
			this.setView();
		}
	}

	onInit() {
		// console.log('WorldComponent.onInit');
		this.index = 0;
		this.error_ = null;
		this.createScene();
		this.setView();
		this.addListeners();
		this.animate(); // !!! no
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	onDestroy() {
		this.removeListeners();
		const renderer = this.renderer;
		renderer.setAnimationLoop(() => {});
	}

	createScene() {
		const { node } = getContext(this);
		this.size = { width: 0, height: 0, aspect: 0 };
		this.mouse = new THREE.Vector2();
		this.direction = new THREE.Vector3();

		const container = this.container = node;
		const info = this.info = node.querySelector('.world__info');

		const worldRect = this.worldRect = Rect.fromNode(container);
		const cameraRect = this.cameraRect = new Rect();

		// new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, ROOM_RADIUS * 2);
		const camera = this.camera = new THREE.PerspectiveCamera(70, container.offsetWidth / container.offsetHeight, 0.01, 1000);
		camera.target = new THREE.Vector3();
		/*
		camera.position.set(0, 20, 20);
		camera.lookAt(camera.target);
		*/

		const orbit = this.orbit = new OrbitService(camera);

		const renderer = this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: false,
			premultipliedAlpha: true,
			// physicallyCorrectLights: true,
		});
		renderer.setClearColor(0x000000, 1);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(container.offsetWidth, container.offsetHeight);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 0.8;
		renderer.outputEncoding = THREE.sRGBEncoding;
		renderer.xr.enabled = true;
		if (container.childElementCount > 0) {
			container.insertBefore(renderer.domElement, container.children[0]);
		} else {
			container.appendChild(renderer.domElement);
		}

		const raycaster = this.raycaster = new THREE.Raycaster();

		const scene = this.scene = new THREE.Scene();

		const panorama = this.panorama = new Panorama();
		scene.add(panorama.mesh);

		const pointer = this.pointer = this.addPointer();

		const torus = this.torus = this.addTorus();

		var mainLight = new THREE.PointLight(0xffffff);
		mainLight.position.set(-50, 0, -50);
		scene.add(mainLight);

		const objects = this.objects = new THREE.Group();
		scene.add(objects);

		const light = new THREE.AmbientLight(0x404040);
		scene.add(light);

		this.onSelect1Start = this.onSelect1Start.bind(this);
		this.onSelect1End = this.onSelect1End.bind(this);
		this.onSelect2Start = this.onSelect2Start.bind(this);
		this.onSelect2End = this.onSelect2End.bind(this);

		const controller1 = this.controller1 = renderer.xr.getController(0);
		controller1.addEventListener('selectstart', this.onSelect1Start);
		controller1.addEventListener('selectend', this.onSelect1End);
		controller1.addEventListener('connected', (event) => {
			controller1.add(this.buildController(event.data));
		});
		controller1.addEventListener('disconnected', () => {
			controller1.remove(controller1.children[0]);
		});
		scene.add(controller1);
		const controller2 = this.controller2 = renderer.xr.getController(1);
		controller2.addEventListener('selectstart', this.onSelect2Start);
		controller2.addEventListener('selectend', this.onSelect2End);
		controller2.addEventListener('connected', (event) => {
			controller2.add(this.buildController(event.data));
		});
		controller2.addEventListener('disconnected', () => {
			controller2.remove(controller2.children[0]);
		});
		scene.add(controller2);
		this.controllers = [this.controller1, this.controller2];
		// The XRControllerModelFactory will automatically fetch controller models
		// that match what the user is holding as closely as possible. The models
		// should be attached to the object returned from getControllerGrip in
		// order to match the orientation of the held device.
		const controllerModelFactory = new XRControllerModelFactory();
		const controllerGrip1 = this.controllerGrip1 = renderer.xr.getControllerGrip(0);
		controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
		scene.add(controllerGrip1);
		const controllerGrip2 = this.controllerGrip2 = renderer.xr.getControllerGrip(1);
		controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
		scene.add(controllerGrip2);
		//
		this.resize();
	}

	setView() {
		const view = this.view_;
		if (view) {
			if (this.orbit) {
				if (this.infoResultMessage) {
					this.orbit.setOrientation(this.infoResultMessage.orientation);
					this.infoResultMessage = null;
				} else {
					this.orbit.setOrientation(view.orientation);
				}
			}
			if (this.panorama) {
				this.panorama.swap(view, this.renderer, (envMap, texture, rgbe) => {
					// this.scene.background = envMap;
					this.scene.environment = envMap;
					this.torus.material.envMap = envMap;
					this.torus.material.needsUpdate = true;
					// this.render();
				});
			}
		}
	}

	addPointer(parent) {
		const geometry = new THREE.PlaneBufferGeometry(1.2, 1.2, 2, 2);
		const loader = new THREE.TextureLoader();
		const texture = loader.load(BASE_HREF + environment.paths.textures + 'ui/pin.png');
		// texture.magFilter = THREE.NearestFilter;
		// texture.wrapT = THREE.RepeatWrapping;
		// texture.repeat.y = 1;
		// texture.anisotropy = 0;
		// texture.magFilter = THREE.LinearMipMapLinearFilter;
		// texture.minFilter = THREE.NearestFilter;
		const material = new THREE.MeshBasicMaterial({
			map: texture,
			transparent: true,
			opacity: 0.9,
		});
		const mesh = new THREE.Mesh(geometry, material);
		mesh.renderOrder = 1000;
		mesh.position.set(-100000, -100000, -100000);
		const panorama = this.panorama.mesh;
		panorama.on('down', (panorama) => {
			mesh.material.color.setHex(0x0000ff);
			mesh.material.opacity = 1.0;
			mesh.material.needsUpdate = true;
		});
		panorama.on('up', (panorama) => {
			mesh.material.color.setHex(0xffffff);
			mesh.material.opacity = 0.9;
			mesh.material.needsUpdate = true;
		});
		return mesh;
	}

	addTorus() {
		const geometry = new THREE.TorusKnotBufferGeometry(3, 1.5, 150, 20);
		const material = new THREE.MeshStandardMaterial({
			color: 0x888888,
			metalness: 1.3,
			roughness: 0.3,
		});
		const mesh = new InteractiveMesh(geometry, material);
		mesh.position.set(50, -20, 50);
		mesh.userData.render = () => {
			mesh.rotation.set(0, mesh.rotation.y + 0.01, 0);
		};
		mesh.on('over', () => {
			const from = { scale: mesh.scale.x };
			gsap.to(from, 0.4, {
				scale: 1.5,
				delay: 0,
				ease: Power2.easeInOut,
				onUpdate: () => {
					mesh.scale.set(from.scale, from.scale, from.scale);
				}
			});
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
		});
		this.scene.add(mesh);
		return mesh;
	}

	onSelect1Start() {
		this.controller1.userData.isSelecting = true;
		this.controller = this.controller1;
	}
	onSelect1End() {
		this.controller1.userData.isSelecting = false;
	}
	onSelect2Start() {
		this.controller2.userData.isSelecting = true;
		this.controller = this.controller2;
	}
	onSelect2End() {
		this.controller2.userData.isSelecting = false;
	}

	buildController(data) {
		switch (data.targetRayMode) {
			case 'tracked-pointer':
				var geometry = new THREE.BufferGeometry();
				geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
				geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));
				var material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });
				return new THREE.Line(geometry, material);
			case 'gaze':
				var geometry = new THREE.RingBufferGeometry(0.02, 0.04, 32).translate(0, 0, -1);
				var material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
				return new THREE.Mesh(geometry, material);
		}
	}

	/*
	handleController(controller) {
		if (controller.userData.isSelecting) {
			console.log(controller);
			var object = room.children[ count ++ ];
			object.position.copy( controller.position );
			object.userData.velocity.x = ( Math.random() - 0.5 ) * 3;
			object.userData.velocity.y = ( Math.random() - 0.5 ) * 3;
			object.userData.velocity.z = ( Math.random() - 9 );
			object.userData.velocity.applyQuaternion( controller.quaternion );
			if ( count === room.children.length ) count = 0;
		}
	}
	*/

	onNavOver(event) {
		// console.log('WorldComponent.onNavOver', event);
		event.showPanel = true;
		this.pushChanges();
	}

	onNavOut(event) {
		// console.log('WorldComponent.onNavOut', event);
		event.showPanel = false;
		this.pushChanges();
	}

	onNavDown(event) {
		// console.log('WorldComponent.onNavDown', event);
		event.showPanel = false;
		this.navTo.next(event.navTo);
	}

	drag$() {
		let rotation;
		return DragService.events$(this.node).pipe(
			tap((event) => {
				// const group = this.objects.children[this.index];
				if (event instanceof DragDownEvent) {
					// rotation = group.rotation.clone();
				} else if (event instanceof DragMoveEvent) {
					group.rotation.set(rotation.x + event.distance.y * 0.01, rotation.y + event.distance.x * 0.01, 0);
					this.panorama.mesh.rotation.set(rotation.x + event.distance.y * 0.01, rotation.y + event.distance.x * 0.01 + Math.PI, 0);
					this.render();
					if (this.agora && this.agora.state.control) {
						this.agora.sendMessage({
							type: MessageType.CameraRotate,
							coords: [group.rotation.x, group.rotation.y, group.rotation.z]
						});
					}
				} else if (event instanceof DragUpEvent) {

				}
			})
		);
	}

	onTween() {
		// this.render();
	}

	onSlideChange(index) {
		this.index = index;
		this.slideChange.next(index);
	}

	setRaycaster(controller, raycaster) {
		if (controller) {
			const position = controller.position;
			const rotation = controller.getWorldDirection(this.direction).multiplyScalar(-1);
			raycaster.set(position, rotation);
			return raycaster;
		}
	}

	updateRaycaster() {
		try {
			if (this.renderer.xr.isPresenting) {
				const controller = this.controller;
				if (controller) {
					const raycaster = this.setRaycaster(controller, this.raycaster);
					if (raycaster) {
						const hit = InteractiveMesh.hittest(raycaster, controller.userData.isSelecting);
						if (this.panorama.mesh.intersection) {
							const pointer = this.pointer;
							const position = this.panorama.mesh.intersection.point.normalize().multiplyScalar(POINTER_RADIUS);
							pointer.position.set(position.x, position.y, position.z);
							pointer.lookAt(ORIGIN);
						}
						/*
						if (hit && hit !== this.panorama.mesh) {
							// controllers.feedback();
						}
						*/
					}
				}
			} else {
				const raycaster = this.raycaster;
				if (raycaster) {
					const hit = InteractiveMesh.hittest(this.raycaster);
					/*
					if (hit && hit !== this.panorama.mesh) {
						console.log('hit', hit);
					}
					*/
				}
			}
		} catch (error) {
			this.error = error;
			throw (error);
		}
	}

	repos(object, rect) {
		const worldRect = this.worldRect;
		const sx = 0.8;
		// const sx = rect.width / worldRect.width;
		// const sy = rect.height / worldRect.height;
		object.scale.set(sx, sx, sx);
		// const tx = ((rect.x + rect.width / 2) - worldRect.width / 2) / worldRect.width * 2.0 * this.camera.aspect; // * cameraRect.width / worldRect.width - cameraRect.width / 2;
		// const ty = ((rect.y + rect.height / 2) - worldRect.height / 2) / worldRect.height * 2.0 * this.camera.aspect; // * cameraRect.height / worldRect.height - cameraRect.height / 2;
		const tx = ((rect.x + rect.width / 2) - worldRect.width / 2) / worldRect.width * 2.0 * this.camera.aspect;
		const ty = ((rect.y + rect.height / 2) - worldRect.height / 2) / worldRect.height * 2.0 * this.camera.aspect;
		// console.log(tx);
		// const position = new THREE.Vector3(tx, ty, 0).unproject(this.camera);
		object.position.set(tx, -ty, 0);
		// console.log(tx, -ty, 0);
	}

	render(delta) {
		try {
			const time = performance.now();
			const tick = this.tick_ ? ++this.tick_ : this.tick_ = 1;
			this.updateRaycaster();
			this.scene.traverse((child) => {
				if (typeof child.userData.render === 'function') {
					child.userData.render(time, tick);
				}
			});
			/*
			const objects = this.objects;
			for (let i = 0; i < objects.children.length; i++) {
				const x = objects.children[i];
				if (typeof x.userData.render === 'function') {
					x.userData.render(time, tick);
				}
			}
			*/
			const renderer = this.renderer,
				scene = this.scene,
				camera = this.camera;
			renderer.render(this.scene, this.camera);
		} catch (error) {
			this.error = error;
			throw (error);
		}
	}

	animate() {
		const renderer = this.renderer;
		renderer.setAnimationLoop(this.render);
	}

	resize() {
		try {
			const container = this.container,
				renderer = this.renderer,
				camera = this.camera;
			const size = this.size;
			size.width = container.offsetWidth;
			size.height = container.offsetHeight;
			size.aspect = size.width / size.height;
			const worldRect = this.worldRect;
			worldRect.setSize(size.width, size.height);
			if (renderer) {
				renderer.setSize(size.width, size.height);
			}
			if (camera) {
				camera.aspect = size.width / size.height;
				const angle = camera.fov * Math.PI / 180;
				const height = Math.abs(camera.position.z * Math.tan(angle / 2) * 2);
				const cameraRect = this.cameraRect;
				cameraRect.width = height * camera.aspect;
				cameraRect.height = height;
				// console.log('position', camera.position.z, 'angle', angle, 'height', height, 'aspect', camera.aspect, cameraRect);
				camera.updateProjectionMatrix();
			}
			// this.render();
		} catch (error) {
			this.error = error;
		}
	}

	onMouseDown(event) {
		/*
		if (TEST_ENABLED) {
			this.controllers.setText('down');
			return;
		}
		*/
		try {
			/*
			this.mousedown = true;
			const raycaster = this.raycaster;
			raycaster.setFromCamera(this.mouse, this.camera);
			if (event.shiftKey) {
				const intersections = raycaster.intersectObjects(this.pivot.room.children);
				if (intersections) {
					const intersection = intersections.find(x => x !== undefined);
					this.createPoint(intersection);
				}
			}
			*/
			const w2 = this.size.width / 2;
			const h2 = this.size.height / 2;
			this.mouse.x = (event.clientX - w2) / w2;
			this.mouse.y = -(event.clientY - h2) / h2;
			const raycaster = this.raycaster;
			raycaster.setFromCamera(this.mouse, this.camera);
			const hit = InteractiveMesh.hittest(raycaster, true);
			if (DEBUG && this.panorama.mesh.intersection) {
				const position = new THREE.Vector3().copy(this.panorama.mesh.intersection.point).normalize();
				console.log(JSON.stringify({ position: position.toArray() }));
			}
		} catch (error) {
			this.error = error;
		}
	}

	onMouseMove(event) {
		try {
			const w2 = this.size.width / 2;
			const h2 = this.size.height / 2;
			this.mouse.x = (event.clientX - w2) / w2;
			this.mouse.y = -(event.clientY - h2) / h2;
			/*
			if (TEST_ENABLED) {
				return this.controllers.updateTest(this.mouse);
			}
			*/
			const raycaster = this.raycaster;
			raycaster.setFromCamera(this.mouse, this.camera);
			// InteractiveMesh.hittest(raycaster, this.mousedown);
		} catch (error) {
			this.error = error;
		}
	}

	onMouseUp(event) {
		/*
		if (TEST_ENABLED) {
			this.controllers.setText('up');
			return;
		}
		*/
		// this.mousedown = false;
	}

	onMouseWheel(event) {
		try {
			const camera = this.camera;
			const fov = camera.fov + event.deltaY * 0.01;
			camera.fov = THREE.Math.clamp(fov, 30, 75);
			camera.updateProjectionMatrix();
		} catch (error) {
			this.error = error;
		}
	}

	addListeners() {
		this.resize = this.resize.bind(this);
		this.render = this.render.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseWheel = this.onMouseWheel.bind(this);
		// this.controls.addEventListener('change', this.render); // use if there is no animation loop
		window.addEventListener('resize', this.resize, false);
		document.addEventListener('mousemove', this.onMouseMove, false);
		this.container.addEventListener('mousedown', this.onMouseDown, false);
		this.container.addEventListener('mouseup', this.onMouseUp, false);
		/*
		document.addEventListener('wheel', this.onMouseWheel, false);
		*/
		const vrService = this.vrService = VRService.getService();
		vrService.session$.pipe(
			takeUntil(this.unsubscribe$),
		).subscribe((session) => {
			this.renderer.xr.setSession(session);
			if (session) {
				this.scene.add(this.pointer);
			} else {
				this.scene.remove(this.pointer);
			}
		});

		this.orbit.observe$().pipe(
			takeUntil(this.unsubscribe$),
		).subscribe(event => {
			// this.render();
			if (DEBUG) {
				console.log(JSON.stringify({ orientation: this.orbit.getOrientation() }));
			}
			if (this.agora) {
				this.agora.sendMessage({
					type: MessageType.CameraOrientation,
					orientation: this.orbit.getOrientation()
				});
			}
		});

		if (!DEBUG) {
			const agora = this.agora = AgoraService.getSingleton();
			agora.events$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(event => {
				/*
				if (event instanceof AgoraRemoteEvent) {
					setTimeout(() => {
						this.panorama.setVideo(event.element.querySelector('video'));
					}, 500);
				}
				*/
			});
			agora.message$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(message => {
				switch (message.type) {
					case MessageType.RequestInfo:
						message.type = MessageType.RequestInfoResult;
						message.viewId = this.view.id;
						message.orientation = this.orbit.getOrientation();
						agora.sendMessage(message);
						break;
					case MessageType.RequestInfoResult:
						if (message.viewId === this.view.id) {
							this.orbit.setOrientation(message.orientation);
						} else {
							this.infoResultMessage = message;
						}
						break;
					case MessageType.CameraOrientation:
						if (agora.state.locked || agora.state.spying) {
							this.orbit.setOrientation(message.orientation);
							// this.render();
						}
						break;
					case MessageType.CameraRotate:
						if (agora.state.locked || agora.state.spying) {
							const camera = this.camera;
							camera.position.set(message.coords[0], message.coords[1], message.coords[2]);
							camera.lookAt(ORIGIN);
							// this.render();
						}
						break;
				}
			});
			agora.state$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(state => {
				this.state = state;
				// console.log(state);
				// this.pushChanges();
			});
		}
	}

	removeListeners() {
		window.removeEventListener('resize', this.resize, false);
		window.removeEventListener('resize', this.resize, false);
		document.removeEventListener('mousemove', this.onMouseMove, false);
		document.removeEventListener('wheel', this.onMouseWheel, false);
		this.container.removeEventListener('mousedown', this.onMouseDown, false);
		this.container.removeEventListener('mouseup', this.onMouseUp, false);
	}

}

WorldComponent.meta = {
	selector: '[world]',
	inputs: ['view'],
	outputs: ['slideChange', 'navTo'],
};
