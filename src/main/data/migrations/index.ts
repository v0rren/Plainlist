import { INIT_SQL } from './001_init'
import { DEFAULT_AREA_SQL } from './002_default_area'
import { PLANNING_SQL } from './003_planning'
import { TOUR_SQL } from './004_tour'

export interface Migration {
  version: number
  sql: string
}

/** Aggiungere qui le nuove migrazioni, con versione crescente. Non modificare quelle già rilasciate. */
export const MIGRATIONS: Migration[] = [
  { version: 1, sql: INIT_SQL },
  { version: 2, sql: DEFAULT_AREA_SQL },
  { version: 3, sql: PLANNING_SQL },
  { version: 4, sql: TOUR_SQL }
]
