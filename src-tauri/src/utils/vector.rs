use once_cell::sync::Lazy;
use rayon::iter::{IntoParallelIterator, ParallelBridge, ParallelIterator};
use regex::Regex;
use std::{
    fs::File,
    io::{BufRead, BufReader},
    path::Path,
};
use walkdir::WalkDir;

#[derive(Debug, Clone, serde::Serialize)]
pub struct VectorInfo {
    pub vector: Vec<f32>,
    pub file: String,
    pub line_number: usize,
}

static RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b(?:vector[234]?|vec[234]?)\(\s*(-?\d*\.?\d+)\s*(?:,\s*(-?\d*\.?\d+))?\s*(?:,\s*(-?\d*\.?\d+))?\s*(?:,\s*(-?\d*\.?\d+))?\s*\)").unwrap()
});

pub fn parse_vector(s: &str) -> Option<Vec<f32>> {
    RE.captures(s)
        .map(|caps| {
            caps.iter()
                .skip(1) // Skip full match
                .flatten()
                .filter_map(|m| m.as_str().parse().ok())
                .collect::<Vec<f32>>()
        })
        .filter(|v| (2..=4).contains(&v.len()))
}

pub fn distance(a: &[f32], b: &[f32]) -> f32 {
    a.iter()
        .zip(b.iter())
        .map(|(a, b)| (a - b).powi(2))
        .sum::<f32>()
        .sqrt()
}

pub fn extract_vectors_from_file(file_path: &Path, base_path: &Path) -> Vec<VectorInfo> {
    let file = match File::open(file_path) {
        Ok(file) => file,
        Err(_) => return Vec::new(),
    };

    let reader = BufReader::new(file);
    reader
        .lines()
        .enumerate()
        .par_bridge() // Parallel processing of lines
        .filter_map(|(line_number, line)| {
            line.ok().as_deref().and_then(|line| {
                parse_vector(line).map(|vector| VectorInfo {
                    vector,
                    file: file_path
                        .strip_prefix(base_path)
                        .unwrap()
                        .to_string_lossy()
                        .to_string(),
                    line_number,
                })
            })
        })
        .collect()
}

pub fn find_vectors_in_dir(dir: &Path) -> Vec<VectorInfo> {
    println!("Searching for vectors in: {:?}", dir);
    WalkDir::new(dir)
        .into_iter()
        .par_bridge()
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.file_type().is_file() && entry.path().extension().is_some_and(|ext| ext == "lua")
        })
        .flat_map(|entry| extract_vectors_from_file(entry.path(), dir).into_par_iter())
        .collect()
}
