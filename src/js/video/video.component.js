import { Component, getContext } from 'rxcomp';
import { takeUntil } from 'rxjs/operators';
import GtmService from '../gtm/gtm.service';
import SwiperDirective from '../swiper/swiper.directive';

export default class VideoComponent extends Component {

	get playing() {
		return this.playing_;
	}

	set playing(playing) {
		if (this.playing_ !== playing) {
			this.playing_ = playing;
			this.pushChanges();
		}
	}

	onInit() {
		this.item = {};
		const { node, parentInstance } = getContext(this);
		node.classList.add('video');
		this.video = node.querySelector('video');
		this.progress = node.querySelector('.icon--play-progress path');
		if (parentInstance instanceof SwiperDirective) {
			parentInstance.events$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(event => this.pause());
		}
		this.addListeners();
	}

	onDestroy() {
		this.removeListeners();
	}

	addListeners() {
		const video = this.video;
		if (video) {
			this.onPlay = this.onPlay.bind(this);
			this.onPause = this.onPause.bind(this);
			this.onEnded = this.onEnded.bind(this);
			this.onTimeUpdate = this.onTimeUpdate.bind(this);
			video.addEventListener('play', this.onPlay);
			video.addEventListener('pause', this.onPause);
			video.addEventListener('ended', this.onEnded);
			video.addEventListener('timeupdate', this.onTimeUpdate);
		}
	}

	removeListeners() {
		const video = this.video;
		if (video) {
			video.removeEventListener('play', this.onPlay);
			video.removeEventListener('pause', this.onPause);
			video.removeEventListener('ended', this.onEnded);
			video.removeEventListener('timeupdate', this.onTimeUpdate);
		}
	}

	togglePlay() {
		// console.log('VideoComponent.togglePlay')
		const video = this.video;
		if (video) {
			if (video.paused) {
				this.play();
			} else {
				this.pause();
			}
		}
	}

	play() {
		const video = this.video;
		video.muted = false;
		video.play();
	}

	pause() {
		const video = this.video;
		video.muted = true;
		video.pause();
	}

	onPlay() {
		this.playing = true;
		GtmService.push({
			event: 'video play',
			video_name: this.video.src
		});
	}

	onPause() {
		this.playing = false;
	}

	onEnded() {
		this.playing = false;
	}

	onTimeUpdate() {
		this.progress.style.strokeDashoffset = this.video.currentTime / this.video.duration;
	}

}

VideoComponent.meta = {
	selector: '[video]',
	inputs: ['item'],
};
