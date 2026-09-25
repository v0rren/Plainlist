import type { AnyRule } from '../types'
import { dayOfMonth } from './dayOfMonth'
import { estimate } from './estimate'
import { explicitDate } from './explicitDate'
import { inN } from './inN'
import { periods } from './periods'
import { recurrence } from './recurrence'
import { relativeDays } from './relativeDays'
import { area, person, priority, tag, waiting } from './symbols'
import { time } from './time'
import { weekdays } from './weekdays'

/** Vince la corrispondenza più lunga; a parità, la regola che compare prima. */
export const DEFAULT_RULES: AnyRule[] = [
  recurrence,
  relativeDays,
  weekdays,
  inN,
  periods,
  explicitDate,
  dayOfMonth,
  time,
  priority,
  estimate,
  area,
  person,
  waiting,
  tag
]
