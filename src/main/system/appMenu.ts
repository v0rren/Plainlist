import { app, Menu, type MenuItemConstructorOptions } from 'electron'
import { t } from '../../core/i18n'

/**
 * Menu dell'app su Mac. Non è solo estetica: senza il menu Modifica non funzionano ⌘C, ⌘V, ⌘X e ⌘A,
 * e senza il menu dell'app manca ⌘Q. Su Windows il menu resta nascosto.
 */
export function macMenu(actions: { settings(): void }): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: `${t().system.traySettings}…`, accelerator: 'Command+,', click: () => actions.settings() },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    { role: 'windowMenu' }
  ]
  return Menu.buildFromTemplate(template)
}
