// @ts-ignore
// const AgoraRTC = require('agora-rtc-sdk');

import AgoraRTM from 'agora-rtm-sdk';
import { BehaviorSubject, from, of , Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environment/environment';
import Emittable from '../emittable/emittable';
import HttpService from '../http/http.service';
import LocationService from '../location/location.service';

export const USE_AUTODETECT = true;
export const USE_RTM = true;

export const StreamQualities = [{
	id: 1,
	name: '4K 2160p 3840x2160',
	resolution: {
		width: 3840,
		height: 2160
	},
	frameRate: {
		min: 15,
		max: 30
	},
	bitrate: {
		min: 8910,
		max: 13500
	}
}, {
	id: 2,
	name: 'HD 1440p 2560×1440',
	resolution: {
		width: 2560,
		height: 1440
	},
	frameRate: {
		min: 15,
		max: 30
	},
	bitrate: {
		min: 4850,
		max: 7350
	}
}, {
	id: 3,
	name: 'HD 1080p 1920x1080',
	resolution: {
		width: 1920,
		height: 1080
	},
	frameRate: {
		min: 15,
		max: 30
	},
	bitrate: {
		min: 2080,
		max: 4780
	}
}, {
	id: 4,
	name: 'LOW 720p 960x720',
	resolution: {
		width: 960,
		height: 720
	},
	frameRate: {
		min: 15,
		max: 30
	},
	bitrate: {
		min: 910,
		max: 1380
	}
}];

export const MediaStatus = {
	Waiting: 'waiting',
	Ready: 'ready',
	Unavalable: 'unavailable',
};

export const RoleType = {
	Attendee: 'attendee',
	Publisher: 'publisher',
};

export const MessageType = {
	Ping: 'ping',
	RequestControl: 'requestControl',
	RequestControlAccepted: 'requestControlAccepted',
	RequestControlRejected: 'requestControlRejected',
	RequestControlDismiss: 'requestControlDismiss',
	RequestControlDismissed: 'requestControlDismissed',
	RequestInfo: 'requestInfo',
	RequestInfoResult: 'requestInfoResult',
	SlideChange: 'slideChange',
	CameraRotate: 'cameraRotate',
	CameraOrientation: 'cameraOrientation',
	NavToView: 'navToView',
};

export class AgoraEvent {
	constructor(options) {
		Object.assign(this, options);
	}
}

export class AgoraRemoteEvent extends AgoraEvent {}

export default class AgoraService extends Emittable {

	static getSingleton(defaultDevices) {
		if (!this.AGORA) {
			this.AGORA = new AgoraService(defaultDevices);
		}
		console.log('AgoraService', this.AGORA.state);
		return this.AGORA;
	}

	set state(state) {
		this.state$.next(state);
	}

	get state() {
		return this.state$.getValue();
	}

	constructor(defaultDevices) {
		if (AgoraService.AGORA) {
			throw ('AgoraService is a singleton');
		}
		super();
		this.onStreamPublished = this.onStreamPublished.bind(this);
		this.onStreamAdded = this.onStreamAdded.bind(this);
		this.onStreamSubscribed = this.onStreamSubscribed.bind(this);
		this.onStreamRemoved = this.onStreamRemoved.bind(this);
		this.onPeerLeaved = this.onPeerLeaved.bind(this);
		this.onConnectionStateChange = this.onConnectionStateChange.bind(this);
		this.onTokenPrivilegeWillExpire = this.onTokenPrivilegeWillExpire.bind(this);
		this.onTokenPrivilegeDidExpire = this.onTokenPrivilegeDidExpire.bind(this);
		this.onMessage = this.onMessage.bind(this);
		const role = LocationService.get('role') || RoleType.Attendee;
		const state = {
			role: role,
			connecting: false,
			connected: false,
			locked: false,
			control: false,
			cameraMuted: false,
			audioMuted: false,
			devices: role !== RoleType.Attendee ? defaultDevices : { videos: [], audios: [] },
			mediaStatus: MediaStatus.Waiting,
			quality: StreamQualities[StreamQualities.length - 1],
		};
		this.state$ = new BehaviorSubject(state);
		this.message$ = new Subject();
		this.events$ = new Subject();
	}

	addStreamDevice(src) {
		this.removeStreamDevice();
		const video = {
			deviceId: 'video-stream',
			label: 'videostream',
			kind: 'videostream',
			src: src,
		};
		const audio = {
			deviceId: 'audio-stream',
			label: 'videostream',
			kind: 'videostream',
			src: src,
		};
		const devices = this.state.devices;
		devices.videos.push(video);
		devices.audios.push(audio);
		this.patchState({ devices: devices });
	}

	removeStreamDevice() {
		const devices = this.state.devices;
		devices.videos = devices.videos.filter(x => x.kind !== 'videostream');
		devices.audios = devices.audios.filter(x => x.kind !== 'videostream');
		this.patchState({ devices: devices });
	}

	patchState(state) {
		this.state = Object.assign({}, this.state, state);
		console.log(this.state);
	}

	checkMediaDevices$(options = { video: true, audio: true }) {
		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			return from(navigator.mediaDevices.getUserMedia(options)).pipe(
				tap(this.patchState({ mediaStatus: MediaStatus.Ready }))
			);
		} else {
			return of(null);
		}
	}

	devices$() {
		const inputs = this.state.devices;
		return from(new Promise((resolve, reject) => {
			AgoraRTC.getDevices((devices) => {
				for (let i = 0; i < devices.length; i++) {
					const device = devices[i];
					// console.log('device', device.deviceId);
					if (device.kind === 'videoinput' && device.deviceId) {
						inputs.videos.push({
							label: device.label || 'camera-' + inputs.videos.length,
							deviceId: device.deviceId,
							kind: device.kind
						});
					}
					if (device.kind === 'audioinput' && device.deviceId) {
						inputs.audios.push({
							label: device.label || 'microphone-' + inputs.videos.length,
							deviceId: device.deviceId,
							kind: device.kind
						});
					}
				}
				if (inputs.videos.length > 0 || inputs.audios.length > 0) {
					resolve(inputs);
				} else {
					reject(inputs);
				}
			});
		}));
	}

	connect$() {
		this.patchState({ connecting: true });
		this.createClient(() => {
			this.getRtcToken().subscribe(token => {
				// console.log('token', token);
				this.joinChannel(token.token);
			});
		});
		return this.state$;
	}

	getRtcToken() {
		if (environment.apiEnabled) {
			return HttpService.post$('/api/token/rtc', { uid: null });
		} else {
			return of({ token: null });
		}
	}

	getRtmToken(uid) {
		if (environment.apiEnabled) {
			return HttpService.post$('/api/token/rtm', { uid: uid });
		} else {
			return of({ token: null });
		}
	}

	createClient(next) {
		if (this.client) {
			next();
		}
		// console.log('agora rtc sdk version: ' + AgoraRTC.VERSION + ' compatible: ' + AgoraRTC.checkSystemRequirements());
		AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.ERROR);
		const client = this.client = AgoraRTC.createClient({ mode: 'live', codec: 'h264' }); // rtc
		client.init(environment.appKey, () => {
			// console.log('AgoraRTC client initialized');
			next();
		}, (error) => {
			// console.log('AgoraRTC client init failed', error);
			this.client = null;
		});
		client.on('stream-published', this.onStreamPublished);
		//subscribe remote stream
		client.on('stream-added', this.onStreamAdded);
		client.on('stream-subscribed', this.onStreamSubscribed);
		client.on('error', this.onError);
		// Occurs when the peer user leaves the channel; for example, the peer user calls Client.leave.
		client.on('peer-leave', this.onPeerLeaved);
		client.on('connection-state-change', this.onConnectionStateChange);
		client.on('stream-removed', this.onStreamRemoved);
		client.on('onTokenPrivilegeWillExpire', this.onTokenPrivilegeWillExpire);
		client.on('onTokenPrivilegeDidExpire', this.onTokenPrivilegeDidExpire);
		// console.log('agora rtm sdk version: ' + AgoraRTM.VERSION + ' compatible');
		if (USE_RTM) {
			const messageClient = this.messageClient = AgoraRTM.createInstance(environment.appKey, { logFilter: AgoraRTM.LOG_FILTER_ERROR }); // LOG_FILTER_DEBUG
			messageClient.on('ConnectionStateChanged', console.error);
			messageClient.on('MessageFromPeer', console.warn);
		}
	}

	joinChannel(token) {
		const client = this.client;
		const clientUID = null;
		token = null; // !!!
		client.join(token, environment.channelName, clientUID, (uid) => {
			console.log('AgoraService.joinChannel', uid);
			this.patchState({ connected: true, uid: uid });
			if (USE_RTM) {
				this.getRtmToken(uid).subscribe(token => {
					// console.log('token', token);
					this.joinMessageChannel(token.token, uid).then((success) => {
						// console.log('joinMessageChannel.success', success);
					}, error => {
						// console.log('joinMessageChannel.error', error);
					});
				});
			}
			if (USE_AUTODETECT) {
				this.detectDevices((devices) => {
					const video = devices.videos.length ? devices.videos[0] : null;
					const audio = devices.audios.length ? devices.audios[0] : null;
					this.createMediaStream(uid, video, audio);
					/*
					const cameraId = devices.videos.length ? devices.videos[0].deviceId : null;
					const microphoneId = devices.audios.length ? devices.audios[0].deviceId : null;
					this.createLocalStream(uid, microphoneId, cameraId);
					*/
				});
			} else {
				this.createMediaStream(uid, this.state.devices.video, this.state.devices.audio);
			}
		}, (error) => {
			console.log('Join channel failed', error);
		});
		// https://console.agora.io/invite?sign=YXBwSWQlM0RhYjQyODlhNDZjZDM0ZGE2YTYxZmQ4ZDY2Nzc0YjY1ZiUyNm5hbWUlM0RaYW1wZXR0aSUyNnRpbWVzdGFtcCUzRDE1ODY5NjM0NDU=// join link expire in 30 minutes
	}

	joinMessageChannel(token, uid) {
		return new Promise((resolve, reject) => {
			const messageClient = this.messageClient;
			token = null; // !!!
			messageClient.login({ uid: uid.toString() }).then(() => {
				this.messageChannel = messageClient.createChannel(environment.channelName);
				return this.messageChannel.join();
			}).then(() => {
				this.messageChannel.on('ChannelMessage', this.onMessage);
				resolve(uid);
			}).catch(reject);
		});
	}

	sendMessage(message) {
		if (this.state.connected) {
			message.wrc_version = 'beta';
			message.uid = this.state.uid;
			const messageChannel = this.messageChannel;
			messageChannel.sendMessage({ text: JSON.stringify(message) });
			// console.log('wrc: send', message);
			if (message.rpcid) {
				return new Promise(resolve => {
					this.once(`message-${message.rpcid}`, (message) => {
						resolve(message);
					});
				});
			} else {
				return Promise.resolve(message);
			}
		}
	}

	detectDevices(next) {
		AgoraRTC.getDevices((devices) => {
			const videos = [];
			const audios = [];
			for (let i = 0; i < devices.length; i++) {
				const device = devices[i];
				if ('videoinput' == device.kind) {
					videos.push({
						label: device.label || 'camera-' + videos.length,
						deviceId: device.deviceId,
						kind: device.kind
					});
				}
				if ('audioinput' == device.kind) {
					audios.push({
						label: device.label || 'microphone-' + videos.length,
						deviceId: device.deviceId,
						kind: device.kind
					});
				}
			}
			next({ videos: videos, audios: audios });
		});
	}

	getVideoStream(options, video) {
		return new Promise((resolve, reject) => {
			if (video) {
				if (video.kind === 'videostream') {
					const element = document.querySelector('#' + video.deviceId);
					element.crossOrigin = 'anonymous';
					var hls = new Hls();
					hls.attachMedia(element);
					hls.on(Hls.Events.MEDIA_ATTACHED, () => {
						hls.loadSource(video.src);
						hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
							console.log('HlsDirective', data.levels);
							element.play().then(success => {
								const stream = element.captureStream();
								options.videoSource = stream.getVideoTracks()[0];
								console.log('AgoraService.getVideoStream', element, stream, stream.getVideoTracks());
								resolve(options);
							}, error => {
								console.log('AgoraService.getVideoStream.error', error);
							});
						});
					});
				} else if (video.kind === 'videoplayer' || video.kind === 'videostream') {
					const element = document.querySelector('#' + video.deviceId);
					element.crossOrigin = 'anonymous';
					// element.oncanplay = () => {
					const stream = element.captureStream();
					options.videoSource = stream.getVideoTracks()[0];
					console.log('getVideoStream', element, stream, stream.getVideoTracks());
					resolve(options);
					// };
					/*
					element.play().then(success => {
						const stream = element.captureStream();
						options.videoSource = stream.getVideoTracks()[0];
						console.log('getVideoStream', element, stream, stream.getVideoTracks());
						resolve(options);
					}, error => {
						console.log('AgoraService.getVideoStream.error', error);
					});
					*/
				} else {
					options.cameraId = video.deviceId;
					resolve(options);
				}
			} else {
				resolve(options);
			}
		});
	}

	getAudioStream(options, audio) {
		return new Promise((resolve, reject) => {
			if (audio) {
				if (audio.kind === 'videostream') {
					const element = document.querySelector('#' + audio.deviceId);
					element.crossOrigin = 'anonymous';
					// !!! try hls.service;
					var hls = new Hls();
					hls.attachMedia(element);
					hls.on(Hls.Events.MEDIA_ATTACHED, () => {
						hls.loadSource(audio.src);
						hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
							console.log('HlsDirective', data.levels);
							hls.loadLevel = data.levels.length - 1;
							element.play().then(success => {
								const stream = element.captureStream();
								options.audioSource = stream.getAudioTracks()[0];
								console.log('AgoraService.getAudioStream', element, stream, stream.getAudioTracks());
								resolve(options);
							}, error => {
								console.log('AgoraService.getVideoStream.error', error);
							});
						});
					});
				} else if (audio.kind === 'videoplayer' || audio.kind === 'videostream') {
					const element = document.querySelector('#' + audio.deviceId);
					element.crossOrigin = 'anonymous';
					// element.oncanplay = () => {
					const stream = element.captureStream();
					options.audioSource = stream.getAudioTracks()[0];
					console.log('AgoraService.getAudioStream', element, stream, stream.getAudioTracks());
					resolve(options);
					// };
					/*
					element.play().then(success => {
						const stream = element.captureStream();
						options.audioSource = stream.getAudioTracks()[0];
						console.log('AgoraService.getAudioStream', element, stream, stream.getAudioTracks());
						resolve(options);
					}, error => {
						console.log('AgoraService.getAudioStream.error', error);
					});
					*/
				} else {
					options.microphoneId = audio.deviceId;
					resolve(options);
				}
			} else {
				resolve(options);
			}
		});
	}

	createMediaStream(uid, video, audio) {
		// this.releaseStream('_mediaVideoStream')
		const options = {
			streamID: uid,
			video: Boolean(video),
			audio: Boolean(audio),
			screen: false,
		};
		Promise.all([
			this.getVideoStream(options, video),
			this.getAudioStream(options, audio)
		]).then(success => {
			console.log('AgoraService.createMediaStream', uid, options);
			const local = this.local = AgoraRTC.createStream(options);
			if (this.state.role === RoleType.Publisher) {
				const quality = {
					resolution: this.state.quality.resolution,
					frameRate: this.state.quality.frameRate,
					bitrate: this.state.quality.bitrate,
				};
				console.log('AgoraService.setVideoEncoderConfiguration', quality)
				local.setVideoEncoderConfiguration(quality);
			}
			this.initLocalStream(options);
		});
	}

	initLocalStream(options) {
		const client = this.client;
		const local = this.local;
		local.init(() => {
			const id = local.getId();
			console.log('AgoraService.initLocalStream', id);
			const video = document.querySelector('.video--local');
			if (video) {
				video.setAttribute('id', 'agora_local_' + id);
				video.classList.add('playing');
				// setTimeout(() => {
				local.play('agora_local_' + id, (error) => {
					if (error) {
						console.log('AgoraService.initLocalStream.play.error', error);
					} else {
						this.patchState({ local: id, localStream: local });
						this.publishLocalStream();
					}
				});
				// }, 100);
			}
		}, (error) => {
			console.log('AgoraService.initLocalStream.init.error', error);
		});
	}

	createLocalStream(uid, microphoneId, cameraId) {
		// console.log('createLocalStream', uid, microphoneId, cameraId);
		if (microphoneId || cameraId) {
			const local = this.local = AgoraRTC.createStream({
				streamID: uid,
				microphoneId: microphoneId,
				cameraId: cameraId,
				audio: microphoneId ? true : false,
				video: cameraId ? true : false,
				screen: false,
			});
			this.initLocalStream();
		}
	}

	createMediaVideoStream(video, callback) {
		// this.releaseStream('_mediaVideoStream')
		const videoStream = video.captureStream(60);
		const stream = AgoraRTC.createStream({
			audio: true,
			video: true,
			videoSource: videoStream.getVideoTracks()[0],
			audioSource: videoStream.getAudioTracks()[0],
		});
		stream.init(() => {
			callback(stream.getVideoTrack(), stream.getAudioTrack());
		});
	}

	publishLocalStream() {
		const client = this.client;
		const local = this.local;
		//publish local stream
		client.publish(local, (error) => {
			console.log('AgoraService.publishLocalStream.error', error, local.getId());
		});
	}

	unpublishLocalStream() {
		const client = this.client;
		const local = this.local;
		client.unpublish(local, (error) => {
			console.log('unpublish failed');
		});
	}

	leaveChannel() {
		this.patchState({ connecting: false });
		const client = this.client;
		client.leave(() => {
			// console.log('Leave channel successfully');
			this.patchState({ connected: false });
			const messageChannel = this.messageChannel;
			const messageClient = this.messageClient;
			messageChannel.leave();
			messageClient.logout();
		}, (error) => {
			console.log('Leave channel failed');
		});
	}

	toggleCamera() {
		const local = this.local;
		// console.log('toggleCamera', local);
		if (local && local.video) {
			if (local.userMuteVideo) {
				local.unmuteVideo();
				this.patchState({ cameraMuted: false });
			} else {
				local.muteVideo();
				this.patchState({ cameraMuted: true });
			}
		}
	}

	toggleAudio() {
		const local = this.local;
		// console.log(local);
		if (local && local.audio) {
			if (local.userMuteAudio) {
				local.unmuteAudio();
				this.patchState({ audioMuted: false });
			} else {
				local.muteAudio();
				this.patchState({ audioMuted: true });
			}
		}
	}

	toggleControl() {
		if (this.state.control) {
			this.sendRemoteControlDismiss().then((control) => {
				// console.log('AgoraService.sendRemoteControlDismiss', control);
				this.patchState({ control: !control });
			});
		} else {
			if (this.state.spying) {
				this.patchState({ spying: false });
			}
			this.sendRemoteControlRequest().then((control) => {
				// console.log('AgoraService.sendRemoteControlRequest', control);
				this.patchState({ control: control });
			});
		}
	}

	toggleSpy() {
		if (this.state.control) {
			this.sendRemoteControlDismiss().then((control) => {
				this.patchState({ control: false });
				this.sendRemoteRequestInfo().then((info) => {
					this.patchState({ spying: true, control: false });
				});
			});
		} else if (this.state.spying) {
			this.patchState({ spying: false, control: false });
		} else {
			this.sendRemoteRequestInfo().then((info) => {
				this.patchState({ spying: true, control: false });
			});
		}
	}

	navToView(viewId) {
		this.sendMessage({
			type: MessageType.NavToView,
			viewId: viewId,
		});
	}

	getRemoteTargetUID() {
		if (!this.rtmChannel || !this.cname) {
			throw new Error("not join channel");
		}
		return this.sendMessage({
			type: MessageType.Ping,
			rpcid: Date.now().toString(),
		}).then(message => {
			return message.payload.uid;
		});
	}

	sendRemoteControlDismiss() {
		return new Promise((resolve, reject) => {
			this.sendMessage({
				type: MessageType.RequestControlDismiss,
				rpcid: Date.now().toString(),
			}).then((message) => {
				// console.log('AgoraService.sendRemoteControlDismiss return', message);
				if (message.type === MessageType.RequestControlDismissed) {
					resolve(true);
				} else if (message.type === MessageType.RequestControlRejected) {
					resolve(false);
				}
			});
		});
	}

	sendRemoteControlRequest(message) {
		return new Promise((resolve, reject) => {
			this.sendMessage({
				type: MessageType.RequestControl,
				rpcid: Date.now().toString(),
			}).then((message) => {
				// console.log('AgoraService.sendRemoteControlRequest return', message);
				if (message.type === MessageType.RequestControlAccepted) {
					/*
			  this.remoteDeviceInfo = message.payload;
			  if (this.playerElement) {
				this.remoteStream.play(this.playerElement.id, { fit: 'contain', muted: true });
				this.controlMouse()
				resolve(true);
				return;
			  } else {
				reject('request not accepted');
			  }
			  */
					resolve(true);
				} else if (message.type === MessageType.RequestControlRejected) {
					// this.remoteDeviceInfo = undefined
					resolve(false);
				}
			});
		});
	}

	sendRemoteRequestInfo(message) {
		return new Promise((resolve, reject) => {
			this.sendMessage({
				type: MessageType.RequestInfo,
				rpcid: Date.now().toString(),
			}).then((message) => {
				if (message.type === MessageType.RequestInfoResult) {
					resolve(true);
				} else {
					resolve(false);
				}
			});
		});
	}

	getSessionStats() {
		const client = this.client;
		client.getSessionStats((stats) => {
			console.log(`Current Session Duration: ${stats.Duration}`);
			console.log(`Current Session UserCount: ${stats.UserCount}`);
			console.log(`Current Session SendBytes: ${stats.SendBytes}`);
			console.log(`Current Session RecvBytes: ${stats.RecvBytes}`);
			console.log(`Current Session SendBitrate: ${stats.SendBitrate}`);
			console.log(`Current Session RecvBitrate: ${stats.RecvBitrate}`);
		});
	}

	getSystemStats() {
		const client = this.client;
		client.getSystemStats((stats) => {
			console.log(`Current battery level: ${stats.BatteryLevel}`);
		});
	}

	// events

	onError(error) {
		console.log('Agora', error);
	}

	onMessage(data, uid) {
		if (uid !== this.state.uid) {
			const message = JSON.parse(data.text);
			// console.log('wrc: receive', message);
			if (message.rpcid) {
				this.emit(`message-${message.rpcid}`, message);
			}
			this.message$.next(message);
			switch (message.type) {
				case MessageType.RequestControlDismiss:
					this.patchState({ locked: false });
					this.sendMessage({
						type: MessageType.RequestControlDismissed,
						rpcid: message.rpcid
					});
					break;
			}
			/*
			// this.emit('wrc-message', message);
			if (message.type === WRCMessageType.WRC_CLOSE) {
			  console.log('receive wrc close')
			  this.cleanRemote()
			  this.emit('remote-close')
			}
			*/
		}
	}

	onStreamPublished(event) {
		console.log('Publish local stream successfully');
	}

	onStreamAdded(event) {
		const client = this.client;
		var stream = event.stream;
		var id = stream.getId();
		console.log('New stream added: ' + id);
		if (id !== this.state.uid) {
			client.subscribe(stream, (error) => {
				console.log('stream subscribe failed', error);
			});
		}
	}

	onStreamSubscribed(event) {
		var stream = event.stream;
		var id = stream.getId();
		const element = document.querySelector('.video--remote');
		if (element) {
			element.setAttribute('id', 'agora_remote_' + id);
			element.classList.add('playing');
		}
		this.patchState({ remote: id, remoteStream: stream });
		// console.log('element', element);
		stream.play('agora_remote_' + id);
		console.log('AgoraService.onStreamSubscribed', id);
		if (element) {
			this.events$.next(new AgoraRemoteEvent({ stream, element }));
		}
	}

	// Occurs when the remote stream is removed; for example, a peer user calls Client.unpublish.
	onStreamRemoved(event) {
		var stream = event.stream;
		var id = stream.getId();
		// console.log('stream-removed remote-uid: ', id);
		if (id !== this.state.uid) {
			stream.stop('agora_remote_' + id);
			const video = document.querySelector('.video--remote');
			if (video) {
				video.classList.remove('playing');
				video.textContent = '';
			}
		}
		this.patchState({ remote: null, remoteStream: null });
		// console.log('stream-removed remote-uid: ', id);
	}

	onPeerLeaved(event) {
		var id = event.uid;
		// console.log('peer-leave id', id);
		if (id !== this.state.uid) {
			const video = document.querySelector('.video--remote');
			if (video) {
				video.classList.remove('playing');
				video.textContent = '';
			}
			this.patchState({ remote: null, remoteStream: null, locked: false, control: false });
		} else {
			this.patchState({ local: null, localStream: null, locked: false, control: false });
		}
	}

	onConnectionStateChange(event) {
		console.log('AgoraService.onConnectionStateChange', event);
	}

	onTokenPrivilegeWillExpire(event) {
		// After requesting a new token
		// client.renewToken(token);
		console.log('onTokenPrivilegeWillExpire');
	}

	onTokenPrivilegeDidExpire(event) {
		// After requesting a new token
		// client.renewToken(token);
		console.log('onTokenPrivilegeDidExpire');
	}

}
