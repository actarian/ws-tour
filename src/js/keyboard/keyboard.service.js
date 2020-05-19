import { fromEvent } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';

export default class KeyboardService {

	static keydown$() {
		return fromEvent(window, 'keydown').pipe(
			shareReplay(1)
		);
	}

	static keyup$() {
		return fromEvent(window, 'keyup').pipe(
			shareReplay(1)
		);
	}

	static typing$() {
		let typing = '',
			to;
		return this.key$().pipe(
			map(key => {
				if (to) {
					clearTimeout(to);
				}
				typing += key;
				to = setTimeout(() => {
					typing = '';
				}, 1500);
				return typing;
			}),
			shareReplay(1)
		)
	}

	static key$() {
		const regexp = /\w/;
		return this.keydown$().pipe(
			filter(event => event.key && event.key.match(regexp)),
			map(event => event.key),
			shareReplay(1)
		)
	}

}
