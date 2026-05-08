//! Commandes système transverses (info OS, ouverture de fichiers, fenêtre,
//! diagnostics réseau / hardware / runtimes / processus). Réutilisables par
//! tous les outils.
//!
//! Les diagnostics matériels (`gpus`, `javas`, `dns_servers`, MAC) reposent
//! sur `wmic`/`ipconfig`/`reg query` parsés en best-effort : si une commande
//! externe échoue, le champ correspondant reste vide et le frontend affiche
//! "indisponible" plutôt qu'un crash.

use serde::Serialize;
use std::collections::HashSet;
use std::path::PathBuf;
use std::process::Command;
use sysinfo::{Pid, ProcessesToUpdate, System};

use crate::error::{ToolError, ToolResult};

#[tauri::command]
pub fn is_production_build() -> bool {
    !cfg!(debug_assertions)
}

#[tauri::command]
pub fn set_always_on_top(window: tauri::WebviewWindow, value: bool) -> ToolResult<()> {
    window
        .set_always_on_top(value)
        .map_err(|e| ToolError::Message(e.to_string()))
}

#[tauri::command]
pub fn open_file_or_url(path: String) -> ToolResult<()> {
    if path.contains("&&") || path.contains('|') || path.contains(';') || path.contains('`') {
        return Err(ToolError::InvalidInput("chemin invalide".into()));
    }
    std::process::Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_in_paint(path: String) -> ToolResult<()> {
    if !path.ends_with(".png") && !path.ends_with(".jpg") && !path.ends_with(".bmp") {
        return Err(ToolError::InvalidInput(
            "format d'image non supporté".into(),
        ));
    }
    std::process::Command::new("mspaint")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
pub struct DiskInfo {
    pub name: String,
    pub total_gb: f64,
    pub free_gb: f64,
}

#[derive(Serialize)]
pub struct GpuInfo {
    pub name: String,
    pub driver: String,
}

#[derive(Serialize)]
pub struct JavaInfo {
    pub path: String,
    pub version: String,
}

#[derive(Serialize)]
pub struct SysInfoResult {
    pub hostname: String,
    pub os: String,
    pub cpu: String,
    pub ram_gb: f64,
    pub disks: Vec<DiskInfo>,
    pub local_ips: Vec<String>,
    pub mac_addresses: Vec<String>,
    pub dns_servers: Vec<String>,
    pub gpus: Vec<GpuInfo>,
    pub javas: Vec<JavaInfo>,
    pub app_version: String,
}

#[tauri::command]
pub fn get_system_info() -> SysInfoResult {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".into());
    let cpu_cores = sys.cpus().len();
    let cpu_freq = sys.cpus().first().map(|c| c.frequency()).unwrap_or(0);
    let cpu = format!("{} ({} cores, {} MHz)", cpu_brand, cpu_cores, cpu_freq);

    let ram_gb = sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0;
    let os = System::long_os_version().unwrap_or_else(|| "Unknown OS".into());
    let hostname = System::host_name().unwrap_or_else(|| "Unknown".into());

    let disks = sysinfo::Disks::new_with_refreshed_list()
        .iter()
        .map(|d| DiskInfo {
            name: d.mount_point().display().to_string(),
            total_gb: d.total_space() as f64 / 1024.0 / 1024.0 / 1024.0,
            free_gb: d.available_space() as f64 / 1024.0 / 1024.0 / 1024.0,
        })
        .collect();

    let local_ips = collect_local_ips();
    let ipconfig_text = run_ipconfig();
    let mac_addresses = parse_macs(&ipconfig_text);
    let dns_servers = parse_dns(&ipconfig_text);
    let gpus = collect_gpus();
    let javas = collect_javas();
    let app_version = env!("CARGO_PKG_VERSION").to_string();

    SysInfoResult {
        hostname,
        os,
        cpu,
        ram_gb,
        disks,
        local_ips,
        mac_addresses,
        dns_servers,
        gpus,
        javas,
        app_version,
    }
}

fn collect_local_ips() -> Vec<String> {
    let mut ips: Vec<String> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    if let Ok(list) = local_ip_address::list_afinet_netifas() {
        for (_iface, ip) in list {
            if ip.is_loopback() {
                continue;
            }
            let s = ip.to_string();
            if seen.insert(s.clone()) {
                ips.push(s);
            }
        }
    }
    ips
}

fn run_ipconfig() -> String {
    let output = Command::new("ipconfig").arg("/all").output().ok();
    match output {
        Some(o) if o.status.success() => String::from_utf8_lossy(&o.stdout).into_owned(),
        _ => String::new(),
    }
}

fn parse_macs(ipconfig: &str) -> Vec<String> {
    let mut macs: Vec<String> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    for raw in ipconfig.lines() {
        let line = raw.trim();
        if line.contains("Physical Address")
            || line.contains("Adresse physique")
        {
            if let Some(idx) = line.find(':') {
                let val = line[idx + 1..].trim().to_string();
                if val.len() == 17 && val.chars().filter(|c| *c == '-' || *c == ':').count() == 5 {
                    if seen.insert(val.clone()) {
                        macs.push(val);
                    }
                }
            }
        }
    }
    macs
}

fn parse_dns(ipconfig: &str) -> Vec<String> {
    let mut dns: Vec<String> = Vec::new();
    let mut in_dns = false;
    for raw in ipconfig.lines() {
        let line = raw.trim();
        if line.contains("DNS Servers") || line.contains("Serveurs DNS") {
            if let Some(idx) = line.find(':') {
                let val = line[idx + 1..].trim().to_string();
                if looks_like_ip(&val) {
                    dns.push(val);
                }
            }
            in_dns = true;
            continue;
        }
        if in_dns {
            if (raw.starts_with(' ') || raw.starts_with('\t')) && looks_like_ip(line) {
                dns.push(line.to_string());
                continue;
            }
            in_dns = false;
        }
    }
    dns.sort();
    dns.dedup();
    dns
}

fn looks_like_ip(s: &str) -> bool {
    if s.is_empty() {
        return false;
    }
    let dots = s.chars().filter(|&c| c == '.').count();
    let colons = s.chars().filter(|&c| c == ':').count();
    (dots >= 3 || colons >= 2)
        && s.chars()
            .all(|c| c.is_ascii_hexdigit() || c == '.' || c == ':' || c == '%')
}

fn collect_gpus() -> Vec<GpuInfo> {
    let Ok(output) = Command::new("wmic")
        .args([
            "path",
            "Win32_VideoController",
            "get",
            "Name,DriverVersion",
            "/format:csv",
        ])
        .output()
    else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let mut headers: Vec<String> = Vec::new();
    let mut gpus: Vec<GpuInfo> = Vec::new();
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let cols: Vec<&str> = line.split(',').map(|c| c.trim()).collect();
        if headers.is_empty() {
            headers = cols.iter().map(|s| s.to_lowercase()).collect();
            continue;
        }
        let driver_idx = headers.iter().position(|h| h == "driverversion");
        let name_idx = headers.iter().position(|h| h == "name");
        let name = name_idx.and_then(|i| cols.get(i)).copied().unwrap_or("");
        let driver = driver_idx.and_then(|i| cols.get(i)).copied().unwrap_or("");
        if !name.is_empty() {
            gpus.push(GpuInfo {
                name: name.to_string(),
                driver: driver.to_string(),
            });
        }
    }
    gpus
}

fn collect_javas() -> Vec<JavaInfo> {
    let mut found: Vec<JavaInfo> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();

    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        candidates.push(PathBuf::from(java_home).join("bin").join("java.exe"));
    }
    for env in ["ProgramFiles", "ProgramFiles(x86)", "ProgramW6432"] {
        if let Ok(base) = std::env::var(env) {
            for vendor in [
                "Java",
                "Eclipse Adoptium",
                "Eclipse Foundation",
                "Microsoft",
                "Zulu",
            ] {
                let dir = PathBuf::from(&base).join(vendor);
                if let Ok(entries) = std::fs::read_dir(&dir) {
                    for entry in entries.flatten() {
                        let path = entry.path().join("bin").join("java.exe");
                        if path.exists() {
                            candidates.push(path);
                        }
                    }
                }
            }
        }
    }

    for path in candidates {
        let key = path.display().to_string();
        if !seen.insert(key.clone()) {
            continue;
        }
        let version = run_java_version(&path).unwrap_or_else(|| "?".into());
        found.push(JavaInfo {
            path: key,
            version,
        });
    }

    found
}

