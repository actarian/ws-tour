import ControlComponent from './control.component';

export default class ErrorsComponent extends ControlComponent {

	onInit() {
		this.labels = window.labels || {};
	}

	getLabel(key, value) {
		const label = this.labels[`error_${key}`];
		return label;
	}

}

ErrorsComponent.meta = {
	selector: 'errors-component',
	inputs: ['control'],
	template: /* html */ `
	<div class="inner" [style]="{ display: control.invalid && control.touched ? 'block' : 'none' }">
		<div class="error" *for="let [key, value] of control.errors">
			<span [innerHTML]="getLabel(key, value)"></span>
			<!-- <span class="key" [innerHTML]="key"></span> <span class="value" [innerHTML]="value | json"></span> -->
		</div>
	</div>
	`
};
