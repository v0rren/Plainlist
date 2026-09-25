/** Chi aggiorna un'installazione già in uso non rivede il tour di benvenuto. */
export const TOUR_SQL = /* sql */ `
INSERT OR IGNORE INTO settings (key, value_json)
SELECT 'tourCompleted', 'true' WHERE EXISTS (SELECT 1 FROM tasks);
`
