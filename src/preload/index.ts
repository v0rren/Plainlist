import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { EVENT_CHANNELS, INVOKE_CHANNELS, type RendererApi, type Wire } from '../shared/ipc'

const invokeChannels = new Set<string>(INVOKE_CHANNELS)
const eventChannels = new Set<string>(EVENT_CHANNELS)

const api: RendererApi = {
  async invoke(channel, ...args) {
    if (!invokeChannels.has(channel)) throw new Error(`Canale non consentito: ${channel}`)
    const res = (await ipcRenderer.invoke(channel, args[0])) as Wire<unknown>
    if (!res.ok) {
      const error = new Error(res.error.message)
      error.name = res.error.name
      throw error
    }
    return res.data as never
  },
  on(channel, listener) {
    if (!eventChannels.has(channel)) throw new Error(`Canale non consentito: ${channel}`)
    const wrapped = (_event: IpcRendererEvent, payload: unknown): void => listener(payload as never)
    ipcRenderer.on(channel, wrapped)
    return () => {
      ipcRenderer.removeListener(channel, wrapped)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
