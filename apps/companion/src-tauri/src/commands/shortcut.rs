use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

#[tauri::command]
pub fn register_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;

    if shortcut.is_empty() {
        return Ok(());
    }

    app.global_shortcut()
        .on_shortcut(shortcut.as_str(), |app_handle, _sc, event| {
            if event.state() == ShortcutState::Pressed {
                crate::tray::toggle_near_tray(app_handle);
            }
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}
