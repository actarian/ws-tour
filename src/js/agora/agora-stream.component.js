import { Component, getContext } from 'rxcomp';
import { takeUntil } from 'rxjs/operators';
import AgoraService, { AgoraMuteAudioEvent, AgoraMuteVideoEvent, AgoraUnmuteAudioEvent, AgoraUnmuteVideoEvent } from './agora.service';

export default class AgoraStreamComponent extends Component {

	set videoMuted(videoMuted) {
		if (this.videoMuted_ !== videoMuted) {
			this.videoMuted_ = videoMuted;
			const { node } = getContext(this);
			videoMuted ? node.classList.add('video--muted') : node.classList.remove('video--muted');
		}
	}

	set audioMuted(audioMuted) {
		if (this.audioMuted_ !== audioMuted) {
			this.audioMuted_ = audioMuted;
			const { node } = getContext(this);
			audioMuted ? node.classList.add('audio--muted') : node.classList.remove('audio--muted');
		}
	}

	get streamId() {
		return this.streamId_;
	}

	set streamId(streamId) {
		this.streamId_ = streamId;
	}

	set stream(stream) {
		if (this.stream_ !== stream) {
			const { node } = getContext(this);
			const player = this.player = node.querySelector('.agora-stream__player');
			player.textContent = '';
			this.shouldUseResumeGesture = false;
			/*
			// !!! stop in AgoraService
			if (this.stream_) {
				this.stream_.stop();
			}
			*/
			this.stream_ = stream;
			if (stream) {
				this.videoMuted = stream.userMuteVideo;
				this.audioMuted = stream.userMuteAudio;
			}
			const id = stream ? stream.getId() : null;
			this.streamId = id;
			if (id) {
				const name = `agora-stream-${id}`;
				player.setAttribute('id', name);
				stream.play(name, { fit: 'cover' }, (error) => {
					if (error && error.status !== 'aborted') {
						// The playback fails, probably due to browser policy. You can resume the playback by user gesture.
						this.shouldUseResumeGesture = true;
						this.pushChanges();
					}
				}); // stream will be played in the element with the ID agora_remote
			} else {
				player.removeAttribute('id');
			}
		}
	}

	onInit() {
		this.videoMuted = false;
		this.audioMuted = false;
		this.shouldUseResumeGesture = false;
		const agora = this.agora = AgoraService.getSingleton();
		agora.events$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(event => {
			console.log('AgoraStreamEvent', event, this.streamId);
			if (this.streamId && event.streamId === this.streamId) {
				if (event instanceof AgoraMuteVideoEvent) {
					this.videoMuted = true;
				}
				if (event instanceof AgoraUnmuteVideoEvent) {
					this.videoMuted = false;
				}
				if (event instanceof AgoraMuteAudioEvent) {
					this.audioMuted = true;
				}
				if (event instanceof AgoraUnmuteAudioEvent) {
					this.audioMuted = false;
				}
			}
		})
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	// onDestroy() {}

}

AgoraStreamComponent.meta = {
	selector: '[agora-stream]',
	inputs: ['stream'],
};
