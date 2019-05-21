import { Observable } from "./Observable";

export interface Subject<a> extends Observable<a> {
  // static of<A0>(a: A0): Subject<A0>
  distinctUntilChanged(compare?: (x: a, y: a) => boolean): Observable<a>
  next: (a: a) => void
  last(): a;
}

export interface CreateSubject<a> { <a>(init: a): Subject<a> }
