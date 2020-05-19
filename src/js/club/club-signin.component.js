import { Component } from 'rxcomp';
import { FormControl, FormGroup, Validators } from 'rxcomp-form';
import { takeUntil } from 'rxjs/operators';
import UserService from '../user/user.service';

export default class ClubSigninComponent extends Component {

	onInit() {
		const data = window.data || {
			interests: []
		};

		const form = new FormGroup({
			email: new FormControl(null, [Validators.RequiredValidator(), Validators.EmailValidator()]),
			password: new FormControl(null, Validators.RequiredValidator()),
			checkRequest: window.antiforgery,
			checkField: ''
		});

		const controls = form.controls;
		this.controls = controls;

		form.changes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe((changes) => {
			// console.log('ClubSigninComponent.form.changes$', changes, form.valid);
			this.pushChanges();
		});

		this.form = form;
		this.error = null;
		this.success = false;
	}

	test() {
		this.form.patch({
			email: 'jhonappleseed@gmail.com',
			password: 'password',
			checkRequest: window.antiforgery,
			checkField: ''
		});
	}

	reset() {
		this.form.reset();
	}

	onSubmit() {
		// console.log('ClubSigninComponent.onSubmit', 'form.valid', valid);
		if (this.form.valid) {
			// console.log('ClubSigninComponent.onSubmit', this.form.value);
			this.form.submitted = true;
			// HttpService.post$('/api/users/Login', this.form.value)
			UserService.login$(this.form.value)
				.subscribe(response => {
					console.log('ClubSigninComponent.onSubmit', response);
					this.success = true;
					// this.form.reset();
					this.pushChanges();
					this.signIn.next(typeof response === 'string' ? { status: response } : response);
				}, error => {
					console.log('ClubSigninComponent.error', error);
					this.error = error;
					this.pushChanges();
				});
		} else {
			this.form.touched = true;
		}
	}

	onForgot() {
		this.forgot.next();
	}

	onRegister() {
		this.register.next();
	}

}

ClubSigninComponent.meta = {
	selector: '[club-signin]',
	outputs: ['signIn', 'forgot', 'register'],
};
