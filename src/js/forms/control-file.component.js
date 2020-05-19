import ControlComponent from './control.component';

export default class ControlFileComponent extends ControlComponent {

	onInit() {
		this.label = 'label';
		this.labels = window.labels || {};
		this.file = null;
		this.required = false;
		this.onReaderComplete = this.onReaderComplete.bind(this);
	}

	onInputDidChange(event) {
		const input = event.target;
		const file = input.files[0];
		this.file = {
			name: file.name,
			lastModified: file.lastModified,
			lastModifiedDate: file.lastModifiedDate,
			size: file.size,
			type: file.type,
		}
		const reader = new FileReader();
		reader.addEventListener('load', this.onReaderComplete);
		reader.readAsDataURL(file);
		// reader.readAsArrayBuffer() // Starts reading the contents of the specified Blob, once finished, the result attribute contains an ArrayBuffer representing the file's data.
		// reader.readAsBinaryString() // Starts reading the contents of the specified Blob, once finished, the result attribute contains the raw binary data from the file as a string.
		// reader.readAsDataURL() // Starts reading the contents of the specified Blob, once finished, the result attribute contains a data: URL representing the file's data.
		// reader.readAsText() // Starts reading the contents of the specified Blob, once finished, the result attribute contains the contents of the file as a text string. An optional encoding name can be specified.
	}

	onReaderComplete(event) {
		const content = event.target.result;
		this.file.content = content;
		this.control.value = this.file;
		// console.log('ControlFileComponent.onReaderComplete', this.file);
		// image/*,
	}

}

ControlFileComponent.meta = {
	selector: '[control-file]',
	inputs: ['control', 'label'],
	template: /* html */ `
		<div class="group--form--file" [class]="{ required: control.validators.length }">
			<label for="file" [innerHTML]="label"></label>
			<span class="control--select" [innerHTML]="file?.name || labels.select_file"></span>
			<svg class="icon icon--upload"><use xlink:href="#upload"></use></svg>
			<span class="required__badge">required</span>
			<input name="file" type="file" accept=".pdf,.doc,.docx,*.txt" class="control--file" (change)="onInputDidChange($event)" />
		</div>
		<errors-component [control]="control"></errors-component>
	`
};
