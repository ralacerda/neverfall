import { err, ok, Result } from './result'
import { ResultAsync } from './result-async'

export function fromNullable<T, E>(value: T | null | undefined, error: E): Result<T, E> {
  return value == null ? err(error) : ok(value)
}

export function fromAny<R extends ResultAsync<unknown, unknown>>(results: readonly R[]): R {
  return new ResultAsync(Promise.any(results)) as R
}

export function fromRace<R extends ResultAsync<unknown, unknown>>(results: readonly R[]): R {
  return new ResultAsync(Promise.race(results)) as R
}