fn run_java_version(path: &PathBuf) -> Option<String> {
    let output = Command::new(path).arg("-version").output().ok()?;
    let combined = format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    for line in combined.lines() {
        if let Some(start) = line.find('"') {
            if let Some(end) = line[start + 1..].find('"') {
                return Some(line[start + 1..start + 1 + end].to_string());
            }
        }
    }
    None
}

#[derive(Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_pct: f32,
    pub mem_mb: u64,
}

#[tauri::command]
pub fn list_top_processes(limit: usize) -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    // Premier refresh donne 0% CPU pour tous → un 2e refresh après 200ms
    // calcule un delta réaliste sur cette fenêtre.
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let mut procs: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .filter(|(pid, _)| pid.as_u32() != 0)
        .map(|(pid, p)| ProcessInfo {
            pid: pid.as_u32(),
            name: p.name().to_string_lossy().to_string(),
            cpu_pct: p.cpu_usage(),
            mem_mb: p.memory() / 1024 / 1024,
        })
        .collect();

    procs.sort_by(|a, b| {
        b.cpu_pct
            .partial_cmp(&a.cpu_pct)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(b.mem_mb.cmp(&a.mem_mb))
    });
    procs.truncate(limit.max(1));
    procs
}

#[tauri::command]
pub fn kill_process(pid: u32) -> ToolResult<()> {
    if pid == 0 {
        return Err(ToolError::InvalidInput("invalid pid".into()));
    }
    let current_pid = std::process::id();
    if pid == current_pid {
        return Err(ToolError::InvalidInput("refusing to kill self".into()));
    }
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    let process = sys
        .process(Pid::from_u32(pid))
        .ok_or_else(|| ToolError::NotFound(format!("pid {pid}")))?;
    if !process.kill() {
        return Err(ToolError::Message(format!("failed to kill {pid}")));
    }
    Ok(())
}

