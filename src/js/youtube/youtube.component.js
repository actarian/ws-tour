import { Component, getContext } from 'rxcomp';
import { BehaviorSubject, interval, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import SwiperDirective from '../swiper/swiper.directive';

export default class YoutubeComponent extends Component {

	get playing() {
		return this.playing_;
	}

	set playing(playing) {
		if (this.playing_ !== playing) {
			this.playing_ = playing;
			this.pushChanges();
		}
	}

	get cover() {
		return this.youtubeId ? `//i.ytimg.com/vi/${this.youtubeId}/maxresdefault.jpg` : '';
	}

	onInit() {
		this.item = {};
		const { node, parentInstance } = getContext(this);
		node.classList.add('youtube');
		if (YoutubeComponent.MOBILE) {
			node.classList.add('mobile');
		}
		this.progress = node.querySelector('.icon--play-progress path');
		this.onPlayerReady = this.onPlayerReady.bind(this);
		this.onPlayerStateChange = this.onPlayerStateChange.bind(this);
		this.onPlayerError = this.onPlayerError.bind(this);
		this.id$ = new Subject().pipe(distinctUntilChanged());
		if (parentInstance instanceof SwiperDirective) {
			parentInstance.events$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(event => this.pause());
		}
		// this.addListeners();
	}

	onChanges(changes) {
		const id = this.youtubeId;
		// console.log('YoutubeComponent.onChanges', id);
		this.id$.next(id);
	}

	initPlayer() {
		// console.log('VideoComponent.initPlayer');
		this.player$().pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(player => {
			console.log('YoutubeComponent.player$', player);
		});
		this.interval$().pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(() => {});
		this.id$.next(this.youtubeId);
	}

	player$() {
		const { node } = getContext(this);
		const video = node.querySelector('.video');
		return this.id$.pipe(
			switchMap(id => {
				// console.log('YoutubeComponent.videoId', id);
				return YoutubeComponent.once$().pipe(
					map(youtube => {
						// console.log('YoutubeComponent.once$', youtube);
						this.destroyPlayer();
						this.player = new youtube.Player(video, {
							width: node.offsetWidth,
							height: node.offsetHeight,
							videoId: id,
							playerVars: {
								autoplay: 1,
								controls: 1, // YoutubeComponent.MOBILE ? 1 : 0,
								disablekb: 1,
								enablejsapi: 1,
								fs: 0,
								loop: 1,
								modestbranding: 1,
								playsinline: 1,
								rel: 0,
								showinfo: 0,
								iv_load_policy: 3,
								listType: 'user_uploads',
								// origin: 'https://log6i.csb.app/'
							},
							events: {
								onReady: this.onPlayerReady,
								onStateChange: this.onPlayerStateChange,
								onPlayerError: this.onPlayerError
							}
						});
						return this.player;
					})
				);
			})
		);
	}

	onPlayerReady(event) {
		// console.log('YoutubeComponent.onPlayerReady', event);
		event.target.mute();
		event.target.playVideo();
	}

	onPlayerStateChange(event) {
		// console.log('YoutubeComponent.onPlayerStateChange', event.data);
		if (event.data === 1) {
			this.playing = true;
		} else {
			this.playing = false;
		}
	}

	onPlayerError(event) {
		console.log('YoutubeComponent.onPlayerError', event);
	}

	destroyPlayer() {
		if (this.player) {
			this.player.destroy();
		}
	}

	onDestroy() {
		this.destroyPlayer();
	}

	interval$() {
		return interval(500).pipe(
			filter(() => this.playing && this.player),
			tap(() => {
				this.progress.style.strokeDashoffset =
					this.player.getCurrentTime() / this.player.getDuration();
			})
		);
	}

	togglePlay() {
		// console.log('VideoComponent.togglePlay');
		if (this.playing) {
			this.pause();
		} else {
			this.play();
		}
	}

	play() {
		// console.log('VideoComponent.play');
		if (!this.player) {
			this.initPlayer();
		} else {
			this.player.playVideo();
		}
	}

	pause() {
		if (!this.player) {
			return;
		}
		this.player.stopVideo();
	}

	static once$() {
		if (this.youtube$) {
			return this.youtube$;
		} else {
			this.youtube$ = new BehaviorSubject(null).pipe(
				filter(youtube => youtube !== null)
			);
			window.onYouTubeIframeAPIReady = this.onYouTubeIframeAPIReady_.bind(this);
			const script = document.createElement('script');
			const scripts = document.querySelectorAll('script');
			const last = scripts[scripts.length - 1];
			last.parentNode.insertBefore(script, last);
			script.src = '//www.youtube.com/iframe_api';
			return this.youtube$;
		}
	}

	static onYouTubeIframeAPIReady_() {
		// console.log('onYouTubeIframeAPIReady');
		this.youtube$.next(window.YT);
	}

	static mobilecheck() {
		let check = false;
		(function(a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
		return check;
	}

	static mobileAndTabletcheck() {
		let check = false;
		(function(a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
		return check;
	}

}

YoutubeComponent.MOBILE = YoutubeComponent.mobileAndTabletcheck();

YoutubeComponent.meta = {
	selector: '[youtube]',
	inputs: ['youtubeId', 'title']
};
