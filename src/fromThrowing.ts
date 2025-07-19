import { fromAsyncThrowable, ResultAsync } from './result-async'
import { fromThrowable, Result } from './result'

export function fromThrowing<T, U>(client: T, errorFn: (err: unknown) => U) {
  return {
    use<R>(fn: (client: T) => Promise<R>): ResultAsync<R, U> {
      return fromAsyncThrowable(() => fn(client), errorFn)()
    },
    useSync<R>(fn: (client: T) => R): Result<R, U> {
      return fromThrowable(() => fn(client), errorFn)()
    },
  }
}
