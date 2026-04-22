// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use file_tree::{file_metadata, scan_markdown_tree, FileMeta, FileNode};
use tauri::Emitter;
#[cfg(target_os = "macos")]
use tauri::{Manager, WebviewWindow};
mod file_tree;
mod menu;

pub enum ToolbarThickness {
    Thick,
    Medium,
    Thin,
}
pub trait WindowExt {
    #[cfg(target_os = "macos")]
    fn set_transparent_titlebar(&self);
}
#[cfg(target_os = "macos")]
impl WindowExt for WebviewWindow {
    fn set_transparent_titlebar(&self) {
        use cocoa::appkit::{NSWindow, NSWindowTitleVisibility};
        use objc::{class, msg_send, sel, sel_impl};

        unsafe {
            let id = self.ns_window().unwrap() as cocoa::base::id;

            id.setTitlebarAppearsTransparent_(cocoa::base::YES);
            let thickness = ToolbarThickness::Medium;
            match thickness {
                ToolbarThickness::Thick => {
                    self.set_title("").ok();
                    id.setToolbar_(msg_send![class!(NSToolbar), new]);
                }
                ToolbarThickness::Medium => {
                    id.setTitleVisibility_(NSWindowTitleVisibility::NSWindowTitleHidden);
                    id.setToolbar_(msg_send![class!(NSToolbar), new]);
                }
                ToolbarThickness::Thin => {
                    id.setTitleVisibility_(NSWindowTitleVisibility::NSWindowTitleHidden);
                }
            }
        }
    }
}
#[tauri::command]
fn get_file_metadata(filepath: String) -> FileMeta {
    file_metadata(std::path::Path::new(&filepath)).unwrap_or(FileMeta {
        created_at: None,
        updated_at: None,
    })
}

#[tauri::command]
async fn scan_markdown_file_tree(root: String) -> Result<Vec<FileNode>, String> {
    tauri::async_runtime::spawn_blocking(move || scan_markdown_tree(std::path::Path::new(&root)))
        .await
        .map_err(|err| err.to_string())?
}

fn main() {
    tauri::Builder::default()
        .menu(|app| menu::os_default(app))
        .on_menu_event(|app, event| {
            if event.id() == "settings" {
                let _ = app.emit("menu://settings", ());
            }
        })
        .setup(|_app| {
            #[cfg(target_os = "macos")]
            {
                let win = _app.get_webview_window("main").unwrap();
                win.set_transparent_titlebar();
            }
            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_file_metadata,
            scan_markdown_file_tree
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
