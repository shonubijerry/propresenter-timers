use rusqlite::{params, Connection, Error};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
pub struct Timer {
  pub uuid: String,
  pub index_num: i32,
  pub name: String,
  pub allows_overrun: bool,
  pub countdown_duration: Option<f64>,
  pub state: String,
  pub remaining_seconds: f64,
  pub started_at: Option<i64>,
  pub created_at: i64,
  pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PartialTimer {
  pub uuid: Option<String>,
  pub index_num: Option<i32>,
  pub name: Option<String>,
  pub allows_overrun: Option<bool>,
  pub countdown_duration: Option<f64>,
  pub state: Option<String>,
  pub remaining_seconds: Option<f64>,
  pub started_at: Option<i64>,
  pub created_at: Option<i64>,
  pub updated_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
pub struct FluidTimer {
  pub id: i32,
  pub timer_id: String,
  pub created_at: i64,
}

// Database struct to hold the connection
pub struct Database {
  conn: Mutex<Connection>,
}

impl Database {
  pub fn new(path: &str) -> Result<Self, Error> {
    let conn = init_db(path)?;
    Ok(Database {
      conn: Mutex::new(conn),
    })
  }

  // Create a new timer
  pub fn create(&self, timer: &Timer) -> Result<(), Error> {
    let conn = self.conn.lock().unwrap();

    conn.execute(
            "INSERT INTO timers (uuid, name, allows_overrun, countdown_duration, state, remaining_seconds, started_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                Uuid::new_v4().to_string(),
                timer.name,
                timer.allows_overrun as i32, // Convert bool to i32
                timer.countdown_duration,
                timer.state,
                timer.remaining_seconds,
                timer.started_at,
                timer.created_at,
                timer.updated_at
            ],
        )?;

    Ok(())
  }

  // Read a timer by UUID
  pub fn get(&self, uuid: &str) -> Result<Option<Timer>, Error> {
    let conn = self.conn.lock().unwrap();

    let mut stmt = conn.prepare(
            "SELECT uuid, index_num, name, allows_overrun, countdown_duration, state, remaining_seconds, started_at, created_at, updated_at
             FROM timers WHERE uuid = ?1"
        )?;

    let mut timer_iter = stmt.query_map(params![uuid], |row| {
      Ok(Timer {
        uuid: row.get(0)?,
        index_num: row.get(1)?,
        name: row.get(2)?,
        allows_overrun: row.get::<_, i32>(3)? != 0, // Convert i32 to bool
        countdown_duration: row.get(4)?,
        state: row.get(5)?,
        remaining_seconds: row.get(6)?,
        started_at: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
      })
    })?;

    match timer_iter.next() {
      Some(result) => result.map(Some),
      None => Ok(None),
    }
  }

  // Update a timer
  pub fn update(&self, timer: &PartialTimer) -> Result<(), Error> {
    let conn = self.conn.lock().unwrap();

    conn.execute(
      "UPDATE timers SET
            name = COALESCE(?2, name),
            allows_overrun = COALESCE(?3, allows_overrun),
            countdown_duration = COALESCE(?4, countdown_duration),
            state = COALESCE(?5, state),
            remaining_seconds = COALESCE(?6, remaining_seconds),
            started_at = ?7,
            updated_at = COALESCE(?8, updated_at)
         WHERE uuid = ?1",
      params![
        timer.uuid,
        timer.name,
        timer.allows_overrun,
        timer.countdown_duration,
        timer.state,
        timer.remaining_seconds,
        timer.started_at,
        timer.updated_at
      ],
    )?;

    Ok(())
  }

  // Delete a timer by UUID
  pub fn delete(&self, uuid: &str) -> Result<(), Error> {
    let conn = self.conn.lock().unwrap();

    conn.execute("DELETE FROM timers WHERE uuid = ?1", params![uuid])?;

    Ok(())
  }

  // List all timers, ordered by index_num
  pub fn list(&self) -> Result<Vec<Timer>, Error> {
    let conn = self.conn.lock().unwrap();

    let mut stmt = conn.prepare(
            "SELECT uuid, index_num, name, allows_overrun, countdown_duration, state, remaining_seconds, started_at, created_at, updated_at
             FROM timers ORDER BY index_num"
        )?;

    let timer_iter = stmt.query_map(params![], |row| {
      Ok(Timer {
        uuid: row.get(0)?,
        index_num: row.get(1)?,
        name: row.get(2)?,
        allows_overrun: row.get::<_, i32>(3)? != 0,
        countdown_duration: row.get(4)?,
        state: row.get(5)?,
        remaining_seconds: row.get(6)?,
        started_at: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
      })
    })?;

    let mut timers = Vec::new();
    for timer in timer_iter {
      timers.push(timer?);
    }

    Ok(timers)
  }

  // List timers with pagination
  pub fn list_paginated(&self, limit: i32, offset: i32) -> Result<Vec<Timer>, Error> {
    let conn = self.conn.lock().unwrap();

    let mut stmt = conn.prepare(
            "SELECT uuid, index_num, name, allows_overrun, countdown_duration, state, remaining_seconds, started_at, created_at, updated_at
             FROM timers ORDER BY index_num LIMIT ?1 OFFSET ?2"
        )?;

    let timer_iter = stmt.query_map(params![limit, offset], |row| {
      Ok(Timer {
        uuid: row.get(0)?,
        index_num: row.get(1)?,
        name: row.get(2)?,
        allows_overrun: row.get::<_, i32>(3)? != 0,
        countdown_duration: row.get(4)?,
        state: row.get(5)?,
        remaining_seconds: row.get(6)?,
        started_at: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
      })
    })?;

    let mut timers = Vec::new();
    for timer in timer_iter {
      timers.push(timer?);
    }

    Ok(timers)
  }

  // Count total timers
  pub fn count(&self) -> Result<i32, Error> {
    let conn = self.conn.lock().unwrap();

    let mut stmt = conn.prepare("SELECT COUNT(*) FROM timers")?;
    let count: i32 = stmt.query_row(params![], |row| row.get(0))?;

    Ok(count)
  }

  pub fn insert_fluid_timer(&self, timer_id: &String, created_at: i64) -> Result<(), Error> {
    let conn = self.conn.lock().unwrap();

    conn.execute(
      "INSERT INTO fluid_timers (timer_id, created_at)
             VALUES (?1, ?2)",
      params![timer_id, created_at],
    )?;

    Ok(())
  }

  pub fn list_fluid(&self) -> Result<Vec<FluidTimer>, Error> {
    let conn = self.conn.lock().unwrap();

    let mut stmt = conn.prepare("SELECT * FROM fluid_timers")?;

    let fluid_timer_iter = stmt.query_map(params![], |row| {
      Ok(FluidTimer {
        id: row.get(0)?,
        timer_id: row.get(1)?,
        created_at: row.get(2)?,
      })
    })?;

    let mut timers = Vec::new();
    for timer in fluid_timer_iter {
      timers.push(timer?);
    }

    Ok(timers)
  }

  // Delete a timer by UUID
  pub fn delete_fluid(&self, timer_id: &str) -> Result<(), Error> {
    let conn = self.conn.lock().unwrap();

    conn.execute("DELETE FROM fluid_timers WHERE timer_id = ?1", params![timer_id])?;

    Ok(())
  }
}

// Your existing init_db function
fn init_db(path: &str) -> Result<Connection, rusqlite::Error> {
  let conn = Connection::open(path)?;
  conn.execute_batch(
    r#"
    CREATE TABLE IF NOT EXISTS timers (
      index_num INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at INTEGER NOT NULL
    );
    "#,
  )?;
  Ok(conn)
}
