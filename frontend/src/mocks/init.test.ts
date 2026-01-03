import { describe, it, expect, vi, beforeEach } from 'vitest'

// We will implement initMocks in src/mocks/init.ts
import { initMocks } from './init'
import { worker } from './browser'

vi.mock('./browser', () => ({
  worker: {
    start: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('initMocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset import.meta.env.VITE_USE_MOCKS if possible, 
    // but vitest's import.meta.env is tricky.
    // We'll rely on the implementation using a helper or just test the logic.
  })

  it('should start the worker when VITE_USE_MOCKS is "true"', async () => {
    (import.meta.env as any).VITE_USE_MOCKS = 'true'
    await initMocks()
    expect(worker.start).toHaveBeenCalled()
  })

  it('should not start the worker when VITE_USE_MOCKS is not "true"', async () => {
    (import.meta.env as any).VITE_USE_MOCKS = 'false'
    await initMocks()
    expect(worker.start).not.toHaveBeenCalled()
    
    vi.clearAllMocks();
    (import.meta.env as any).VITE_USE_MOCKS = undefined
    await initMocks()
    expect(worker.start).not.toHaveBeenCalled()
  })
})
