import { Component } from 'rxcomp';
import { FormControl, FormGroup, Validators } from 'rxcomp-form';
import { takeUntil } from 'rxjs/operators';
import UserService from '../user/user.service';

export default class ClubForgotComponent extends Component {

	onInit() {
		const form = new FormGroup({
			email: new FormControl(null, [Validators.RequiredValidator(), Validators.EmailValidator()]),
			checkRequest: window.antiforgery,
			checkField: ''
		});

		const controls = form.controls;
		this.controls = controls;

		form.changes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe((changes) => {
			// console.log('ClubForgotComponent.form.changes$', changes, form.valid);
			this.pushChanges();
		});

		this.form = form;
		this.error = null;
		this.success = false;
	}

	test() {
		this.form.patch({
			email: 'jhonappleseed@gmail.com',
			checkRequest: window.antiforgery,
			checkField: ''
		});
	}

	reset() {
		this.form.reset();
	}

	onSubmit() {
		// console.log('ClubForgotComponent.onSubmit', 'form.valid', valid);
		if (this.form.valid) {
			// console.log('ClubForgotComponent.onSubmit', this.form.value);
			this.form.submitted = true;
			UserService.retrieve$(this.form.value)
				.subscribe(response => {
					console.log('ClubForgotComponent.onSubmit', response);
					this.sent.next(true);
					this.success = true;
					// this.form.reset();
					this.pushChanges();
				}, error => {
					console.log('ClubForgotComponent.error', error);
					this.error = error;
					this.pushChanges();
				});
		} else {
			this.form.touched = true;
		}
	}

	onLogin() {
		this.login.next();
	}

	onRegister() {
		this.register.next();
	}

}

ClubForgotComponent.meta = {
	selector: '[club-forgot]',
	outputs: ['sent', 'login', 'register'],
};
