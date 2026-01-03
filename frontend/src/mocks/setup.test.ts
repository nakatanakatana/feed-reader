import { describe, it, expect } from 'vitest'
import { worker } from './browser'
import { handlers } from './handlers'

describe('MSW Setup', () => {
  it('should export a worker', () => {
    expect(worker).toBeDefined()
  })

  it('should export handlers', () => {
    expect(handlers).toBeDefined()
    expect(Array.isArray(handlers)).toBe(true)
  })
})
