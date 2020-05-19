import { BehaviorSubject, Subject } from "rxjs";

export const XRStatus = {
	Waiting: 'waiting',
	Enabled: 'enabled',
	Ended: 'ended',
	Started: 'started',
	Disabled: 'disabled',
	NeedsHttps: 'needs-https',
	Unavailable: 'unavailable',
};

export default class VRService {

	static getService() {
		if (!this.service_) {
			this.service_ = new VRService();
		}
		return this.service_;
	}

	constructor() {
		if (VRService.service_) {
			throw ('VRService is a singleton class!');
		}
		this.onSessionStarted = this.onSessionStarted.bind(this);
		this.onSessionEnded = this.onSessionEnded.bind(this);
		this.status$ = new BehaviorSubject(XRStatus.Waiting);
		this.session$ = new Subject();
		this.currentSession = null;
		if ('xr' in navigator) {
			navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
				if (supported) {
					this.status$.next(XRStatus.Enabled);
				} else {
					this.status$.next(XRStatus.Disabled);
				}
			});
		} else {
			if (window.isSecureContext === false) {
				this.status$.next(XRStatus.NeedsHttps);
			} else {
				this.status$.next(XRStatus.Unavailable);
				// 'https://immersiveweb.dev/';
			}
		}
	}

	onSessionStarted(session) {
		session.addEventListener('end', this.onSessionEnded);
		this.currentSession = session;
		this.session$.next(session);
		this.status$.next(XRStatus.Started);
	}

	onSessionEnded( /*event*/ ) {
		this.currentSession.removeEventListener('end', this.onSessionEnded);
		this.currentSession = null;
		this.session$.next(null);
		this.status$.next(XRStatus.Ended);
	}

	toggleVR(event) {
		if (this.currentSession === null) {
			// WebXR's requestReferenceSpace only works if the corresponding feature
			// was requested at session creation time. For simplicity, just ask for
			// the interesting ones as optional features, but be aware that the
			// requestReferenceSpace call will fail if it turns out to be unavailable.
			// ('local' is always available for immersive sessions and doesn't need to
			// be requested separately.)
			const sessionInit = { optionalFeatures: ['local-floor', 'bounded-floor'] };
			navigator.xr.requestSession('immersive-vr', sessionInit).then(this.onSessionStarted);
		} else {
			this.currentSession.end();
		}
	}

	isDisabled() {
		const status = this.status$.getValue();
		switch (status) {
			case XRStatus.Waiting:
			case XRStatus.Disabled:
			case XRStatus.NeedsHttps:
			case XRStatus.Unavailable:
				return true;
			default:
				return false;
		}
	}

	getLabel() {
		let label;
		const status = this.status$.getValue();
		switch (status) {
			case XRStatus.Waiting:
				label = 'Waiting VR';
				break;
			case XRStatus.Enabled:
			case XRStatus.Ended:
				label = 'Enter VR';
				break;
			case XRStatus.Started:
				label = 'Exit VR';
				break;
			case XRStatus.Disabled:
				label = 'VR Disabled';
				break;
			case XRStatus.NeedsHttps:
				label = 'VR Needs Https';
				break;
			case XRStatus.Unavailable:
				label = 'VR Unavailable';
				break;
		}
		return label;
	}

}
