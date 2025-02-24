
use dashmap::DashMap;
use rayon::prelude::*;
use walkdir::WalkDir;
use std::ffi::OsStr;
use std::path::Path;
use utils::vector::{self, VectorInfo, find_vectors_in_dir};

mod utils{
    pub mod vector;
}

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
    let search_path = Path::new(&path);
    let file_map = DashMap::new();
    WalkDir::new(search_path)
        .into_iter()
        .par_bridge()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file()) // Skip directories
        .filter_map(|entry| {
            let path = entry.path();
            let file_name = path.file_name()?.to_str()?;
            let file_path = path.strip_prefix(search_path).ok()?.to_string_lossy();

            // Check extension filter
            if filter.is_empty()
                || filter
                    .iter()
                    .any(|ext| path.extension().and_then(OsStr::to_str) == Some(ext))
            {
                Some((file_name.to_string(), file_path.to_string()))
            } else {
                None
            }
        })
        .for_each(|(file_name, file_path)| {
            file_map
                .entry(file_name)
                .or_insert_with(Vec::new)
                .push(file_path);
        });

    let mut results: Vec<(String, Vec<String>)> = file_map
        .into_iter()
        .filter(|(_, paths)| paths.len() > 1)
        .collect();

    // Sort the results by file name
    results.sort_by(|a, b| a.0.cmp(&b.0));

    // Also sort paths inside each entry
    for (_, paths) in &mut results {
        paths.sort();
    }

    results
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            find_vectors_in_distance,
            find_duplicate_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
