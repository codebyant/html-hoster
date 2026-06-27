mod commands;
mod tray;

use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Hide from macOS dock — tray-only app
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            tray::setup_tray(app.handle())?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Prevent actual close; just hide the window
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.emit("window-hide", ());
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::secure_storage::get_api_key,
            commands::secure_storage::set_api_key,
            commands::secure_storage::delete_api_key,
            commands::window::resize_window,
            commands::window::expand_window,
            commands::shortcut::register_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
