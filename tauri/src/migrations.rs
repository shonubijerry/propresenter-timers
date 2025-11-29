use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
  vec![
    Migration {
      version: 1,
      description: "create_initial_tables",
      sql: r#"CREATE TABLE IF NOT EXISTS timers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE,
        name TEXT NOT NULL,
        allows_overrun INTEGER NOT NULL DEFAULT 0,
        countdown_duration REAL,
        state TEXT NOT NULL,
        remaining_seconds REAL NOT NULL,
        started_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS fluid_timers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timer_id TEXT UNIQUE,
        source	TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        address TEXT NOT NULL,
        port INTEGER NOT NULL,
        theme TEXT NOT NULL,
        datastore TEXT NOT NULL
      );"#,
      kind: MigrationKind::Up,
    },
    // Add more migrations here
  ]
}
