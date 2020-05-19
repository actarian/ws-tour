import { Component, getContext } from 'rxcomp';
import { BASE_HREF } from '../const';
import ModalOutletComponent from '../modal/modal-outlet.component';
import ModalService from '../modal/modal.service';

export default class TryInARComponent extends Component {

	onInit() {
		super.onInit();
		const { parentInstance, node } = getContext(this);
		if (parentInstance instanceof ModalOutletComponent) {
			const data = this.data = parentInstance.modal.data;
			if (data && data.ar) {
				const url = `${window.location.protocol}//${window.location.host.replace('127.0.0.1','192.168.1.2')}/${BASE_HREF}${data.ar}`;
				console.log(url);
				const qrcode = new QRious({
					element: node.querySelector('.qrcode'),
					value: url,
					size: 256
				});
			}
		}
	}

	close() {
		ModalService.reject();
	}

}

TryInARComponent.meta = {
	selector: '[try-in-ar]'
};
