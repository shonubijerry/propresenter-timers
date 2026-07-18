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
    Migration {
      version: 2,
      description: "add_lock_password_to_settings",
      sql: r#"ALTER TABLE settings ADD COLUMN lock_password TEXT NOT NULL DEFAULT '';"#,
      kind: MigrationKind::Up,
    },
    Migration {
      version: 3,
      description: "normalize_settings_to_key_value_rows",
      sql: r#"ALTER TABLE settings RENAME TO settings_legacy;
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
      );
      INSERT INTO settings (name, value)
        SELECT 'address', address FROM settings_legacy WHERE address IS NOT NULL;
      INSERT INTO settings (name, value)
        SELECT 'port', CAST(port AS TEXT) FROM settings_legacy WHERE port IS NOT NULL;
      INSERT INTO settings (name, value)
        SELECT 'theme', theme FROM settings_legacy WHERE theme IS NOT NULL;
      INSERT INTO settings (name, value)
        SELECT 'datastore', datastore FROM settings_legacy WHERE datastore IS NOT NULL;
      INSERT INTO settings (name, value)
        SELECT 'lock_password', COALESCE(lock_password, '') FROM settings_legacy;
      DROP TABLE settings_legacy;"#,
      kind: MigrationKind::Up,
    },
    Migration {
      version: 4,
      description: "create_timer_run_logs",
      sql: r#"CREATE TABLE IF NOT EXISTS timer_run_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timer_uuid TEXT NOT NULL,
        timer_name TEXT NOT NULL,
        scheduled_duration REAL NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        end_action TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_timer_run_logs_timer_uuid ON timer_run_logs(timer_uuid);
      CREATE INDEX IF NOT EXISTS idx_timer_run_logs_started_at ON timer_run_logs(started_at);
      CREATE INDEX IF NOT EXISTS idx_timer_run_logs_ended_at ON timer_run_logs(ended_at);"#,
      kind: MigrationKind::Up,
    },
    Migration {
      version: 5,
      description: "create_timer_orders",
      sql: r#"CREATE TABLE IF NOT EXISTS timer_orders (
        timer_uuid TEXT PRIMARY KEY,
        sort_order INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_timer_orders_sort_order ON timer_orders(sort_order);"#,
      kind: MigrationKind::Up,
    },
  ]
}
