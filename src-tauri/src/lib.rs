mod utils {
    pub mod codewalkercli;
    pub mod files;
    pub mod vector;
}

use rayon::prelude::*;
use std::path::Path;
use utils::codewalkercli::{send_command, start_codewalker, stop_codewalker, validate_gta_path};
use utils::files::{collect_files, collect_tables, filter_duplicates, get_paths_in_dir, read_file, write_file, delete_file, read_binary_file};
use utils::vector::{self, find_vectors_in_dir, VectorInfo};

#[tauri::command]
fn find_vectors_in_distance(path: String, v: Vec<f32>, dist: f32) -> Vec<VectorInfo> {
    println!("Searching for vectors in: {:?}", path);
    if path.is_empty() {
        return Vec::new();
    }
    let search_path = Path::new(&path);

    find_vectors_in_dir(search_path)
        .into_par_iter()
        .filter_map(|vec_info| {
            let d = vector::distance(&v, &vec_info.vector);
            if d <= dist {
                Some((d, vec_info))
            } else {
                None
            }
        })
        .collect::<Vec<_>>()
        .into_par_iter()
        .map(|(_, vec_info)| vec_info)
        .collect()
}

#[tauri::command]
fn find_duplicate_files(path: String, filter: Vec<String>) -> Vec<(String, Vec<String>)> {
    if path.is_empty() {
        return Vec::new();
    }
    filter_duplicates(collect_files(Path::new(&path), &filter))
}

#[tauri::command]
fn get_lua_tables(path: String, table_filter: Vec<String>) -> Vec<String> {
    if path.is_empty() {
        return Vec::new();
    }
    collect_tables(Path::new(&path), table_filter).unwrap_or_default()
}



// Main application setup
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            find_vectors_in_distance,
            find_duplicate_files,
            get_lua_tables,
            send_command,
            stop_codewalker,
            start_codewalker,
            get_paths_in_dir,
            read_file,
            write_file,
            delete_file,
            validate_gta_path,
            read_binary_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
