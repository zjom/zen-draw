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

const CONFIG_FILE_ENV: &str = "ZENDRAW_CONFIG_FILE";
const CONFIG_FILE_FLAG: &str = "--config-file";

/// The parsed command line: `zen-draw [--config-file <path>] [file]`.
#[derive(Debug, Default, PartialEq)]
struct Args {
    config_file: Option<PathBuf>,
    /// The first non-flag argument, so `zen-draw foo.excalidraw` opens a file.
    file: Option<String>,
}

impl Args {
    fn parse(args: impl IntoIterator<Item = String>) -> Result<Args, String> {
        let mut parsed = Args::default();
        let mut args = args.into_iter();
        while let Some(arg) = args.next() {
            if arg == CONFIG_FILE_FLAG {
                let value = args
                    .next()
                    .ok_or(format!("{CONFIG_FILE_FLAG} needs a path"))?;
                parsed.config_file = Some(value.into());
            } else if let Some(value) = arg.strip_prefix("--config-file=") {
                parsed.config_file = Some(value.into());
            } else if !arg.starts_with('-') && parsed.file.is_none() {
                parsed.file = Some(arg);
            }
        }
        Ok(parsed)
    }

    fn from_env() -> Result<Args, String> {
        Args::parse(std::env::args().skip(1))
    }
}

/// The platform config dir joined with `zen-draw`: `$XDG_CONFIG_HOME` or `~/.config` on Linux,
/// `~/Library/Application Support` on macOS and `%APPDATA%` on Windows.
fn config_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join(APP_DIR))
}

/// `$XDG_CONFIG_HOME/zen-draw`, falling back to `~/.config/zen-draw`.
#[cfg(target_os = "macos")]
fn xdg_config_dir() -> Option<PathBuf> {
    std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        // The XDG spec says relative paths must be ignored.
        .filter(|p| p.is_absolute())
        .or_else(|| dirs::home_dir().map(|h| h.join(".config")))
        .map(|d| d.join(APP_DIR))
}

/// The config file in the config dir. On macOS, the XDG file is used if it exists,
/// so a config shared with Linux in `~/.config` works too.
fn default_config_file() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    if let Some(file) = xdg_config_dir()
        .map(|d| d.join(CONFIG_FILE))
        .filter(|f| f.exists())
    {
        return Some(file);
    }
    config_dir().map(|d| d.join(CONFIG_FILE))
}

/// The config file and whether it was given explicitly.
/// `--config-file` takes precedence over `$ZENDRAW_CONFIG_FILE`, which takes precedence over the config dir.
fn config_path(args: &Args) -> Option<(PathBuf, bool)> {
    args.config_file
        .clone()
        .or_else(|| {
            std::env::var_os(CONFIG_FILE_ENV)
                .filter(|v| !v.is_empty())
                .map(PathBuf::from)
        })
        .map(|p| (p, true))
        .or_else(|| default_config_file().map(|f| (f, false)))
}

#[tauri::command]
fn load_config() -> Result<LoadedConfig, String> {
    let args = Args::from_env()?;
    let Some((path, explicit)) = config_path(&args) else {
        return Ok(LoadedConfig {
            path: None,
            config: Config::default(),
        });
    };
    let path = std::path::absolute(&path).unwrap_or(path);
    let config = match fs::read_to_string(&path) {
        Ok(text) => toml::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?,
        // A missing file in the config dir means no config, but a file asked for by name must exist.
        Err(e) if e.kind() == std::io::ErrorKind::NotFound && !explicit => Config::default(),
        Err(e) => return Err(format!("{}: {e}", path.display())),
    };
    Ok(LoadedConfig {
        path: Some(path.display().to_string()),
        config,
    })
}

/// A bad command line is reported by `load_config`.
#[tauri::command]
fn initial_file() -> Option<String> {
    Args::from_env().ok()?.file
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

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(args: &[&str]) -> Result<Args, String> {
        Args::parse(args.iter().map(|a| a.to_string()))
    }

    #[test]
    fn parses_config_file_flag() {
        let expected = Args {
            config_file: Some("c.toml".into()),
            file: Some("a.excalidraw".into()),
        };
        assert_eq!(
            parse(&["--config-file", "c.toml", "a.excalidraw"]),
            Ok(expected)
        );
        let expected = Args {
            config_file: Some("c.toml".into()),
            file: Some("a.excalidraw".into()),
        };
        assert_eq!(
            parse(&["a.excalidraw", "--config-file=c.toml"]),
            Ok(expected)
        );
    }

    #[test]
    fn config_file_value_is_not_the_file() {
        assert_eq!(parse(&["--config-file", "c.toml"]).unwrap().file, None);
    }

    #[test]
    fn config_file_flag_needs_a_value() {
        assert!(parse(&["--config-file"]).is_err());
    }

    #[test]
    fn flag_wins_over_default() {
        let args = Args {
            config_file: Some("c.toml".into()),
            file: None,
        };
        assert_eq!(config_path(&args), Some(("c.toml".into(), true)));
    }
}
