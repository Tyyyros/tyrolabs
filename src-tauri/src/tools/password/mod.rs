//! Outil "password generator" : pas d'état persistant, deux commandes pures
//! (random charset & passphrase). Strength meter via `zxcvbn`.

pub mod commands;
mod wordlist;

pub use commands::*;
