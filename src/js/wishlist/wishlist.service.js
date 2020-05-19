import { BehaviorSubject } from "rxjs";

export default class WishlistService {}

WishlistService.count$ = new BehaviorSubject(0);
WishlistService.events$ = new BehaviorSubject([]);
