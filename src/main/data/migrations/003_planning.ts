/** Ricorrenze, data di inizio, stima, "in attesa" e "Il mio giorno". */
export const PLANNING_SQL = /* sql */ `
ALTER TABLE tasks ADD COLUMN start_date TEXT;
ALTER TABLE tasks ADD COLUMN estimate_min INTEGER CHECK (estimate_min IS NULL OR estimate_min > 0);
ALTER TABLE tasks ADD COLUMN waiting INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN my_day_date TEXT;
ALTER TABLE recurrence_rules ADD COLUMN anchor TEXT NOT NULL DEFAULT 'schedule' CHECK (anchor IN ('schedule', 'completion'));
CREATE INDEX ix_tasks_recurrence ON tasks(recurrence_id) WHERE recurrence_id IS NOT NULL;
`
