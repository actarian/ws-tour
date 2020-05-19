import { Directive, getContext } from 'rxcomp';
import { fromEvent } from 'rxjs';
import { shareReplay, takeUntil, tap } from 'rxjs/operators';

export default class ScrollToDirective extends Directive {

	onInit() {
		this.initialFocus = false;
		const { module, node } = getContext(this);
		const expression = this.expression = node.getAttribute(`(scrollTo)`);
		this.outputFunction = module.makeFunction(expression, ['$event']);
		this.scrollTo$().pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(() => {});
	}

	scrollTo$() {
		const { module, node, parentInstance } = getContext(this);
		return fromEvent(node, 'click').pipe(
			tap(event => {
				const result = module.resolve(this.outputFunction, parentInstance, event);
				if (typeof result === 'string') {
					const target = document.querySelector(result);
					if (target) {
						const from = this.currentTop();
						const to = from + target.getBoundingClientRect().top - 50;
						const o = { pow: 0 };
						const html = document.querySelector('html');
						gsap.set(html, {
							'scroll-behavior': 'auto'
						});
						gsap.to(o, Math.abs((to - from)) / 2000, {
							pow: 1,
							ease: Quad.easeOut,
							overwrite: 'all',
							onUpdate: () => {
								window.scrollTo(0, from + (to - from) * o.pow);
							},
							onComplete: () => {
								gsap.set(html, {
									'scroll-behavior': 'smooth'
								});
							}
						});
					}
				}
			}),
			shareReplay(1)
		);
	}

	currentTop() {
		// Firefox, Chrome, Opera, Safari
		if (self.pageYOffset) return self.pageYOffset;
		// Internet Explorer 6 - standards mode
		if (document.documentElement && document.documentElement.scrollTop)
			return document.documentElement.scrollTop;
		// Internet Explorer 6, 7 and 8
		if (document.body.scrollTop) return document.body.scrollTop;
		return 0;
	}

}

ScrollToDirective.meta = {
	selector: `[(scrollTo)]`
};
