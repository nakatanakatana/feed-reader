import { worker } from './browser'

export async function initMocks() {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    await worker.start({
      onUnhandledRequest: 'bypass',
    })
  }
}