#[tauri::command]
pub async fn get_public_ip() -> ToolResult<String> {
    // PowerShell évite d'ajouter reqwest comme dépendance HTTP. Si PowerShell
    // n'est pas disponible / blocage réseau / timeout, on renvoie une erreur
    // que le frontend traduit par "indisponible".
    let output = tauri::async_runtime::spawn_blocking(|| {
        std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "(Invoke-WebRequest -UseBasicParsing -TimeoutSec 4 -Uri 'https://api.ipify.org').Content",
            ])
            .output()
    })
    .await
    .map_err(|e| ToolError::Message(format!("join error: {e}")))?
    .map_err(|e| ToolError::Message(format!("ipv4 lookup: {e}")))?;
    if !output.status.success() {
        return Err(ToolError::Message("public ip lookup failed".into()));
    }
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if text.is_empty() {
        return Err(ToolError::Message("empty response".into()));
    }
    Ok(text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn looks_like_ip_accepts_ipv4_ipv6() {
        assert!(looks_like_ip("192.168.1.1"));
        assert!(looks_like_ip("8.8.8.8"));
        assert!(looks_like_ip("fe80::1"));
        assert!(!looks_like_ip("hello"));
        assert!(!looks_like_ip(""));
    }

    #[test]
    fn list_top_processes_excludes_pid_zero() {
        let procs = list_top_processes(20);
        assert!(procs.iter().all(|p| p.pid != 0));
        assert!(!procs.is_empty());
    }
}
