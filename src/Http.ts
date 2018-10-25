import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { Either, left } from 'fp-ts/lib/Either'
import { identity } from 'fp-ts/lib/function'
import { none, Option } from 'fp-ts/lib/Option'
import { Task } from 'fp-ts/lib/Task'
import { Cmd } from './Cmd'
import { Decoder } from './Decode'
import { attempt } from './Task'

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface Request<A> {
  method: Method
  headers: Record<string, string>
  url: string
  body?: unknown
  expect: Expect<A>
  timeout: Option<number>
  withCredentials: boolean
}

export interface Expect<A> {
  (value: unknown): Either<string, A>
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

/**
 * A `Request` can fail in a couple ways:
 * - `BadUrl` means you did not provide a valid URL.
 * - `Timeout` means it took too long to get a response.
 * - `NetworkError` means the user turned off their wifi, went in a cave, etc.
 * - `BadStatus` means you got a response back, but the status code (*) indicates failure.
 * - `BadPayload` means you got a response back with a nice status code, but the body of the response was something
 *   unexpected. The `string` in this case is a debugging message that explains what went wrong with your JSON decoder
 *   or whatever.
 *
 * (*) https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
 */
export type HttpError = BadUrl | Timeout | NetworkError | BadStatus | BadPayload

export interface Response<Body> {
  url: string
  status: {
    code: number
    message: string
  }
  headers: Record<string, string>
  body: Body
}

function axiosResponseToResponse<A>(req: Request<A>, res: AxiosResponse): Response<string> {
  return {
    url: req.url,
    status: {
      code: res.status,
      message: res.statusText
    },
    headers: res.headers,
    body: res.request.responseText
  }
}

function axiosResponseToEither<A>(req: Request<A>, res: AxiosResponse): Either<HttpError, A> {
  return req.expect(res.data).mapLeft(errors => new BadPayload(errors, axiosResponseToResponse(req, res)))
}

function axiosErrorToEither<A>(req: Request<A>, e: AxiosError): Either<HttpError, A> {
  if (e.code === 'ECONNABORTED') {
    return left(new Timeout())
  } else if (e.response) {
    const res = e.response
    switch (res.status) {
      case 404:
        return left(new BadUrl(req.url))
      default:
        return left(new BadStatus(axiosResponseToResponse(req, res)))
    }
  }
  return left(new NetworkError(e.message))
}

function getPromiseAxiosResponse(config: AxiosRequestConfig): Promise<AxiosResponse> {
  return axios(config)
}

export function toTask<A>(req: Request<A>): Task<Either<HttpError, A>> {
  const url = req.url
  return new Task(() =>
    getPromiseAxiosResponse({
      method: req.method,
      headers: req.headers,
      url,
      data: req.body,
      timeout: req.timeout.fold(undefined, identity),
      withCredentials: req.withCredentials
    })
      .then(res => axiosResponseToEither(req, res))
      .catch(e => axiosErrorToEither<A>(req, e))
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

export function post<A>(url: string, body: unknown, decoder: Decoder<A>): Request<A> {
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
