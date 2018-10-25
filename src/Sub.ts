import { empty, merge, Observable } from 'rxjs'
import { map as rxjsMap } from 'rxjs/operators'

export interface Sub<Msg> extends Observable<Msg> {}

export function map<A, Msg>(sub: Sub<A>, f: (a: A) => Msg): Sub<Msg> {
  return sub.pipe(rxjsMap(f))
}

export function batch<Msg>(arr: Array<Sub<Msg>>): Sub<Msg> {
  return merge(...arr)
}

export const none: Sub<never> = empty()
