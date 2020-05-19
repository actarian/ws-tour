import ControlComponent from './control.component';

export default class ControlEmailComponent extends ControlComponent {

	onInit() {
		this.label = 'label';
	}

}

ControlEmailComponent.meta = {
	selector: '[control-email]',
	inputs: ['control', 'label'],
	template: /* html */ `
		<div class="group--form" [class]="{ required: control.validators.length }">
			<label [innerHTML]="label"></label>
			<input type="text" class="control--text" [formControl]="control" [placeholder]="label" required email />
			<span class="required__badge">required</span>
		</div>
		<errors-component [control]="control"></errors-component>
	`
};
