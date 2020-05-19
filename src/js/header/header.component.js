import { Component } from 'rxcomp';
import { of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import CssService from '../css/css.service';
import UserService from '../user/user.service';

export default class HeaderComponent extends Component {

	onInit() {
		this.menu = null;
		this.submenu = null;
		this.user = null;
		UserService.user$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(user => {
			this.user = user;
			this.pushChanges();
		});
		UserService.me$().pipe(
			catchError(() => of (null)),
			takeUntil(this.unsubscribe$)
		).subscribe(user => {
			console.log('user', user);
		});
		CssService.height$().pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(height => {
			// console.log('HeaderComponent.height$', height);
		});
	}

	toggleMenu($event) {
		this.menu = this.menu !== $event ? $event : null;
		// console.log('toggleMenu', this.menu);
		const body = document.querySelector('body');
		this.menu ? body.classList.add('fixed') : body.classList.remove('fixed');
		this.submenu = null;
		this.pushChanges();
	}

	onDropped(id) {
		// console.log('HeaderComponent.onDropped', id);
		this.submenu = id;
		this.pushChanges();
	}

}

HeaderComponent.meta = {
	selector: 'header',
};
