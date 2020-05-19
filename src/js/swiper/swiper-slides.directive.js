import SwiperDirective from './swiper.directive';

export default class SwiperSlidesDirective extends SwiperDirective {

	onInit() {
		this.options = {
			slidesPerView: 3,
			spaceBetween: 0,
			centeredSlides: true,
			loop: false,
			loopAdditionalSlides: 100,
			speed: 600,
			/*
			autoplay: {
			    delay: 5000,
			},
			*/
			keyboardControl: true,
			mousewheelControl: false,
			onSlideClick: function(swiper) {
				// angular.element(swiper.clickedSlide).scope().clicked(angular.element(swiper.clickedSlide).scope().$index);
			},
			pagination: {
				el: '.swiper-pagination',
				clickable: true,
			},
			navigation: {
				nextEl: '.swiper-button-next',
				prevEl: '.swiper-button-prev',
			},
			keyboard: {
				enabled: true,
				onlyInViewport: true,
			},
		};
		this.init_();
	}

}

SwiperSlidesDirective.meta = {
	selector: '[swiper-slides]'
};
