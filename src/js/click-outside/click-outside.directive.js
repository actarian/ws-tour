import { Directive, getContext } from 'rxcomp';
import { fromEvent } from 'rxjs';
import { filter, shareReplay, takeUntil } from 'rxjs/operators';

export default class ClickOutsideDirective extends Directive {

	onInit() {
		this.initialFocus = false;
		const { module, node, parentInstance, selector } = getContext(this);
		const event$ = this.event$ = fromEvent(document, 'click').pipe(
			filter(event => {
				const target = event.target;
				// console.log('ClickOutsideDirective.onClick', this.element.nativeElement, target, this.element.nativeElement.contains(target));
				// const documentContained: boolean = Boolean(document.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_CONTAINED_BY);
				// console.log(target, documentContained);
				const clickedInside = node.contains(target) || !document.contains(target);
				if (!clickedInside) {
					if (this.initialFocus) {
						this.initialFocus = false;
						return true;
					}
				} else {
					this.initialFocus = true;
				}
			}),
			shareReplay(1)
		);
		const expression = node.getAttribute(`(clickOutside)`);
		if (expression) {
			const outputFunction = module.makeFunction(expression, ['$event']);
			event$.pipe(
				takeUntil(this.unsubscribe$),
			).subscribe(event => {
				module.resolve(outputFunction, parentInstance, event);
			});
		} else {
			parentInstance.clickOutside$ = event$;
		}
	}

}

ClickOutsideDirective.meta = {
	selector: `[(clickOutside)]`,
};
