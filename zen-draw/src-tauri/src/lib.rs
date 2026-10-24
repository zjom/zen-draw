use std::{collections::HashMap, fs, path::PathBuf};

use serde::{Deserialize, Serialize};

const APP_DIR: &str = "zen-draw";
const CONFIG_FILE: &str = "config.toml";

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
struct Config {
    keys: Keys,
    ring: Ring,
    theme: Theme,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
struct Theme {
    /// A missing mode keeps the default (dark).
    #[serde(skip_serializing_if = "Option::is_none")]
    mode: Option<ThemeMode>,
    light: Palette,
    dark: Palette,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
enum ThemeMode {
    Light,
    Dark,
    System,
}

/// The colors of one theme mode, as shown on screen. A missing color keeps the default.
/// The frontend checks the values.
#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
struct Palette {
    #[serde(skip_serializing_if = "Option::is_none")]
    accent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    surface: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    border: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    selection: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    canvas: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    grid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    grid_bold: Option<String>,
    /// Any Excalidraw CSS variable, without the leading `--`.
    vars: HashMap<String, String>,
}

/// The command ids of the tool ring (at most 8 each). A missing list keeps the default.
#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
struct Ring {
    #[serde(skip_serializing_if = "Option::is_none")]
    items: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    more: Option<Vec<String>>,
}

/// Maps zenboard command ids (`tool.*`, action names, `ui.*`, `host.*`) to key combinations.
/// An empty string removes all key combinations of the command.
type Keys = HashMap<String, String>;

#[derive(Serialize)]
struct LoadedConfig {
    /// Where the config was looked for, whether or not it exists.
    path: Option<String>,
    config: Config,
}

/// `$XDG_CONFIG_HOME/zen-draw`, falling back to `~/.config/zen-draw`.
/// Deliberately the same on every OS rather than the platform-native config dir.
fn config_dir() -> Option<PathBuf> {
    std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        // The XDG spec says relative paths must be ignored.
        .filter(|p| p.is_absolute())
        .or_else(|| std::env::home_dir().map(|h| h.join(".config")))
        .map(|d| d.join(APP_DIR))
}

#[tauri::command]
fn load_config() -> Result<LoadedConfig, String> {
    let Some(path) = config_dir().map(|d| d.join(CONFIG_FILE)) else {
        return Ok(LoadedConfig { path: None, config: Config::default() });
    };
    let config = match fs::read_to_string(&path) {
        Ok(text) => toml::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Config::default(),
        Err(e) => return Err(format!("{}: {e}", path.display())),
    };
    Ok(LoadedConfig { path: Some(path.display().to_string()), config })
}

/// The first non-flag CLI argument, so `zen-draw foo.excalidraw` opens a file.
#[tauri::command]
fn initial_file() -> Option<String> {
    std::env::args().skip(1).find(|a| !a.starts_with('-'))
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| format!("{path}: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_config,
            initial_file,
            read_file,
            write_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
