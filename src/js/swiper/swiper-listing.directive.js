import SwiperDirective from './swiper.directive';

export default class SwiperListingDirective extends SwiperDirective {

	onInit() {
		this.options = {
			slidesPerView: 'auto',
			spaceBetween: 30,
			speed: 600,
			keyboardControl: true,
			mousewheelControl: false,
			pagination: {
				el: '.swiper-pagination',
				clickable: true,
			},
			keyboard: {
				enabled: true,
				onlyInViewport: true,
			},
		};
		this.init_();
		// console.log('SwiperListingDirective.onInit');
	}

}

SwiperListingDirective.meta = {
	selector: '[swiper-listing]'
};
