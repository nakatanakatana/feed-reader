import { worker } from './browser'
import { config } from '../config'

export async function initMocks() {
  if (config.useMocks) {
    await worker.start({
      onUnhandledRequest: 'bypass',
    })
  }
}
