import { beforeAll, afterAll, afterEach } from 'vitest'
import { worker } from './mocks/browser'

beforeAll(async () => {
  await worker.start({ onUnhandledRequest: 'bypass' })
})

afterEach(() => {
  worker.resetHandlers()
})

afterAll(() => {
  worker.stop()
})
