use dashmap::DashMap;
use rayon::prelude::*;
use rlua::{Lua, Value};
use std::ffi::OsStr;
use std::path::Path;
use std::fs;
use walkdir::WalkDir;

pub fn collect_files(search_path: &Path, filter: &[String]) -> DashMap<String, Vec<String>> {
    let file_map = DashMap::new();

    WalkDir::new(search_path)
        .into_iter()
        .par_bridge()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| {
            let path = entry.path();
            let file_name = path.file_name()?.to_str()?;
            let file_path = path
                .strip_prefix(search_path)
                .ok()?
                .to_string_lossy()
                .to_string();

            if filter.is_empty()
                || filter
                    .iter()
                    .any(|ext| path.extension().and_then(OsStr::to_str) == Some(ext))
            {
                Some((file_name.to_string(), file_path))
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

    file_map
}

pub fn filter_duplicates(file_map: DashMap<String, Vec<String>>) -> Vec<(String, Vec<String>)> {
    let mut results: Vec<(String, Vec<String>)> = file_map
        .into_iter()
        .filter(|(_, paths)| paths.len() > 1)
        .collect();

    results.sort_by(|a, b| a.0.cmp(&b.0));

    for (_, paths) in &mut results {
        paths.sort();
    }

    results
}

pub fn collect_tables(
    file_path: &Path,
    table_filter: Vec<String>,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(file_path)?;
    let lua = Lua::new();
    let mut table_names = Vec::new();

    let globals = lua.globals();
    lua.load(&content).exec()?;

    for table_name in table_filter {
        let table: Value = globals.get::<_, Value>(table_name.as_str())?;
        if table.is_table() {
            table_names.push(table_name);
        }
    }

    Ok(table_names)
}

#[tauri::command]
pub fn get_paths_in_dir(path: &str) -> Result<Vec<String>, String> {
    println!("__________________________");
    println!("searching path: {:?}", path);

    let parent = match path.rfind('/') {
        Some(index) => &path[..=index],
        None => ".",
    };

    println!("parent dir: {:?}", parent);
    let search_path = Path::new(parent);

    if !search_path.exists() {
        return Ok(Vec::new());
    }

    let mut paths = Vec::new();
    println!("paths: {:?}", paths);

    match fs::read_dir(search_path) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        let path_str = path.to_string_lossy().to_string();
                        paths.push(path_str);
                    }
                    Err(e) => {
                        return Err(e.to_string());
                    }
                }
            }
        }
        Err(e) => {
            return Err(e.to_string());
        }
    }
    paths.sort();

    println!("sorted paths: {:?}", paths);
    Ok(paths)
}

#[tauri::command]
pub fn read_file(path: &str) -> Result<String, String> {
    match fs::read_to_string(path) {
        Ok(content) => Ok(content),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn write_file(path: &str, content: &str) -> Result<(), String> {
    match fs::write(path, content) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn delete_file(path: &str) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
