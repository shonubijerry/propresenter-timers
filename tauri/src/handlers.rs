use crate::database::Database;
use crate::database::{PartialTimer, Timer, FluidTimer};
use tauri::State;

#[tauri::command]
pub fn create_timer(db: State<Database>, timer: Timer) -> Result<(), String> {
  db.create(&timer).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_timer(db: State<Database>, uuid: String) -> Result<Option<Timer>, String> {
  db.get(&uuid).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_timers(db: State<Database>) -> Result<Vec<Timer>, String> {
  db.list().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_timer(db: State<Database>, timer: PartialTimer) -> Result<(), String> {
  db.update(&timer).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_timer(db: State<Database>, uuid: String) -> Result<(), String> {
  db.delete(&uuid).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_timers_paginated(
  db: State<Database>,
  limit: i32,
  offset: i32,
) -> Result<Vec<Timer>, String> {
  db.list_paginated(limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn count_timers(db: State<Database>) -> Result<i32, String> {
  db.count().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_fluid_timer(db: State<Database>, timer_id: String, created_at: i64) -> Result<(), String> {
  db.insert_fluid_timer(&timer_id, created_at).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_fluid_timers(db: State<Database>) -> Result<Vec<FluidTimer>, String> {
  db.list_fluid().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_fluid_timer(db: State<Database>, timer_id: String) -> Result<(), String> {
  db.delete_fluid(&timer_id).map_err(|e| e.to_string())
}
