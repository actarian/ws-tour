import { Directive, getContext } from 'rxcomp';

export default class HlsDirective extends Directive {

	set hls(hls) {
		if (this.hls_ !== hls) {
			this.hls_ = hls;
			this.play(hls);
		}
	}

	get hls() {
		return this.hls_;
	}

	play(src) {
		const { node } = getContext(this);
		if (Hls.isSupported()) {
			var hls = new Hls();
			// bind them together
			hls.attachMedia(node);
			hls.on(Hls.Events.MEDIA_ATTACHED, () => {
				hls.loadSource(src);
				hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
					console.log('HlsDirective', data.levels);
					node.play();
				});
			});
		}
	}

}

HlsDirective.meta = {
	selector: '[[hls]]',
	inputs: ['hls'],
};
