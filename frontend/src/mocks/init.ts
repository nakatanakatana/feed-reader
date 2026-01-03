import { worker } from './browser'
import { Config } from '../config'

export async function initMocks(cfg: Config) {
  if (cfg.useMocks) {
    await worker.start({
      onUnhandledRequest: 'bypass',
    })
  }
}
