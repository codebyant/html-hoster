use tauri::{LogicalSize, PhysicalPosition, WebviewWindow};

#[tauri::command]
pub fn resize_window(window: WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|e| e.to_string())
}

/// Resize and reposition so the window stays fully on-screen.
/// If the new height would push the bottom off the monitor, the window is
/// moved up just enough to fit (with an 8-logical-pixel margin from edges).
#[tauri::command]
pub fn expand_window(window: WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    let new_h_phys = (height * scale) as i32;
    let margin = (8.0 * scale) as i32;

    let new_y = if let Ok(monitors) = window.available_monitors() {
        let monitor = monitors
            .iter()
            .find(|m| {
                let mp = m.position();
                let ms = m.size();
                pos.x >= mp.x
                    && pos.x <= mp.x + ms.width as i32
                    && pos.y >= mp.y
                    && pos.y <= mp.y + ms.height as i32
            })
            .or_else(|| monitors.first());

        if let Some(m) = monitor {
            let mp = m.position();
            let ms = m.size();
            let monitor_bottom = mp.y + ms.height as i32;

            if pos.y + new_h_phys + margin > monitor_bottom {
                // Would overflow — align bottom of window to just above taskbar
                (monitor_bottom - new_h_phys - margin).max(mp.y)
            } else {
                pos.y
            }
        } else {
            pos.y
        }
    } else {
        pos.y
    };

    // Move first so resize doesn't flash off-screen
    window
        .set_position(PhysicalPosition::new(pos.x, new_y))
        .map_err(|e| e.to_string())?;
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|e| e.to_string())
}
