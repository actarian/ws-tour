import ControlComponent from './control.component';

export default class ControlPasswordComponent extends ControlComponent {

	onInit() {
		this.label = 'label';
		this.required = false;
	}

}

ControlPasswordComponent.meta = {
	selector: '[control-password]',
	inputs: ['control', 'label'],
	template: /* html */ `
		<div class="group--form" [class]="{ required: control.validators.length }">
			<label [innerHTML]="label"></label>
			<input type="password" class="control--text" [formControl]="control" [placeholder]="label" />
			<span class="required__badge">required</span>
		</div>
		<errors-component [control]="control"></errors-component>
	`
};
