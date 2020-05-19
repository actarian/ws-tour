import { merge } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import LocationService from '../location/location.service';
import FilterItem from './filter-item';

export default class FilterService {

	constructor(options, initialParams, callback) {
		const filters = {};
		if (options) {
			Object.keys(options).forEach(key => {
				const filter = new FilterItem(options[key]);
				if (typeof callback === 'function') {
					callback(key, filter);
				}
				filters[key] = filter;
			});
		}
		this.filters = filters;
		this.deserialize(this.filters, initialParams);
	}

	getParamsCount(params) {
		if (params) {
			const paramsCount = Object.keys(params).reduce((p, c, i) => {
				const values = params[c];
				return p + (values ? values.length : 0);
			}, 0);
			return paramsCount;
		} else {
			return 0;
		}
	}

	deserialize(filters, initialParams) {
		let params;
		if (initialParams && this.getParamsCount(initialParams)) {
			params = initialParams;
		}
		const locationParams = LocationService.deserialize('filters');
		if (locationParams && this.getParamsCount(locationParams)) {
			params = locationParams;
		}
		if (params) {
			Object.keys(filters).forEach(key => {
				filters[key].values = params[key] || [];
			});
		}
		return filters;
	}

	serialize(filters) {
		let params = {};
		let any = false;
		Object.keys(filters).forEach(x => {
			const filter = filters[x];
			if (filter.value !== null) {
				params[x] = filter.values;
				any = true;
			}
		});
		if (!any) {
			params = null;
		}
		// console.log('ReferenceCtrl.serialize', params);
		LocationService.serialize('filters', params);
		return params;
	}

	items$(items) {
		const filters = this.filters;
		const changes = Object.keys(filters).map(key => filters[key].change$);
		return merge(...changes).pipe(
			// tap(() => console.log(filters)),
			tap(() => this.serialize(filters)),
			map(() => this.filterItems(items)),
			tap(() => this.updateFilterStates(filters, items))
		);
	}

	filterItems(items, skipFilter) {
		const filters = Object.keys(this.filters).map((x) => this.filters[x]).filter(x => x.value !== null);
		items = items.filter(item => {
			let has = true;
			filters.forEach(filter => {
				if (filter !== skipFilter) {
					has = has && filter.match(item);
				}
			});
			return has;
		});
		return items;
	}

	updateFilterStates(filters, items) {
		Object.keys(filters).forEach(x => {
			const filter = filters[x];
			const filteredItems = this.filterItems(items, filter);
			filter.options.forEach(option => {
				let count = 0;
				if (option.value) {
					let i = 0;
					while (i < filteredItems.length) {
						const item = filteredItems[i];
						if (filter.filter(item, option.value)) {
							count++;
						}
						i++;
					}
				} else {
					count = filteredItems.length;
				}
				option.count = count;
				option.disabled = count === 0;
			});
		});
	}

}
