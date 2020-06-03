// @ts-ignore
// const AgoraRTC = require('agora-rtc-sdk');

import AgoraRTM from 'agora-rtm-sdk';
import { BehaviorSubject, from, of , Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environment/environment';
import Emittable from '../emittable/emittable';
import HttpService from '../http/http.service';
import LocationService from '../location/location.service';

export const USE_AUTODETECT = false;
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
}, {
	id: 5,
	name: 'LOWEST 240p 320x240',
	resolution: {
		width: 320,
		height: 240
	},
	frameRate: {
		min: 15,
		max: 15
	},
	bitrate: {
		min: 140,
		max: 200
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
export class AgoraMuteVideoEvent extends AgoraEvent {}
export class AgoraUnmuteVideoEvent extends AgoraEvent {}
export class AgoraMuteAudioEvent extends AgoraEvent {}
export class AgoraUnmuteAudioEvent extends AgoraEvent {}

export default class AgoraService extends Emittable {

	static getSingleton(defaultDevices) {
		if (!this.AGORA) {
			this.AGORA = new AgoraService(defaultDevices);
		}
		// console.log('AgoraService', this.AGORA.state);
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
		this.onStreamUnpublished = this.onStreamUnpublished.bind(this);
		this.onStreamAdded = this.onStreamAdded.bind(this);
		this.onStreamRemoved = this.onStreamRemoved.bind(this);
		this.onStreamSubscribed = this.onStreamSubscribed.bind(this);
		this.onMuteVideo = this.onMuteVideo.bind(this);
		this.onUnmuteVideo = this.onUnmuteVideo.bind(this);
		this.onMuteAudio = this.onMuteAudio.bind(this);
		this.onUnmuteAudio = this.onUnmuteAudio.bind(this);
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
			devices: (role !== RoleType.Attendee && defaultDevices) ? defaultDevices : { videos: [], audios: [] },
			mediaStatus: MediaStatus.Waiting,
			quality: StreamQualities[StreamQualities.length - 1],
		};
		this.state$ = new BehaviorSubject(state);
		this.local$ = new BehaviorSubject(null);
		this.remotes$ = new BehaviorSubject([]);
		this.message$ = new Subject();
		this.events$ = new Subject();
	}

	patchState(state) {
		this.state = Object.assign({}, this.state, state);
		// console.log('AgoraService.patchState', this.state);
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
			const tempStream = AgoraRTC.createStream({ audio: true, video: true });
			tempStream.init(() => {
				AgoraRTC.getDevices((devices) => {
					tempStream.close();
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
			});
		}));
	}

	connect$(preferences) {
		const devices = this.state.devices;
		if (preferences) {
			devices.video = preferences.video;
			devices.audio = preferences.audio;
		}
		// console.log('AgoraService.connect$', preferences, devices);
		this.patchState({ connecting: true, devices });
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
		// AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.ERROR);
		AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.NONE);
		const client = this.client = AgoraRTC.createClient({ mode: 'live', codec: 'h264' }); // rtc
		client.init(environment.appKey, () => {
			// console.log('AgoraRTC client initialized');
			next();
		}, (error) => {
			// console.log('AgoraRTC client init failed', error);
			this.client = null;
		});
		client.on('stream-published', this.onStreamPublished);
		client.on('stream-unpublished', this.onStreamUnpublished);
		//subscribe remote stream
		client.on('stream-added', this.onStreamAdded);
		client.on('stream-subscribed', this.onStreamSubscribed);
		client.on('mute-video', this.onMuteVideo);
		client.on('unmute-video', this.onUnmuteVideo);
		client.on('mute-audio', this.onMuteAudio);
		client.on('unmute-audio', this.onUnmuteAudio);
		client.on('error', this.onError);
		// Occurs when the peer user leaves the channel; for example, the peer user calls Client.leave.
		client.on('peer-leave', this.onPeerLeaved);
		client.on('connection-state-change', this.onConnectionStateChange);
		client.on('stream-removed', this.onStreamRemoved);
		client.on('onTokenPrivilegeWillExpire', this.onTokenPrivilegeWillExpire);
		client.on('onTokenPrivilegeDidExpire', this.onTokenPrivilegeDidExpire);
		// console.log('agora rtm sdk version: ' + AgoraRTM.VERSION + ' compatible');
		if (USE_RTM) {
			/*
			AgoraRTM.LOG_FILTER_OFF
			AgoraRTM.LOG_FILTER_ERROR
			AgoraRTM.LOG_FILTER_INFO (Default)
			AgoraRTM.LOG_FILTER_WARNING
			*/
			const messageClient = this.messageClient = AgoraRTM.createInstance(environment.appKey, { logFilter: AgoraRTM.LOG_FILTER_OFF }); // LOG_FILTER_DEBUG
			messageClient.on('ConnectionStateChanged', console.error);
			messageClient.on('MessageFromPeer', console.warn);
		}
	}

	joinChannel(token) {
		const client = this.client;
		const clientUID = null;
		token = null; // !!!
		client.join(token, environment.channelName, clientUID, (uid) => {
			// console.log('AgoraService.joinChannel', uid);
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
				this.state.devices.video = this.state.devices.videos[0] || null;
				this.state.devices.audio = this.state.devices.audios[0] || null;
				/*
				const cameraId = devices.videos.length ? devices.videos[0].deviceId : null;
				const microphoneId = devices.audios.length ? devices.audios[0].deviceId : null;
				this.createLocalStream(uid, microphoneId, cameraId);
				*/
			}
			this.createMediaStream(uid, this.state.devices.video, this.state.devices.audio);
		}, (error) => {
			console.log('AgoraService.joinChannel.error', error);
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
							// console.log('HlsDirective', data.levels);
							element.play().then(success => {
								const stream = element.captureStream();
								options.videoSource = stream.getVideoTracks()[0];
								// console.log('AgoraService.getVideoStream', element, stream, stream.getVideoTracks());
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
					// console.log('getVideoStream', element, stream, stream.getVideoTracks());
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
							// console.log('HlsDirective', data.levels);
							hls.loadLevel = data.levels.length - 1;
							element.play().then(success => {
								const stream = element.captureStream();
								options.audioSource = stream.getAudioTracks()[0];
								// console.log('AgoraService.getAudioStream', element, stream, stream.getAudioTracks());
								resolve(options);
							}, error => {
								console.log('AgoraService.getAudioStream.error', error);
							});
						});
					});
				} else if (audio.kind === 'videoplayer' || audio.kind === 'videostream') {
					const element = document.querySelector('#' + audio.deviceId);
					element.crossOrigin = 'anonymous';
					// element.oncanplay = () => {
					const stream = element.captureStream();
					options.audioSource = stream.getAudioTracks()[0];
					// console.log('AgoraService.getAudioStream', element, stream, stream.getAudioTracks());
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
			// console.log('AgoraService.createMediaStream', uid, options);
			const local = this.local = AgoraRTC.createStream(options);
			const quality = Object.assign({}, this.state.quality);
			// console.log('AgoraService.setVideoEncoderConfiguration', quality);
			local.setVideoEncoderConfiguration(quality);
			this.initLocalStream(options);
		});
	}

	initLocalStream(options) {
		const local = this.local;
		local.init(() => {
			this.publishLocalStream();
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
		// publish local stream
		client.publish(local, (error) => {
			console.log('AgoraService.publishLocalStream.error', local.getId(), error);
		});
		this.local$.next(local);
	}

	unpublishLocalStream() {
		const client = this.client;
		const local = this.local;
		if (local) {
			client.unpublish(local, (error) => {
				console.log('AgoraService.unpublishLocalStream.error', local.getId(), error);
			});
		}
		this.local$.next(null);
	}

	leaveChannel() {
		this.patchState({ connecting: false });
		this.unpublishLocalStream();
		const client = this.client;
		client.leave(() => {
			// console.log('Leave channel successfully');
			this.patchState({ connected: false });
			const messageChannel = this.messageChannel;
			const messageClient = this.messageClient;
			messageChannel.leave();
			messageClient.logout();
		}, (error) => {
			console.log('AgoraService.leaveChannel.error', error);
		});
	}

	toggleCamera() {
		const local = this.local;
		// console.log('toggleCamera', local);
		if (local && local.video) {
			if (local.userMuteVideo) {
				local.unmuteVideo();
				this.patchState({ cameraMuted: false });
				this.events$.next(new AgoraUnmuteVideoEvent({ streamId: local.getId() }));
			} else {
				local.muteVideo();
				this.patchState({ cameraMuted: true });
				this.events$.next(new AgoraMuteVideoEvent({ streamId: local.getId() }));
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
				this.events$.next(new AgoraUnmuteAudioEvent({ streamId: local.getId() }));
			} else {
				local.muteAudio();
				this.patchState({ audioMuted: true });
				this.events$.next(new AgoraMuteAudioEvent({ streamId: local.getId() }));
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
		console.log('AgoraService.onError', error);
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
		console.log('AgoraService.onStreamPublished');
		this.local$.next(this.local);
	}

	onStreamUnpublished(event) {
		console.log('AgoraService.onStreamUnpublished');
		this.local$.next(null);
	}

	onStreamAdded(event) {
		const client = this.client;
		const stream = event.stream;
		const id = stream.getId();
		if (id !== this.state.uid) {
			client.subscribe(stream, (error) => {
				console.log('AgoraService.onStreamAdded.subscribe.error', error);
			});
		}
	}

	onStreamRemoved(event) {
		const stream = event.stream;
		const id = stream.getId();
		console.log('AgoraService.onStreamRemoved', id, this.state.uid);
		if (id !== this.state.uid) {
			this.remoteRemove(id);
		}
	}

	onStreamSubscribed(event) {
		this.remoteAdd(event.stream);
	}

	onPeerLeaved(event) {
		const id = event.uid;
		if (id !== this.state.uid) {
			this.remoteRemove(id);
		}
		this.patchState({ locked: false, control: false });
	}

	remoteAdd(stream) {
		console.log('AgoraService.remoteAdd', stream);
		const remotes = this.remotes$.getValue();
		remotes.push(stream);
		this.remotes$.next(remotes);
		this.events$.next(new AgoraRemoteEvent({ stream }));
	}

	remoteRemove(streamId) {
		console.log('AgoraService.remoteRemove', streamId);
		const remotes = this.remotes$.getValue();
		const remote = remotes.find(x => x.getId() === streamId);
		if (remote) {
			remote.stop();
			remotes.splice(remotes.indexOf(remote), 1);
			this.remotes$.next(remotes);
		}
	}

	onMuteVideo(event) {
		console.log('AgoraService.onMuteVideo', event);
		this.events$.next(new AgoraMuteVideoEvent({ streamId: event.uid }));
	}

	onUnmuteVideo(event) {
		console.log('AgoraService.onUnmuteVideo', event);
		this.events$.next(new AgoraUnmuteVideoEvent({ streamId: event.uid }));
	}

	onMuteAudio(event) {
		console.log('AgoraService.onMuteAudio', event);
		this.events$.next(new AgoraMuteAudioEvent({ streamId: event.uid }));
	}

	onUnmuteAudio(event) {
		console.log('AgoraService.onUnmuteAudio', event);
		this.events$.next(new AgoraUnmuteAudioEvent({ streamId: event.uid }));
	}

	onConnectionStateChange(event) {
		console.log('AgoraService.onConnectionStateChange', event);
	}

	onTokenPrivilegeWillExpire(event) {
		// After requesting a new token
		// client.renewToken(token);
		console.log('AgoraService.onTokenPrivilegeWillExpire');
	}

	onTokenPrivilegeDidExpire(event) {
		// After requesting a new token
		// client.renewToken(token);
		console.log('AgoraService.onTokenPrivilegeDidExpire');
	}

}
