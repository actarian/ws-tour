import { getContext } from 'rxcomp';
import ModalOutletComponent from '../modal/modal-outlet.component';
import ModalService from '../modal/modal.service';
import ClubComponent from './club.component';

export default class ClubModalComponent extends ClubComponent {

	onInit() {
		super.onInit();
		const { parentInstance } = getContext(this);
		if (parentInstance instanceof ModalOutletComponent) {
			const data = parentInstance.modal.data;
			this.view = data.view;
			// console.log('ClubModalComponent.onInit', data);
		}
	}

	onSignIn(user) {
		// console.log('ClubModalComponent.onSignIn', user);
		ModalService.resolve(user);
	}

	onSignUp(user) {
		// console.log('ClubModalComponent.onSignUp', user);
		ModalService.resolve(user);
	}

	/*
	onDestroy() {
		// console.log('ClubModalComponent.onDestroy');
	}
	*/

	close() {
		ModalService.reject();
	}

}

ClubModalComponent.meta = {
	selector: '[club-modal]'
};
