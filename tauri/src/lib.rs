use tauri::Manager;
mod database;
mod handlers;

use crate::database::Database;
use crate::handlers::{
  count_timers, create_timer, delete_timer, get_timer, list_timers, list_timers_paginated,
  update_timer,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let app_dir = app
        .handle()
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");

      // Create app data directory if it doesn't exist
      std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");

      // ----- Plugins -----
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Debug)
            .build(),
        )?;
      }

      #[cfg(desktop)]
      app
        .handle()
        .plugin(tauri_plugin_updater::Builder::new().build())?;

      // Get the path resolver from app handle
      let database = Database::new(app_dir.join("timers.db").to_str().unwrap())
        .expect("failed to initialize database");

      // Manage the database state
      app.manage(database);

      Ok(())
    })
    .plugin(tauri_plugin_fs::init())
    // ----- 🔥 KEY FIX: Close ALL windows on ANY window CloseRequest -----
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let app = window.app_handle();
        let label = window.label();
        let is_main = label == "main";

        if is_main {
          api.prevent_close();
          // ----- Main window is being closed -----
          for (win_label, w) in app.webview_windows().iter() {
            if win_label != "main" {
              let _ = w.close();
            }
          }

          // Now exit whole app
          std::process::exit(0);
        } else {
          // let default behavior happen
          println!("Secondary window '{}' is closing.", label);
        }
      }
    })
    .invoke_handler(tauri::generate_handler![
      list_timers,
      get_timer,
      create_timer,
      update_timer,
      delete_timer,
      list_timers_paginated,
      count_timers
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
