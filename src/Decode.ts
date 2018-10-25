import { Either } from 'fp-ts/lib/Either'
import { mixed, Type } from 'io-ts'
import { failure } from 'io-ts/lib/PathReporter'

export type mixed = mixed

export interface Decoder<A> {
  decode: (value: mixed) => Either<string, A>
}

export function decodeJSON<A>(decoder: Decoder<A>, value: mixed): Either<string, A> {
  return decoder.decode(value)
}

export function map<A, B>(fa: Decoder<A>, f: (a: A) => B): Decoder<B> {
  return {
    decode: value => fa.decode(value).map(f)
  }
}

export function fromType<A>(type: Type<A, any, mixed>): Decoder<A> {
  return {
    decode: value => type.decode(value).mapLeft(errors => failure(errors).join('\n'))
  }
}
