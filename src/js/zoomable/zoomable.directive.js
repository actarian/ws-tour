import { Directive, getContext } from 'rxcomp';
import { fromEvent } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

export default class ZoomableDirective extends Directive {

	onInit() {
		const { node } = getContext(this);
		node.classList.add('zoomable');
		const target = node.getAttribute('zoomable') !== '' ? node.querySelectorAll(node.getAttribute('zoomable')) : node;
		fromEvent(target, 'click').pipe(
			map($event => this.zoom = !this.zoom),
			takeUntil(this.unsubscribe$)
		).subscribe(zoom => console.log('ZoomableDirective', zoom));
	}

	get zoom() {
		return this.zoom_;
	}

	set zoom(zoom) {
		if (this.zoom_ !== zoom) {
			this.zoom_ = zoom;
			if (zoom) {
				this.zoomIn();
			} else {
				this.zoomOut();
			}
		}
	}

	zoomIn() {
		const { node } = getContext(this);
		this.rect = node.getBoundingClientRect();
		this.parentNode = node.parentNode;
		document.querySelector('body').appendChild(node);
		gsap.set(node, {
			left: this.rect.left,
			top: this.rect.top,
			width: this.rect.width,
			height: this.rect.height,
			position: 'fixed'
		});
		node.classList.add('zoom');
		gsap.set(node, { position: 'fixed' });
		const to = {
			left: 0,
			top: 0,
			width: window.innerWidth,
			height: window.innerHeight,
		};
		gsap.to(node, {
			...to,
			duration: 0.7,
			ease: Power3.easeInOut,
			onComplete: () => {
				node.classList.add('zoomed');
			}
		});
	}

	zoomOut() {
		const { node } = getContext(this);
		node.classList.remove('zoomed');
		const to = {
			left: this.rect.left,
			top: this.rect.top,
			width: this.rect.width,
			height: this.rect.height
		};
		gsap.to(node, {
			...to,
			duration: 0.7,
			ease: Power3.easeInOut,
			onComplete: () => {
				this.parentNode.appendChild(node);
				gsap.set(node, { clearProps: 'all' });
				node.classList.remove('zoom');
				this.parentNode = null;
				this.rect = null;
			}
		});
	}

}

ZoomableDirective.meta = {
	selector: '[zoomable]'
};
