import { Either, right, left } from 'fp-ts/lib/Either'
import { none, Option } from 'fp-ts/lib/Option'
import { Task, tryCatch } from 'fp-ts/lib/Task'
import { Cmd } from './Cmd'
import { Decoder } from './Decode'
import { attempt } from './Task'

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface Request<A> {
  method: Method
  headers: Record<string, string>
  url: string
  body?: string
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

const include: 'include' = 'include'

const getRequestInit = <A>(req: Request<A>): RequestInit => {
  return {
    body: req.body,
    credentials: req.withCredentials ? include : undefined,
    headers: req.headers,
    method: req.method
  }
}

const applyTimeout = <A>(millis: Option<number>, fa: Promise<A>): Promise<A> => {
  return millis.fold(
    fa,
    millis =>
      new Promise(function(resolve, reject) {
        setTimeout(() => reject(new Timeout()), millis)
        fa.then(resolve, reject)
      })
  )
}

const toHeaders = (hs: Headers): Record<string, string> => {
  const result: Record<string, string> = {}
  hs.forEach((v: string, k: string) => {
    result[k] = v
  })
  return result
}

const isBadStatus = (status: number): boolean => status < 200 || status >= 300

const validateStatus = (res: Response<string>): Either<HttpError, Response<string>> => {
  return isBadStatus(res.status.code)
    ? left(res.status.code === 404 ? new BadUrl(res.url) : new BadStatus(res))
    : right(res)
}

const parseBody = (res: Response<string>): Either<HttpError, unknown> => {
  try {
    return right(JSON.parse(res.body))
  } catch (e) {
    return left(new BadPayload(`JSON.parse: ${e.message}`, res))
  }
}

const validateBody = <A>(a: unknown, req: Request<A>, res: Response<string>): Either<HttpError, A> => {
  return req.expect(a).mapLeft(error => new BadPayload(error, res))
}

export function toTask<A>(req: Request<A>): Task<Either<HttpError, A>> {
  const url = req.url
  return tryCatch<HttpError, Response<string>>(
    () =>
      applyTimeout(req.timeout, fetch(url, getRequestInit(req))).then(res =>
        res.text().then(body => ({
          url,
          status: {
            code: res.status,
            message: res.statusText
          },
          headers: toHeaders(res.headers),
          body
        }))
      ),
    (error: unknown) => (error instanceof Timeout ? error : new NetworkError(String(error)))
  ).map(e => e.chain(res => validateStatus(res).chain(() => parseBody(res).chain(a => validateBody(a, req, res)))))
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

export function post<A>(url: string, body: string, decoder: Decoder<A>): Request<A> {
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
