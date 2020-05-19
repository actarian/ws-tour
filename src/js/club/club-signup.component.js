import { Component } from 'rxcomp';
import { FormControl, FormGroup, FormValidator, Validators } from 'rxcomp-form';
import { takeUntil } from 'rxjs/operators';
import UserService from '../user/user.service';

export default class ClubSignupComponent extends Component {

	onInit() {
		const data = window.data || {
			roles: [],
			countries: [],
			provinces: [],
		};

		const form = new FormGroup({
			firstName: new FormControl(null, Validators.RequiredValidator()),
			lastName: new FormControl(null, Validators.RequiredValidator()),
			company: new FormControl(null, Validators.RequiredValidator()),
			role: null,
			country: new FormControl(null, Validators.RequiredValidator()),
			province: new FormControl(null, Validators.RequiredValidator()),
			address: new FormControl(null, Validators.RequiredValidator()),
			zipCode: new FormControl(null, Validators.RequiredValidator()),
			city: new FormControl(null, Validators.RequiredValidator()),
			telephone: new FormControl(null, Validators.RequiredValidator()),
			fax: null,
			email: new FormControl(null, [Validators.RequiredValidator(), Validators.EmailValidator()]),
			/*
			// password autogenerata
			username: new FormControl(null, [Validators.RequiredValidator()]),
			password: new FormControl(null, [Validators.RequiredValidator()]),
			passwordConfirm: new FormControl(null, [Validators.RequiredValidator(), this.MatchValidator('password')]),
			*/
			privacy: new FormControl(null, Validators.RequiredTrueValidator()),
			newsletter: null,
			checkRequest: window.antiforgery,
			checkField: ''
		});

		const controls = form.controls;
		controls.role.options = data.roles;
		controls.country.options = data.countries;
		controls.province.options = [];
		this.controls = controls;

		form.changes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe((changes) => {
			// console.log('ClubSignupComponent.form.changes$', changes, form.valid);
			this.countryId = changes.country;
			this.pushChanges();
		});

		this.data = data;
		this.form = form;
		this.error = null;
		this.success = false;
	}

	set countryId(countryId) {
		if (this.countryId_ !== countryId) {
			// console.log('ClubSignupComponent.set countryId', countryId);
			this.countryId_ = countryId;
			const provinces = this.data.provinces.filter(province => {
				return String(province.idstato) === String(countryId);
			});
			this.controls.province.options = provinces;
			this.controls.province.hidden = provinces.length === 0;
			if (!provinces.find(x => x.id === this.controls.province.value)) {
				this.controls.province.value = null;
			}
		}
	}

	test() {
		this.form.patch({
			firstName: 'Jhon',
			lastName: 'Appleseed',
			company: 'Websolute',
			role: this.controls.role.options[0].id,
			country: this.controls.country.options[0].id,
			address: 'Strada della Campanara',
			zipCode: '15',
			city: 'Pesaro',
			telephone: '00390721411112',
			email: 'jhonappleseed@gmail.com',
			/*
			username: 'username',
			password: 'password',
			passwordConfirm: 'password',
			*/
			privacy: true,
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
		// console.log('ClubSignupComponent.onSubmit', 'form.valid', valid);
		if (this.form.valid) {
			// console.log('ClubSignupComponent.onSubmit', this.form.value);
			this.form.submitted = true;
			// HttpService.post$('/api/users/Register', this.form.value)
			UserService.register$(this.form.value)
				.subscribe(response => {
					console.log('ClubSignupComponent.onSubmit', response);
					this.success = true;
					dataLayer.push({
						'event': 'formSubmission',
						'form type': 'Registrazione Tiemme Club'
					});
					this.form.reset();
					// this.pushChanges();
					// this.signUp.next(response);
				}, error => {
					console.log('ClubSignupComponent.error', error);
					this.error = error;
					this.form.submitted = false;
					this.pushChanges();
				});
		} else {
			this.form.touched = true;
		}
	}

	onLogin() {
		this.login.next();
	}

}

ClubSignupComponent.meta = {
	selector: '[club-signup]',
	//outputs: ['signUp', 'login'],
};
