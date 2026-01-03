import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initMocks } from './init'
import { worker } from './browser'
import { config } from '../config'

// モックの定義
vi.mock('./browser', () => {
  return {
    worker: {
      start: vi.fn(() => Promise.resolve()),
      stop: vi.fn(() => Promise.resolve()),
    }
  }
})

vi.mock('../config', () => {
  return {
    config: {
      useMocks: false
    }
  }
})

describe('initMocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start the worker when config.useMocks is true', async () => {
    // @ts-ignore
    config.useMocks = true
    await initMocks()
    expect(worker.start).toHaveBeenCalled()
  })

  it('should not start the worker when config.useMocks is false', async () => {
    // @ts-ignore
    config.useMocks = false
    await initMocks()
    expect(worker.start).not.toHaveBeenCalled()
  })
})
