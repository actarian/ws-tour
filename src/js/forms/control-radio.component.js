import ControlComponent from './control.component';

export default class ControlRadioComponent extends ControlComponent {

	onInit() {
		this.label = 'label';
	}

}

ControlRadioComponent.meta = {
	selector: '[control-radio]',
	inputs: ['control', 'label'],
	template: /* html */ `
		<div class="group--form--radio" [class]="{ required: control.validators.length }">
			<label>
				<input type="radio" class="control--radio" [formControl]="control" [value]="true"/>
				<span [innerHTML]="label"></span>
			</label>
			<span class="required__badge">required</span>
		</div>
		<errors-component [control]="control"></errors-component>
	`
};
