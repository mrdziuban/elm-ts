import { ReactElement } from 'react'
import { Observable } from 'rxjs'
import { Cmd } from './Cmd'
import * as html from './Html'
import { Sub } from './Sub'

export interface Dom extends ReactElement<any> {}

export interface Html<Msg> extends html.Html<Dom, Msg> {}

export function map<A, Msg>(ha: Html<A>, f: (a: A) => Msg): Html<Msg> {
  return html.map(ha, f)
}

export interface Program<Model, Msg> extends html.Program<Model, Msg, Dom> {}

export function program<Model, Msg>(
  init: [Model, Cmd<Msg>],
  update: (msg: Msg, model: Model) => [Model, Cmd<Msg>],
  view: (model: Model) => html.Html<Dom, Msg>,
  subscriptions?: (model: Model) => Sub<Msg>
): Program<Model, Msg> {
  return html.program(init, update, view, subscriptions)
}

export function programWithFlags<Flags, Model, Msg>(
  init: (flags: Flags) => [Model, Cmd<Msg>],
  update: (msg: Msg, model: Model) => [Model, Cmd<Msg>],
  view: (model: Model) => html.Html<Dom, Msg>,
  subscriptions?: (model: Model) => Sub<Msg>
): (flags: Flags) => Program<Model, Msg> {
  return flags => program(init(flags), update, view, subscriptions)
}

export function run<Model, Msg>(program: Program<Model, Msg>, renderer: html.Renderer<Dom>): Observable<Model> {
  return html.run(program, renderer)
}
