import { Task } from 'fp-ts/lib/Task'
import { interval } from 'rxjs'
import { map } from 'rxjs/operators'
import { Sub } from './Sub'

export function now(): Task<number> {
  return new Task(() => Promise.resolve(new Date().getTime()))
}

export function every<Msg>(time: number, f: (time: number) => Msg): Sub<Msg> {
  return interval(time).pipe(map(() => f(new Date().getTime())))
}
