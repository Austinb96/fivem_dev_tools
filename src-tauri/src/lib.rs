use dashmap::DashMap;
use once_cell::sync::Lazy;
use rayon::prelude::*;
use regex::Regex;
use std::ffi::OsStr;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

static RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b(?:vector[234]?|vec[234]?)\(\s*(-?\d*\.?\d+)\s*(?:,\s*(-?\d*\.?\d+))?\s*(?:,\s*(-?\d*\.?\d+))?\s*(?:,\s*(-?\d*\.?\d+))?\s*\)").unwrap()
});

#[derive(Debug, Clone, serde::Serialize)]
struct VectorInfo {
    vector: Vec<f32>,
    file: String,
    line_number: usize,
}

fn parse_vector(s: &str) -> Option<Vec<f32>> {
    RE.captures(s)
        .map(|caps| {
            caps.iter()
                .skip(1) // Skip full match
                .flatten()
                .filter_map(|m| m.as_str().parse().ok())
                .collect::<Vec<_>>()
        })
        .filter(|v| (2..=4).contains(&v.len()))
}

/// Computes Euclidean distance between two vectors.
fn distance(v1: &[f32], v2: &[f32]) -> f32 {
    v1.iter()
        .zip(v2)
        .fold(0.0, |sum, (a, b)| sum + (a - b).powi(2))
        .sqrt()
}

/// **Fast recursive file collection for `.lua` files**
fn collect_lua_files(dir: &Path) -> Vec<PathBuf> {
    WalkDir::new(dir)
        .into_iter()
        .filter_map(Result::ok) // Skip errors
        .filter(|entry| entry.path().extension().is_some_and(|ext| ext == "lua"))
        .map(|entry| entry.into_path())
        .collect()
}

/// **Efficient file reading using BufReader**
fn extract_vectors_from_file(file_path: &Path) -> Vec<VectorInfo> {
    let file = match File::open(file_path) {
        Ok(file) => file,
        Err(_) => return Vec::new(), // Return empty vector instead of failing
    };

    let reader = BufReader::new(file);
    let file_name = file_path.to_string_lossy().into_owned();

    reader
        .lines()
        .enumerate()
        .filter_map(|(line_number, line)| {
            line.ok()
                .as_deref()
                .and_then(parse_vector)
                .map(|vector| VectorInfo {
                    vector,
                    file: file_name.clone(),
                    line_number: line_number + 1,
                })
        })
        .collect()
}

/// **Parallel file processing to extract vectors**
fn find_vectors_in_dir(dir: &Path) -> Vec<VectorInfo> {
    collect_lua_files(dir)
        .into_par_iter()
        .flat_map(|path| extract_vectors_from_file(path.as_path()))
        .collect()
}

#[tauri::command]
fn find_vectors_in_distance(path: String, v: Vec<f32>, dist: f32) -> Vec<VectorInfo> {
    println!("Searching for vectors in: {:?}", path);
    if path.is_empty() {
        return Vec::new();
    }
    let search_path = Path::new(&path);
    let mut vectors = find_vectors_in_dir(search_path);

    // Sort by rough distance to `v` for early filtering
    vectors.sort_by(|a, b| {
        distance(&v, &a.vector)
            .partial_cmp(&distance(&v, &b.vector))
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    vectors
        .into_par_iter()
        .filter(|vec_info| distance(&v, &vec_info.vector) <= dist)
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
