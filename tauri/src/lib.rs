use tauri::{
  menu::{Menu, MenuItemBuilder, SubmenuBuilder},
  Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // ----- Build Menu -----
      let quit = MenuItemBuilder::new("Quit")
        .id("quit")
        .accelerator("CmdOrCtrl+Q")
        .build(app)?;

      let file_menu = SubmenuBuilder::new(app, "File")
        .item(&quit)
        .build()?;

      let menu = Menu::with_items(app, &[&file_menu])?;
      app.set_menu(menu)?;

      // ----- Plugins -----
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Debug)
            .build(),
        )?;
      }

      #[cfg(desktop)]
      app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

      Ok(())
    })
    .plugin(tauri_plugin_fs::init())

    // ----- Quit menu -----
    .on_menu_event(|app_handle, event| {
      match event.id().as_ref() {
        "quit" => {
          // Close all windows in Tauri 2
          for w in app_handle.webview_windows().values() {
            let _ = w.close();
          }
          std::process::exit(0);
        }
        _ => {}
      }
    })

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
