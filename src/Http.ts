import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { Either, left } from 'fp-ts/lib/Either'
import { identity } from 'fp-ts/lib/function'
import { none, Option } from 'fp-ts/lib/Option'
import { Task } from 'fp-ts/lib/Task'
import { Cmd } from './Cmd'
import { Decoder, mixed } from './Decode'
import { attempt } from './Task'

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface Request<A> {
  method: Method
  headers: { [key: string]: string }
  url: string
  body?: mixed
  expect: Expect<A>
  timeout: Option<number>
  withCredentials: boolean
}

export interface Expect<A> {
  (value: mixed): Either<string, A>
}

export function expectJson<A>(decoder: Decoder<A>): Expect<A> {
  return decoder.decode
}

export class BadUrl {
  readonly _tag: 'BadUrl' = 'BadUrl'
  constructor(readonly value: string) {}
}

export class Timeout {
  readonly _tag: 'Timeout' = 'Timeout'
}

export class NetworkError {
  readonly _tag: 'NetworkError' = 'NetworkError'
  constructor(readonly value: string) {}
}

export class BadStatus {
  readonly _tag: 'BadStatus' = 'BadStatus'
  constructor(readonly response: Response<string>) {}
}

export class BadPayload {
  readonly _tag: 'BadPayload' = 'BadPayload'
  constructor(readonly value: string, readonly response: Response<string>) {}
}

export type HttpError = BadUrl | Timeout | NetworkError | BadStatus | BadPayload

export interface Response<Body> {
  url: string
  status: {
    code: number
    message: string
  }
  headers: { [key: string]: string }
  body: Body
}

function axiosResponseToResponse(res: AxiosResponse): Response<string> {
  return {
    url: res.config.url!,
    status: {
      code: res.status,
      message: res.statusText
    },
    headers: res.headers,
    body: res.request.responseText
  }
}

function axiosResponseToEither<A>(res: AxiosResponse, expect: Expect<A>): Either<HttpError, A> {
  return expect(res.data).mapLeft(errors => new BadPayload(errors, axiosResponseToResponse(res)))
}

function axiosErrorToEither<A>(e: Error | { response: AxiosResponse }): Either<HttpError, A> {
  if (e instanceof Error) {
    if ((e as any).code === 'ECONNABORTED') {
      return left(new Timeout())
    } else {
      return left(new NetworkError(e.message))
    }
  }
  const res = e.response
  switch (res.status) {
    case 404:
      return left(new BadUrl(res.config.url!))
    default:
      return left(new BadStatus(axiosResponseToResponse(res)))
  }
}

function getPromiseAxiosResponse(config: AxiosRequestConfig): Promise<AxiosResponse> {
  return axios(config)
}

export function toTask<A>(req: Request<A>): Task<Either<HttpError, A>> {
  return new Task(() =>
    getPromiseAxiosResponse({
      method: req.method,
      headers: req.headers,
      url: req.url,
      data: req.body,
      timeout: req.timeout.fold(undefined, identity),
      withCredentials: req.withCredentials
    })
      .then(res => axiosResponseToEither(res, req.expect))
      .catch(e => axiosErrorToEither<A>(e))
  )
}

export function send<A, Msg>(req: Request<A>, f: (e: Either<HttpError, A>) => Msg): Cmd<Msg> {
  return attempt(toTask(req), f)
}

export function get<A>(url: string, decoder: Decoder<A>): Request<A> {
  return {
    method: 'GET',
    headers: {},
    url,
    body: undefined,
    expect: expectJson(decoder),
    timeout: none,
    withCredentials: false
  }
}

export function post<A>(url: string, body: mixed, decoder: Decoder<A>): Request<A> {
  return {
    method: 'POST',
    headers: {},
    url,
    body,
    expect: expectJson(decoder),
    timeout: none,
    withCredentials: false
  }
}
