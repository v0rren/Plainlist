import { addDays, mondayOfNextWeek, type DateKey } from './time'
import type { RescheduleTarget } from './types'

export function rescheduleDate(target: RescheduleTarget, today: DateKey): DateKey {
  if (typeof target === 'object') return target.date
  switch (target) {
    case 'today':
      return today
    case 'tomorrow':
      return addDays(today, 1)
    case 'nextWeek':
      return mondayOfNextWeek(today)
  }
}
