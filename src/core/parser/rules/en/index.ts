import type { AnyRule } from '../../types'
import { estimate } from '../estimate'
import { area, person, tag } from '../symbols'
import { enDayOfMonth } from './dayOfMonth'
import { enExplicitDate } from './explicitDate'
import { enInN } from './inN'
import { enPeriods } from './periods'
import { enRecurrence } from './recurrence'
import { enRelativeDays } from './relativeDays'
import { enPriority, enWaiting } from './symbols'
import { enTime } from './time'
import { enWeekdays } from './weekdays'

/** Regole per l'inserimento rapido in inglese. Stime, #area, @persona e +tag sono le stesse dell'italiano. */
export const EN_RULES: AnyRule[] = [
  enRecurrence,
  enRelativeDays,
  enWeekdays,
  enInN,
  enPeriods,
  enExplicitDate,
  enDayOfMonth,
  enTime,
  enPriority,
  estimate,
  area,
  person,
  enWaiting,
  tag
]
