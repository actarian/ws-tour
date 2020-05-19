import { Component, getContext } from 'rxcomp';
// import UserService from './user/user.service';
import { FormControl, FormGroup, Validators } from 'rxcomp-form';
import { first, takeUntil } from 'rxjs/operators';
import AgoraService, { MediaStatus, MessageType, RoleType, StreamQualities } from './agora/agora.service';
import { BASE_HREF, DEBUG } from './const';
import HttpService from './http/http.service';
import LocationService from './location/location.service';
import ModalService, { ModalResolveEvent } from './modal/modal.service';
import VRService from './world/vr.service';

const CONTROL_REQUEST = BASE_HREF + 'control-request.html';
const TRY_IN_AR = BASE_HREF + 'try-in-ar.html';

export default class AppComponent extends Component {

	onInit() {
		const { node } = getContext(this);
		node.classList.remove('hidden');
		this.view = null;
		this.form = null;
		const vrService = this.vrService = VRService.getService();
		vrService.status$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(status => this.pushChanges());
		if (!DEBUG) {
			const agora = this.agora = AgoraService.getSingleton();
			agora.message$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(message => {
				console.log('AppComponent.message', message);
				switch (message.type) {
					case MessageType.RequestControl:
						this.onRemoteControlRequest(message);
						break;
					case MessageType.RequestControlAccepted:
						agora.sendMessage({
							type: MessageType.NavToView,
							id: this.view.id,
						});
						break;
					case MessageType.NavToView:
						if (agora.state.locked && message.id) {
							if (this.controls.view.value !== message.id) {
								this.controls.view.value = message.id;
							}
						}
						break;
				}
			});
			agora.state$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(state => {
				console.log('AppComponent.state', state);
				this.state = state;
				this.pushChanges();
			});
			this.checkCamera();
		} else {
			const role = LocationService.get('role') || RoleType.Attendee;
			this.state = {
				role: role,
				connecting: false,
				connected: true,
				locked: false,
				control: false,
				cameraMuted: false,
				audioMuted: false,
				devices: [],
				mediaStatus: MediaStatus.Ready,
				quality: StreamQualities[StreamQualities.length - 1],
			};
		}
		this.loadData();
	}

	checkCamera() {
		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
				console.log('stream', stream);
				if (!DEBUG) {
					this.agora.patchState({ mediaStatus: MediaStatus.Ready });
				}
			}).catch((error) => {
				console.log('media error', error);
			});
		}
	}

	onPrevent(event) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}

	loadData() {
		HttpService.get$('./api/data.json').pipe(
			first()
		).subscribe(data => {
			data.views.forEach(view => {
				view.items.forEach((item, index) => {
					item.index = index;
				});
			});
			this.data = data;
			this.initForm();
		});
	}

	initForm() {
		const data = this.data;
		const form = this.form = new FormGroup({
			view: new FormControl(data.views[0].id, Validators.RequiredValidator()),
		});
		const controls = this.controls = form.controls;
		controls.view.options = data.views;
		form.changes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe((changes) => {
			// console.log('form.changes$', changes, form.valid);
			const view = data.views.find(x => x.id === changes.view);
			this.view = null;
			this.pushChanges();
			setTimeout(() => {
				this.view = view;
				this.pushChanges();
				if (!DEBUG && this.agora.state.control) {
					this.agora.sendMessage({
						type: MessageType.NavToView,
						id: view.id,
					});
				}
			}, 1);
		});
	}

	connect() {
		if (!this.state.connecting) {
			this.state.connecting = true;
			this.pushChanges();
			setTimeout(() => {
				this.agora.connect$().pipe(
					takeUntil(this.unsubscribe$)
				).subscribe((state) => {
					this.state = Object.assign(this.state, state);
					this.pushChanges();
				});
			}, 1000);
		}
	}

	disconnect() {
		this.state.connecting = false;
		if (!DEBUG) {
			this.agora.leaveChannel();
		} else {
			this.state.connected = false;
			this.pushChanges();
		}
	}

	onChange(index) {
		if (!DEBUG && this.state.control) {
			this.agora.sendMessage({
				type: MessageType.SlideChange,
				index
			});
		}
	}

	onNavTo(id) {
		// const view = this.data.views.find(x => x.id === id);
		if (this.controls.view.value !== id) {
			this.controls.view.value = id;
		}
		/*
		if (!DEBUG && this.state.control) {
			this.agora.sendMessage({
				type: MessageType.SlideChange,
				index
			});
		}
		*/
	}

	onRotate(coords) {
		if (!DEBUG && this.state.control) {
			this.agora.sendMessage({
				type: MessageType.CameraRotate,
				coords
			});
		}
	}

	onRemoteControlRequest(message) {
		ModalService.open$({ src: CONTROL_REQUEST, data: null }).pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(event => {
			if (event instanceof ModalResolveEvent) {
				message.type = MessageType.RequestControlAccepted;
				this.state.locked = true;
			} else {
				message.type = MessageType.RequestControlRejected;
				this.state.locked = false;
			}
			if (!DEBUG) {
				this.agora.sendMessage(message);
			}
			this.pushChanges();
		});
	}

	onDropped(id) {
		console.log('AppComponent.onDropped', id);
	}

	parseQueryString() {
		const action = LocationService.get('action');
		switch (action) {
			case 'login':
				this.openLogin();
				break;
			case 'register':
				this.openRegister();
				break;
		}
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	// onDestroy() {}

	toggleCamera() {
		if (!DEBUG) {
			this.agora.toggleCamera();
		}
	}

	toggleAudio() {
		if (!DEBUG) {
			this.agora.toggleAudio();
		}
	}

	toggleControl() {
		if (!DEBUG) {
			this.agora.toggleControl();
		} else {
			this.onRemoteControlRequest({});
		}
	}

	addToWishlist() {
		if (!this.view.liked) {
			this.view.liked = true;
			this.view.likes++;
			this.pushChanges();
		}
	}

	tryInAr() {
		ModalService.open$({ src: TRY_IN_AR, data: this.view }).pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(event => {
			// this.pushChanges();
		});
	}

}

AppComponent.meta = {
	selector: '[app-component]',
};
