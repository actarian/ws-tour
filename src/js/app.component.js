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
							viewId: this.view.id,
						});
						break;
					case MessageType.RequestInfoResult:
						if (this.controls.view.value !== message.viewId) {
							this.controls.view.value = message.viewId;
							console.log('AppComponent.RequestInfoResult', message.viewId);
						}
						break;
					case MessageType.NavToView:
						if ((agora.state.locked || agora.state.spying) && message.viewId) {
							if (this.controls.view.value !== message.viewId) {
								this.controls.view.value = message.viewId;
								console.log('AppComponent.NavToView', message.viewId);
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
			agora.devices$().subscribe(devices => {
				agora.patchState({ devices, mediaStatus: (devices.videos.length || devices.audios.length) ? MediaStatus.Ready : MediaStatus.Unavalable });
			});
			// this.checkCamera();
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
				this.agora.patchState({ mediaStatus: MediaStatus.Ready });
			}).catch((error) => {
				console.log('media error', error);
			});
		}
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
			console.log('form.changes$', changes, form.valid);
			const view = data.views.find(x => x.id === changes.view);
			this.view = null;
			this.pushChanges();
			setTimeout(() => {
				this.view = view;
				this.pushChanges();
				// !!!
				if (!DEBUG) {
					this.agora.navToView(view.id);
				}
			}, 1);
		});
	}

	connect() {
		if (!this.state.connecting) {
			let quality = this.agora.state.role === RoleType.Attendee ? StreamQualities[StreamQualities.length - 1] : StreamQualities[1]; // HD 1920
			this.agora.patchState({ connecting: true, quality });
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
		if (!DEBUG) {
			this.agora.leaveChannel();
		} else {
			this.patchState({ connecting: false, connected: false });
		}
	}

	onSlideChange(index) {
		if (!DEBUG) {
			this.agora.sendMessage({
				type: MessageType.SlideChange,
				index
			});
		}
	}

	onNavTo(viewId) {
		if (this.controls.view.value !== viewId) {
			this.controls.view.value = viewId;
		}
	}

	onRemoteControlRequest(message) {
		ModalService.open$({ src: CONTROL_REQUEST, data: null }).pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(event => {
			if (!DEBUG) {
				if (event instanceof ModalResolveEvent) {
					message.type = MessageType.RequestControlAccepted;
					this.state.locked = true;
				} else {
					message.type = MessageType.RequestControlRejected;
					this.state.locked = false;
				}
				this.agora.sendMessage(message);
				this.pushChanges();
			} else {
				if (event instanceof ModalResolveEvent) {
					this.patchState({ control: true, spying: false });
				} else {
					this.patchState({ control: false, spying: false });
				}
			}
		});
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	// onDestroy() {}

	patchState(state) {
		this.state = Object.assign({}, this.state, state);
		this.pushChanges();
		console.log(this.state);
	}

	toggleCamera() {
		if (!DEBUG) {
			this.agora.toggleCamera();
		} else {
			this.patchState({ cameraMuted: !this.state.cameraMuted });
		}
	}

	toggleAudio() {
		if (!DEBUG) {
			this.agora.toggleAudio();
		} else {
			this.patchState({ audioMuted: !this.state.audioMuted });
		}
	}

	toggleControl() {
		if (!DEBUG) {
			this.agora.toggleControl();
		} else if (this.state.control) {
			this.patchState({ control: false });
		} else {
			this.onRemoteControlRequest({});
		}
	}

	toggleSpy() {
		if (!DEBUG) {
			this.agora.toggleSpy();
		} else {
			this.patchState({ spying: !this.state.spying, control: false });
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

	onPrevent(event) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}

}

AppComponent.meta = {
	selector: '[app-component]',
};
