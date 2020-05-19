import { Component } from 'rxcomp';
import { FormControl, FormGroup, FormValidator, Validators } from 'rxcomp-form';
import { takeUntil } from 'rxjs/operators';
import HttpService from '../http/http.service';

export default class ClubPasswordRecoveryComponent extends Component {

	onInit() {
		const form = new FormGroup({
			email: new FormControl(null, [Validators.RequiredValidator(), Validators.EmailValidator()]),
			newPassword: new FormControl(null, [Validators.RequiredValidator()]),
			newPasswordConfirm: new FormControl(null, [Validators.RequiredValidator(), this.MatchValidator('newPassword')]),
			tokenEncoded: window.tokenEncoded,
			checkRequest: window.antiforgery,
			checkField: ''
		});

		const controls = form.controls;
		this.controls = controls;

		form.changes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe((changes) => {
			// console.log('ClubPasswordComponent.form.changes$', changes, form.valid);
			this.pushChanges();
		});

		this.form = form;
		this.error = null;
		this.success = false;
	}

	test() {
		// user 'rpiemonti@websolute.it'
		this.form.patch({
			email: 'jhonappleseed@gmail.com',
			newPassword: 'npword',
			newPasswordConfirm: 'npword',
			tokenEncoded: 'TESTLOCAL',
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
		// console.log('ClubPasswordComponent.onSubmit', 'form.valid', valid);
		if (this.form.valid) {
			// console.log('ClubPasswordComponent.onSubmit', this.form.value);
			this.form.submitted = true;
			HttpService.post$('/api/users/resetpassword', this.form.value)
				.subscribe(response => {
					console.log('ClubPasswordRecoveryComponent.onSubmit', response);
					this.success = true;
					this.form.reset();
					// this.pushChanges();
					// this.update.next(response);
				}, error => {
					console.log('ClubPasswordRecoveryComponent.error', error);
					this.error = error;
					this.pushChanges();
				});
		} else {
			this.form.touched = true;
		}
	}

}

ClubPasswordRecoveryComponent.meta = {
	selector: '[club-password-recovery]',
	//outputs: ['update'],
};
