import { Component, getContext } from 'rxcomp';
import UserService from '../user/user.service';

export default class ClubComponent extends Component {

	onInit() {
		const { node } = getContext(this);
		this.views = {
			SIGN_IN: 1,
			SIGN_UP: 2,
			FORGOTTEN: 3,
		};
		this.view = node.hasAttribute('view') ? parseInt(node.getAttribute('view')) : this.views.SIGN_IN;
	}

	onForgot(event) {
		// console.log('ClubComponent.onForgot');
		this.view = this.views.FORGOTTEN;
		this.pushChanges();
	}

	onLogin(event) {
		// console.log('ClubComponent.onLogin');
		this.view = this.views.SIGN_IN;
		this.pushChanges();
	}

	onRegister(event) {
		// console.log('ClubComponent.onRegister');
		this.view = this.views.SIGN_UP;
		this.pushChanges();
	}

	onSignIn(user) {
		console.log('ClubComponent.onSignIn', user);
		UserService.setUser(user);
		window.location.href = this.club;
		// nav to profile
	}

	onSignUp(user) {
		console.log('ClubComponent.onSignUp', user);
		UserService.setUser(user);
		window.location.href = this.club;
		// nav to profile
	}

	onForgottenSent(email) {
		/*
		console.log('ClubComponent.onForgottenSent', email);
		this.view = this.views.SIGN_IN;
		this.pushChanges();
		*/
	}
}

ClubComponent.meta = {
	selector: '[club]',
	inputs: ['club']
};
