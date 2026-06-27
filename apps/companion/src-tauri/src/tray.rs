use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, Runtime,
};

// Mini window dimensions in logical pixels (must match JS constants)
const MINI_W_LOGICAL: f64 = 300.0;
const MINI_H_LOGICAL: f64 = 350.0;

// Onboarding window dimensions in logical pixels (must match JS constants)
const ONBOARDING_W_LOGICAL: f64 = 460.0;
const ONBOARDING_H_LOGICAL: f64 = 560.0;

pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let open_i = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
    let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let sep = tauri::menu::PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open_i, &settings_i, &sep, &quit_i])?;

    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("html-hoster Companion")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_window(app),
            "settings" => {
                show_window(app);
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.emit("navigate", "settings");
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                position,
                ..
            } = event
            {
                let app = tray.app_handle();
                let is_visible = app
                    .get_webview_window("main")
                    .map(|w| w.is_visible().unwrap_or(false))
                    .unwrap_or(false);

                if !is_visible {
                    if onboarding_completed(app) {
                        position_near_tray(app, position.x, position.y);
                        toggle_window(app);
                    } else {
                        show_for_onboarding(app);
                    }
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.emit("tray-open", ());
                    }
                } else {
                    toggle_window(app);
                }
            }
        })
        .build(app)?;

    Ok(())
}

fn onboarding_completed<R: Runtime>(app: &AppHandle<R>) -> bool {
    use tauri_plugin_store::StoreExt;
    app.store("settings.json")
        .ok()
        .and_then(|store| store.get("onboarding_completed"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
}

fn show_for_onboarding<R: Runtime>(app: &AppHandle<R>) {
    let Some(win) = app.get_webview_window("main") else {
        return;
    };
    let _ = win.set_size(LogicalSize::new(ONBOARDING_W_LOGICAL, ONBOARDING_H_LOGICAL));
    let _ = win.center();
    let _ = win.show();
    let _ = win.set_focus();
}

pub(crate) fn position_near_tray<R: Runtime>(app: &AppHandle<R>, tray_x: f64, tray_y: f64) {
    let Some(win) = app.get_webview_window("main") else {
        return;
    };

    let scale = win.scale_factor().unwrap_or(1.0);
    let w = MINI_W_LOGICAL * scale;
    let h = MINI_H_LOGICAL * scale;
    let margin = 8.0 * scale;

    let (x, y) = if let Ok(monitors) = win.available_monitors() {
        let monitor = monitors
            .iter()
            .find(|m| {
                let mp = m.position();
                let ms = m.size();
                tray_x >= mp.x as f64
                    && tray_x <= mp.x as f64 + ms.width as f64
                    && tray_y >= mp.y as f64
                    && tray_y <= mp.y as f64 + ms.height as f64
            })
            .or_else(|| monitors.first());

        if let Some(m) = monitor {
            let mp = m.position();
            let ms = m.size();

            let cx = (tray_x - w / 2.0)
                .max(mp.x as f64)
                .min(mp.x as f64 + ms.width as f64 - w);

            // Bottom half of screen = Windows taskbar → go above icon
            // Top half = macOS menu bar → go below
            let cy = if tray_y > mp.y as f64 + ms.height as f64 / 2.0 {
                tray_y - h - margin
            } else {
                tray_y + margin
            };

            (cx as i32, cy as i32)
        } else {
            ((tray_x - w / 2.0) as i32, (tray_y - h - margin) as i32)
        }
    } else {
        ((tray_x - w / 2.0) as i32, (tray_y - h - margin) as i32)
    };

    let _ = win.set_position(PhysicalPosition::new(x, y));
}

fn show_as_mini<R: Runtime>(win: &tauri::WebviewWindow<R>) {
    let _ = win.set_size(LogicalSize::new(MINI_W_LOGICAL, MINI_H_LOGICAL));
    let _ = win.show();
    let _ = win.set_focus();
}

fn show_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        show_as_mini(&win);
    }
}

pub(crate) fn toggle_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            show_as_mini(&win);
        }
    }
}

pub(crate) fn toggle_near_tray<R: Runtime>(app: &AppHandle<R>) {
    let Some(win) = app.get_webview_window("main") else {
        return;
    };

    if win.is_visible().unwrap_or(false) {
        let _ = win.emit("window-hide", ());
        let _ = win.hide();
        return;
    }

    if let Some(tray) = app.tray_by_id("main") {
        if let Ok(Some(rect)) = tray.rect() {
            let (px, py) = match rect.position {
                tauri::Position::Physical(p) => (p.x as f64, p.y as f64),
                tauri::Position::Logical(p) => (p.x, p.y),
            };
            let (pw, ph) = match rect.size {
                tauri::Size::Physical(s) => (s.width as f64, s.height as f64),
                tauri::Size::Logical(s) => (s.width, s.height),
            };
            position_near_tray(app, px + pw / 2.0, py + ph / 2.0);
        }
    }

    show_as_mini(&win);
    let _ = win.emit("tray-open", ());
}
