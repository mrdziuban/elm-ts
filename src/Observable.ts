export interface Observable<a> {
  map<b>(f: (a: a) => b): Observable<b>
  switchMap<b>(f: (a: a) => Observable<b>): Observable<b>
  mergeAll(): a
  share(): Observable<a>
  startWith(init: a): Observable<a>
}
