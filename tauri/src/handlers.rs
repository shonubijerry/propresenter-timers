use crate::database::Database;
use crate::database::Timer;
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
pub fn update_timer(db: State<Database>, timer: Timer) -> Result<(), String> {
  db.update(&timer).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_timer(db: State<Database>, uuid: String) -> Result<(), String> {
  db.delete(&uuid).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_timers_paginated(db: State<Database>, limit: i32, offset: i32) -> Result<Vec<Timer>, String> {
  db.list_paginated(limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn count_timers(db: State<Database>) -> Result<i32, String> {
  db.count().map_err(|e| e.to_string())
}
