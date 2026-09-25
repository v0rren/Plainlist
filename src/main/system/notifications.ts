import { Notification } from 'electron'
import type { Task } from '../../core/types'
import { appIconPath } from '../windows/mainWindow'

/** Riferimenti tenuti in vita finché la notifica esiste: senza, il garbage collector perde il click. */
const alive = new Set<Notification>()

export function notify(title: string, body: string, onClick?: () => void): void {
  if (!Notification.isSupported()) return
  const n = new Notification({ title, body, icon: appIconPath(), silent: false })
  alive.add(n)
  const release = (): void => {
    alive.delete(n)
  }
  n.on('click', () => {
    release()
    onClick?.()
  })
  n.on('close', release)
  n.on('failed', release)
  n.show()
}

export function taskBody(task: Task): string {
  const extra = [task.areaName && `#${task.areaName}`, task.people.length > 0 && `@${task.people.join(', @')}`]
    .filter(Boolean)
    .join(' · ')
  return extra ? `${task.title}\n${extra}` : task.title
}
