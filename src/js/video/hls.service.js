import { fromEventPattern, of , throwError } from "rxjs";
import { map, switchMap } from "rxjs/operators";

export const HlsQuality = {
	Min: 1,
	Max: 2,
};

export default class HlsService {

	constructor(node, options) {
		this.options = options || {};
		this.node = node;
		this.hls = new Hls();
	}

	attach$() {
		if (this.attached_) {
			return of(this.hls);
		} else {
			const hls = this.hls;
			this.hls.attachMedia(this.node);
			const handler = () => {
				this.attached_ = true;
				return hls;
			};
			return fromEventPattern(
				hls.on(Hls.Events.MEDIA_ATTACHED, handler),
				hls.off(Hls.Events.MEDIA_ATTACHED, handler),
			);
		}
	}

	load$(src) {
		return this.attach$().pipe(
			switchMap(hls => {
				src = src || this.options.src;
				if (!src) {
					return throwError('src not defined');
				}
				hls.loadSource(src);
				const handler = (event, data) => {
					return data;
				};
				return fromEventPattern(
					hls.on(Hls.Events.MANIFEST_PARSED, handler),
					hls.off(Hls.Events.MANIFEST_PARSED, handler),
				);
			})
		);
	}

	play$(src) {
		const hls = this.hls;
		return this.load$(src).pipe(
			switchMap(data => {
				console.log('HlsService.data.levels', data.levels);
				switch (this.options.quality) {
					case HlsQuality.Min:
						hls.loadLevel = 0;
						break;
					case HlsQuality.Max:
						hls.loadLevel = data.levels.length - 1;
						break;
				}
				return from(this.node.play());
			})
		);
	}

	capture$(src) {
		return this.play$(src).pipe(
			map(success => {
				const node = this.node;
				const stream = node.captureStream();
				const video = stream.getVideoTracks()[0];
				const audio = stream.getAudioTracks()[0];
				return { video, audio };
			})
		);
	}

}
