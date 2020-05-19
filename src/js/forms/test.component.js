import { Component } from 'rxcomp';
import { ENV } from '../environment/environment';

export default class TestComponent extends Component {

	onInit() {
		this.env = ENV;
	}

	onTest(event) {
		this.test.next(event);
	}

	onReset(event) {
		this.reset.next(event);
	}

}

TestComponent.meta = {
	selector: 'test-component',
	inputs: ['form'],
	outputs: ['test', 'reset'],
	template: /* html */ `
	<div class="group--form--results" *if="env.DEVELOPMENT">
		<code [innerHTML]="form.value | json"></code>
		<button type="button" class="btn--link" (click)="onTest($event)"><span>test</span></button>
		<button type="button" class="btn--link" (click)="onReset($event)"><span>reset</span></button>
	</div>
	`
};
