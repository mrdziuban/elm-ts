import { array } from 'fp-ts/lib/Array'
import { Either } from 'fp-ts/lib/Either'
import { some } from 'fp-ts/lib/Option'
import { Task, task } from 'fp-ts/lib/Task'
import { sequence as seq } from 'fp-ts/lib/Traversable'
import { of } from 'rxjs'
import { Cmd } from './Cmd'

export { Task }

const sequenceTasks = seq(task, array)

export function perform<A, Msg>(task: Task<A>, f: (a: A) => Msg): Cmd<Msg> {
  return of(task.map(a => some(f(a))))
}

export function sequence<A>(tasks: Array<Task<A>>): Task<Array<A>> {
  return sequenceTasks(tasks)
}

export function attempt<E, A, Msg>(task: Task<Either<E, A>>, f: (e: Either<E, A>) => Msg): Cmd<Msg> {
  return perform(task, f)
}
