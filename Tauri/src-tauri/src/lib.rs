// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn startup_xlsx() -> Option<String> {
    std::env::args()
        .skip(1)
        .find(|arg| arg.to_ascii_lowercase().ends_with(".xlsx"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(
            tauri::generate_handler![
                greet,
                startup_xlsx
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
