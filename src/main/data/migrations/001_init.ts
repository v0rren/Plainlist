export const INIT_SQL = /* sql */ `
CREATE TABLE areas (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  color      TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE recurrence_rules (
  id             INTEGER PRIMARY KEY,
  rrule          TEXT NOT NULL,
  template_json  TEXT NOT NULL,
  dtstart        TEXT NOT NULL,
  until          TEXT,
  last_generated TEXT
);

CREATE TABLE tasks (
  id               INTEGER PRIMARY KEY,
  parent_id        INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  priority         INTEGER NOT NULL DEFAULT 2 CHECK (priority IN (1, 2, 3)),
  area_id          INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  due_date         TEXT,
  due_time         TEXT,
  due_at           TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  source_text      TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  completed_at     TEXT,
  deleted_at       TEXT,
  reminded_at      TEXT,
  due_notified_at  TEXT,
  recurrence_id    INTEGER REFERENCES recurrence_rules(id) ON DELETE SET NULL,
  occurrence_date  TEXT
);
CREATE INDEX ix_tasks_open ON tasks(status, due_date) WHERE deleted_at IS NULL;
CREATE INDEX ix_tasks_area ON tasks(area_id);
CREATE INDEX ix_tasks_parent ON tasks(parent_id);
CREATE INDEX ix_tasks_due_at ON tasks(due_at) WHERE due_at IS NOT NULL AND status = 'open';

CREATE TABLE people (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);
CREATE TABLE task_people (
  task_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, person_id)
);

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);
CREATE TABLE task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE task_events (
  id           INTEGER PRIMARY KEY,
  task_id      INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  payload_json TEXT,
  at           TEXT NOT NULL
);
CREATE INDEX ix_task_events_task ON task_events(task_id, at);

CREATE VIRTUAL TABLE tasks_fts USING fts5(
  title, notes,
  content = 'tasks', content_rowid = 'id',
  tokenize = 'unicode61 remove_diacritics 2'
);
CREATE TRIGGER tasks_fts_ai AFTER INSERT ON tasks BEGIN
  INSERT INTO tasks_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;
CREATE TRIGGER tasks_fts_ad AFTER DELETE ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
END;
CREATE TRIGGER tasks_fts_au AFTER UPDATE OF title, notes ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, title, notes) VALUES ('delete', old.id, old.title, old.notes);
  INSERT INTO tasks_fts(rowid, title, notes) VALUES (new.id, new.title, new.notes);
END;

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

INSERT INTO areas (name, color, sort_order) VALUES
  ('lavoro', '#2563eb', 0),
  ('casa', '#16a34a', 1),
  ('personale', '#d97706', 2);
`
