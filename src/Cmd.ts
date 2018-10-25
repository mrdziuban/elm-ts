import { Option } from 'fp-ts/lib/Option'
import { Task } from 'fp-ts/lib/Task'
import { empty, merge, Observable } from 'rxjs'
import { map as rxjsMap } from 'rxjs/operators'

export interface Cmd<Msg> extends Observable<Task<Option<Msg>>> {}

export function map<A, Msg>(cmd: Cmd<A>, f: (a: A) => Msg): Cmd<Msg> {
  return cmd.pipe(rxjsMap(task => task.map(option => option.map(f))))
}

export function batch<Msg>(arr: Array<Cmd<Msg>>): Cmd<Msg> {
  return merge(...arr)
}

export const none: Cmd<never> = empty()
