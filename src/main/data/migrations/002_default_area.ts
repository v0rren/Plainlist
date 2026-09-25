/** Area predefinita "lavoro" per l'inserimento rapido, senza sovrascrivere una scelta già fatta. */
export const DEFAULT_AREA_SQL = /* sql */ `
INSERT OR IGNORE INTO settings (key, value_json)
SELECT 'defaultAreaId', CAST(id AS TEXT) FROM areas WHERE name = 'lavoro' AND archived = 0;
`
