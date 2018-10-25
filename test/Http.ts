import * as assert from 'assert'
import { toTask, get, BadPayload, BadUrl } from '../src/Http'
import { fromType } from '../src/Decode'
import * as t from 'io-ts'
import { right } from 'fp-ts/lib/Either'

describe('Http', () => {
  describe('toTask', () => {
    it('should fetch a valid url', () => {
      const Payload = t.type({
        userId: t.number,
        id: t.number,
        title: t.string,
        completed: t.boolean
      })
      const request = get('https://jsonplaceholder.typicode.com/todos/1', fromType(Payload))
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
  })
})
