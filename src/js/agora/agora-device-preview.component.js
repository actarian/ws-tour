import { Component, getContext } from 'rxcomp';

export default class AgoraDevicePreviewComponent extends Component {

	get video() {
		return this.video_;
	}

	set video(video) {
		if (this.video_ !== video) {
			this.video_ = video;
			this.initStream();
		}
	}

	get audio() {
		return this.audio_;
	}

	set audio(audio) {
		if (this.audio_ !== audio) {
			this.audio_ = audio;
			this.initStream();
		}
	}

	onInit() {
		this.onLoadedMetadata = this.onLoadedMetadata.bind(this);
		const { node } = getContext(this);
		const preview = this.preview = node.querySelector('video');
		preview.addEventListener('loadedmetadata', this.onLoadedMetadata);
	}

	onDestroy() {
		const preview = this.preview;
		preview.removeEventListener('loadedmetadata', this.onLoadedMetadata);
	}

	initStream() {
		const preview = this.preview;
		if (!this.preview) {
			return;
		}
		if (this.video_ || this.audio_) {
			if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
				navigator.mediaDevices.getUserMedia({
					video: this.video_ ? { deviceId: this.video_ } : false,
					audio: this.audio_ ? { deviceId: this.audio_ } : false,
				}).then((stream) => {
					if ('srcObject' in preview) {
						preview.srcObject = stream;
					} else {
						preview.src = window.URL.createObjectURL(stream);
					}
					this.stream.next(stream);
				}).catch((error) => {
					console.log('AgoraDevicePreviewComponent.initStream.error', error.name, error.message);
					this.stream.next(null);
				});
			}
		} else {
			if ('srcObject' in preview) {
				preview.srcObject = null;
			} else {
				preview.src = null;
			}
			this.stream.next(null);
		}
	}

	onLoadedMetadata(event) {
		this.preview.play();
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	// onDestroy() {}

}

AgoraDevicePreviewComponent.meta = {
	selector: '[agora-device-preview]',
	outputs: ['stream'],
	inputs: ['video', 'audio']
};
