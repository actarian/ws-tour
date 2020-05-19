import { Component, getContext } from 'rxcomp';
import { takeUntil, tap } from 'rxjs/operators';
import AgoraService, { MessageType } from '../agora/agora.service';
import { DEBUG } from '../const';
import DragService, { DragDownEvent, DragMoveEvent, DragUpEvent } from '../drag/drag.service';

export default class SliderDirective extends Component {

	set items(items) {
		if (this.items_ !== items) {
			this.items_ = items;
			this.current = Math.min(this.current, items ? items.length - 1 : 0);
		}
	}

	get items() {
		return this.items_;
	}

	onInit() {
		const { node } = getContext(this);
		this.container = node;
		this.inner = node.querySelector('.slider-inner');
		this.current = 0;
		this.change.next(this.current);
		gsap.set(this.inner, {
			x: -100 * this.current + '%',
		});
		if (!DEBUG) {
			const agora = AgoraService.getSingleton();
			agora.message$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(message => {
				switch (message.type) {
					case MessageType.SlideChange:
						// console.log(message);
						if (agora.state.locked && message.index !== undefined && message.index) {
							this.navTo(message.index);
						}
						break;
					case MessageType.RequestControlAccepted:
						setTimeout(() => {
							agora.sendMessage({
								type: MessageType.SlideChange,
								index: this.current,
							});
						}, 500);
						break;
				}
			});
		}
		/*
		this.slider$().pipe(
			takeUntil(this.unsubscribe$),
		).subscribe(event => {
			// console.log('dragService', event);
		});
		*/
	}

	slider$() {
		let transformX = 0,
			transformY = 0,
			transformZ = 0,
			distanceX = 0,
			distanceY = 0,
			initialTransformX;
		return DragService.events$(this.inner).pipe(
			tap((event) => {
				if (event instanceof DragDownEvent) {
					const translation = this.getTranslation(this.inner, this.container);
					initialTransformX = translation.x;
				} else if (event instanceof DragMoveEvent) {
					this.container.classList.add('dragging');
					distanceX = event.distance.x;
					distanceY = event.distance.y;
					transformX = initialTransformX + event.distance.x;
					this.inner.style.transform = `translate3d(${transformX}px, ${transformY}px, ${transformZ}px)`;
				} else if (event instanceof DragUpEvent) {
					this.container.classList.remove('dragging');
					this.inner.style.transform = null;
					const width = this.container.offsetWidth;
					// const index = Math.max(0, Math.min(this.items.length, Math.round(transformX * -1 / width)));
					// console.log(index);
					// zone
					if (distanceX * -1 > width * 0.25 && this.hasNext()) {
						this.navTo(this.current + 1);
					} else if (distanceX * -1 < width * -0.25 && this.hasPrev()) {
						this.navTo(this.current - 1);
					} else {
						this.current = this.current;
						this.inner.style.transform = `translate3d(${-100 * this.current}%, 0, 0)`;
						// this.navTo(this.current);
					}
					// this.navTo(index);
				}
			})
		);
	}

	tweenTo(index, callback) {
		// console.log('tweenTo', index);
		const container = this.container;
		const inner = this.inner;
		const width = this.container.offsetWidth;
		gsap.to(inner, 0.50, {
			x: -100 * index + '%',
			delay: 0,
			ease: Power3.easeInOut,
			overwrite: 'all',
			onUpdate: () => {
				this.tween.next();
			},
			onComplete: () => {
				if (typeof callback === 'function') {
					callback();
				}
			}
		});
	}

	navTo(index) {
		if (this.current !== index) {
			this.tweenTo(index, () => {
				this.current = index;
				this.pushChanges();
				this.change.next(this.current);
				if (this.agora && this.agora.state.control) {
					this.agora.sendMessage({
						type: MessageType.SlideChange,
						index: index
					});
				}
			});
		}
	}

	hasPrev() {
		return this.current - 1 >= 0;
	}

	hasNext() {
		return this.current + 1 < this.items.length;
	}

	getTranslation(node, container) {
		let x = 0,
			y = 0,
			z = 0;
		const transform = node.style.transform;
		if (transform) {
			const coords = transform.split('(')[1].split(')')[0].split(',');
			x = parseFloat(coords[0]);
			y = parseFloat(coords[1]);
			z = parseFloat(coords[2]);
			x = coords[0].indexOf('%') !== -1 ? x *= container.offsetWidth * 0.01 : x;
			y = coords[1].indexOf('%') !== -1 ? y *= container.offsetHeight * 0.01 : y;
		}
		return { x, y, z };
	}

}

SliderDirective.meta = {
	selector: '[slider]',
	inputs: ['items'],
	outputs: ['change', 'tween'],
};
