import { fromThrowing, ResultAsync } from '../src'
import { vitest, describe, expect, it } from 'vitest'

describe('fromThrowing', () => {
  const mockClient = { name: 'test-client', version: '1.0.0' }
  const errorMapper = (err: unknown) => `Error: ${err}`

  describe('useSync', () => {
    it('wraps successful sync operations in Ok', () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const result = wrapper.useSync((client) => {
        return `Hello from ${client.name}`
      })

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe('Hello from test-client')
    })

    it('wraps thrown errors in Err without throwing', () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const result = wrapper.useSync((client) => {
        throw new Error(`Failed to process ${client.name}`)
      })

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('Error: Error: Failed to process test-client')
    })

    it('wraps sync operations that return primitives', () => {
      const wrapper = fromThrowing(42, (err) => err as string)

      const result = wrapper.useSync((num) => num * 2)

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(84)
    })

    it('wraps sync operations that return null/undefined', () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const nullResult = wrapper.useSync(() => null)
      const undefinedResult = wrapper.useSync(() => undefined)

      expect(nullResult.isOk()).toBe(true)
      expect(nullResult._unsafeUnwrap()).toBe(null)
      expect(undefinedResult.isOk()).toBe(true)
      expect(undefinedResult._unsafeUnwrap()).toBe(undefined)
    })

    it('handles string throws', () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const result = wrapper.useSync(() => {
        throw 'String error'
      })

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('Error: String error')
    })

    it('handles non-Error object throws', () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const result = wrapper.useSync(() => {
        throw { code: 500, message: 'Server error' }
      })

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('Error: [object Object]')
    })
  })

  describe('use (async)', () => {
    it('wraps successful promise-returning operations in Ok', async () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const resultAsync = wrapper.use(async (client) => {
        return `Async hello from ${client.name}`
      })

      expect(resultAsync).toBeInstanceOf(ResultAsync)

      const result = await resultAsync
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe('Async hello from test-client')
    })

    it('wraps promise rejections in Err without throwing', async () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const resultAsync = wrapper.use(async (client) => {
        throw new Error(`Async failed for ${client.name}`)
      })

      expect(resultAsync).toBeInstanceOf(ResultAsync)

      const result = await resultAsync
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('Error: Error: Async failed for test-client')
    })

    it('wraps sync throws in functions that return promises in Err', async () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      // Function that throws synchronously but is supposed to return a Promise
      const resultAsync = wrapper.use((client) => {
        throw new Error(`Sync throw in async function for ${client.name}`)
        // This line would never be reached, but TypeScript expects a Promise return
        return Promise.resolve('never reached')
      })

      expect(resultAsync).toBeInstanceOf(ResultAsync)

      const result = await resultAsync
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe(
        'Error: Error: Sync throw in async function for test-client',
      )
    })

    it('wraps functions that return rejected promises', async () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const resultAsync = wrapper.use((client) => {
        return Promise.reject(new Error(`Promise rejected for ${client.name}`))
      })

      expect(resultAsync).toBeInstanceOf(ResultAsync)

      const result = await resultAsync
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('Error: Error: Promise rejected for test-client')
    })

    it('wraps functions that return promises resolving to null/undefined', async () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const nullResultAsync = wrapper.use(() => Promise.resolve(null))
      const undefinedResultAsync = wrapper.use(() => Promise.resolve(undefined))

      const nullResult = await nullResultAsync
      const undefinedResult = await undefinedResultAsync

      expect(nullResult.isOk()).toBe(true)
      expect(nullResult._unsafeUnwrap()).toBe(null)
      expect(undefinedResult.isOk()).toBe(true)
      expect(undefinedResult._unsafeUnwrap()).toBe(undefined)
    })

    it('handles promise rejections with non-Error values', async () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const stringRejectResult = wrapper.use(() => Promise.reject('String rejection'))
      const objectRejectResult = wrapper.use(() => Promise.reject({ code: 404 }))

      const stringResult = await stringRejectResult
      const objectResult = await objectRejectResult

      expect(stringResult.isErr()).toBe(true)
      expect(stringResult._unsafeUnwrapErr()).toBe('Error: String rejection')
      expect(objectResult.isErr()).toBe(true)
      expect(objectResult._unsafeUnwrapErr()).toBe('Error: [object Object]')
    })

    it('handles functions that return non-async promises', async () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const resultAsync = wrapper.use((client) => {
        // Return a promise without using async/await
        return new Promise((resolve) => {
          setTimeout(() => resolve(`Delayed response for ${client.name}`), 10)
        })
      })

      const result = await resultAsync
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe('Delayed response for test-client')
    })

    it('handles functions that return promises but throw before returning', async () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const resultAsync = wrapper.use((client) => {
        if (client.name === 'test-client') {
          throw new Error('Pre-promise throw')
        }
        return Promise.resolve('success')
      })

      const result = await resultAsync
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('Error: Error: Pre-promise throw')
    })
  })

  describe('error mapping', () => {
    it('applies custom error mapping function', () => {
      const customErrorMapper = (err: unknown) => ({
        timestamp: Date.now(),
        error: String(err),
        type: 'custom',
      })

      const wrapper = fromThrowing(mockClient, customErrorMapper)

      const result = wrapper.useSync(() => {
        throw new Error('Test error')
      })

      expect(result.isErr()).toBe(true)
      const error = result._unsafeUnwrapErr()
      expect(error).toHaveProperty('timestamp')
      expect(error).toHaveProperty('error', 'Error: Test error')
      expect(error).toHaveProperty('type', 'custom')
    })

    it('applies custom error mapping to async operations', async () => {
      const customErrorMapper = (err: unknown) => `MAPPED: ${err}`

      const wrapper = fromThrowing(mockClient, customErrorMapper)

      const resultAsync = wrapper.use(async () => {
        throw new Error('Async test error')
      })

      const result = await resultAsync
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('MAPPED: Error: Async test error')
    })
  })

  describe('client parameter usage', () => {
    it('passes the client parameter correctly to sync functions', () => {
      const mockFn = vitest.fn((client) => client.version)
      const wrapper = fromThrowing(mockClient, errorMapper)

      const result = wrapper.useSync(mockFn)

      expect(mockFn).toHaveBeenCalledWith(mockClient)
      expect(result._unsafeUnwrap()).toBe('1.0.0')
    })

    it('passes the client parameter correctly to async functions', async () => {
      const mockFn = vitest.fn(async (client) => client.name.toUpperCase())
      const wrapper = fromThrowing(mockClient, errorMapper)

      const resultAsync = wrapper.use(mockFn)
      const result = await resultAsync

      expect(mockFn).toHaveBeenCalledWith(mockClient)
      expect(result._unsafeUnwrap()).toBe('TEST-CLIENT')
    })

    it('works with different client types', () => {
      const numberWrapper = fromThrowing(42, errorMapper)
      const stringWrapper = fromThrowing('hello', errorMapper)
      const arrayWrapper = fromThrowing([1, 2, 3], errorMapper)

      const numberResult = numberWrapper.useSync((n) => n * 2)
      const stringResult = stringWrapper.useSync((s) => s.toUpperCase())
      const arrayResult = arrayWrapper.useSync((arr) => arr.length)

      expect(numberResult._unsafeUnwrap()).toBe(84)
      expect(stringResult._unsafeUnwrap()).toBe('HELLO')
      expect(arrayResult._unsafeUnwrap()).toBe(3)
    })
  })

  describe('type safety', () => {
    it('maintains type safety for return values', () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      // The Result should be properly typed
      const stringResult = wrapper.useSync((client) => client.name)
      const numberResult = wrapper.useSync(() => 42)

      expect(typeof stringResult._unsafeUnwrap()).toBe('string')
      expect(typeof numberResult._unsafeUnwrap()).toBe('number')
    })

    it('maintains type safety for async return values', async () => {
      const wrapper = fromThrowing(mockClient, errorMapper)

      const stringResultAsync = wrapper.use(async (client) => client.name)
      const numberResultAsync = wrapper.use(async () => 42)

      const stringResult = await stringResultAsync
      const numberResult = await numberResultAsync

      expect(typeof stringResult._unsafeUnwrap()).toBe('string')
      expect(typeof numberResult._unsafeUnwrap()).toBe('number')
    })
  })
})
