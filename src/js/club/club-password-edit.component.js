import { Component } from 'rxcomp';
import { FormControl, FormGroup, FormValidator, Validators } from 'rxcomp-form';
import { takeUntil } from 'rxjs/operators';
import HttpService from '../http/http.service';

export default class ClubPasswordEditComponent extends Component {

	onInit() {

		const form = new FormGroup({
			newPassword: new FormControl(null, [Validators.RequiredValidator()]),
			newPasswordConfirm: new FormControl(null, [Validators.RequiredValidator(), this.MatchValidator('newPassword')]),
			checkRequest: window.antiforgery,
			checkField: ''
		});

		const controls = form.controls;
		this.controls = controls;

		form.changes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe((changes) => {
			// console.log('ClubPasswordEditComponent.form.changes$', changes, form.valid);
			this.pushChanges();
		});

		this.form = form;
		this.error = null;
		this.success = false;
	}

	test() {
		// user 'rpiemonti@websolute.it'
		this.form.patch({
			newPassword: 'npword',
			newPasswordConfirm: 'npword',
			checkRequest: window.antiforgery,
			checkField: ''
		});
	}

	MatchValidator(fieldName) {
		return new FormValidator((value) => {
			const field = this.form ? this.form.get(fieldName) : null;
			if (!value || !field) {
				return null;
			}
			return value !== field.value ? { match: { value: value, match: field.value } } : null;
		});
	}

	reset() {
		this.form.reset();
	}

	onSubmit() {
		// console.log('ClubPasswordEditComponent.onSubmit', 'form.valid', valid);
		if (this.form.valid) {
			 // Lo ri-imposto perché essendoci il campo password Chrome fa l'autocomplete dei dati, e riempie il campo checkField con l'username
			this.form.patch({
				checkRequest: window.antiforgery,
				checkField: ''
			});
			// console.log('ClubPasswordEditComponent.onSubmit', this.form.value);
			this.form.submitted = true;
			HttpService.post$('/api/users/editpassword', this.form.value)
				.subscribe(response => {
					console.log('ClubPasswordEditComponent.onSubmit', response);
					this.success = true;
					this.form.reset();
					// this.pushChanges();
					// this.update.next(response);
				}, error => {
					console.log('ClubPasswordEditComponent.error', error);
					this.error = error;
					this.pushChanges();
				});
		} else {
			this.form.touched = true;
		}
	}

}

ClubPasswordEditComponent.meta = {
	selector: '[club-password-edit]',
	//outputs: ['update'],
};
