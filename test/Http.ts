import * as assert from 'assert'
import { toTask, get, BadUrl, BadPayload, Timeout } from '../src/Http'
import { fromType } from '../src/Decode'
import * as t from 'io-ts'
import { right } from 'fp-ts/lib/Either'
import 'isomorphic-fetch'
import { some } from 'fp-ts/lib/Option'

const TodoPayload = t.type({
  userId: t.number,
  id: t.number,
  title: t.string,
  completed: t.boolean
})

describe('Http', () => {
  describe('toTask', () => {
    it('should fetch a valid url', () => {
      const request = get('https://jsonplaceholder.typicode.com/todos/1', fromType(TodoPayload))
      return toTask(request)
        .run()
        .then(r => {
          assert.deepEqual(
            r,
            right({
              userId: 1,
              id: 1,
              title: 'delectus aut autem',
              completed: false
            })
          )
        })
    })

    it('should validate the payload', () => {
      const request = get('https://jsonplaceholder.typicode.com/todos/1', fromType(t.string))
      return toTask(request)
        .run()
        .then(r => {
          if (r.isLeft()) {
            if (r.value instanceof BadPayload) {
              assert.strictEqual(
                r.value.value,
                'Invalid value {"userId":1,"id":1,"title":"delectus aut autem","completed":false} supplied to : string'
              )
            } else {
              assert.ok(false, 'not a BadPayload')
            }
          } else {
            assert.ok(false, 'not a left')
          }
        })
    })

    it('should handle 404', () => {
      const request = get('https://jsonplaceholder.typicode.com/404', fromType(t.string))
      return toTask(request)
        .run()
        .then(r => {
          if (r.isLeft()) {
            assert.strictEqual(r.value instanceof BadUrl, true)
          } else {
            assert.ok(false, 'not a left')
          }
        })
    })

    it('should handle a timeout', () => {
      const request = get('https://jsonplaceholder.typicode.com/todos/1', fromType(TodoPayload))
      request.timeout = some(1)
      return toTask(request)
        .run()
        .then(r => {
          if (r.isLeft()) {
            assert.strictEqual(r.value instanceof Timeout, true)
          } else {
            assert.ok(false, 'not a left')
          }
        })
    })
  })
})
