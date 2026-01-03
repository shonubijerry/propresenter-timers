use tauri::Manager;

mod migrations;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Debug)
        .build(),
    )
    .plugin(tauri_plugin_sql::Builder::new().build())
    .setup(|app| {
      // ----- Plugins -----
      #[cfg(desktop)]
      app
        .handle()
        .plugin(tauri_plugin_updater::Builder::new().build())?;

      Ok(())
    })
    .plugin(tauri_plugin_fs::init())
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:timersv2.db", migrations::get_migrations())
        .build(),
    )
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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
