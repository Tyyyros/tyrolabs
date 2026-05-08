//! Commandes Tauri du générateur de mot de passe.
//!
//! Deux modes :
//! - `generate_password` : chaîne aléatoire à partir de classes de caractères
//!   configurables (majuscules / minuscules / chiffres / symboles).
//! - `generate_passphrase` : phrase mémorisable construite à partir de la
//!   wordlist embarquée (cf. `wordlist.rs`), avec capitalisation et
//!   chiffres/symbole optionnels.
//!
//! La force est mesurée par `zxcvbn` (score 0-4) et l'entropie par la formule
//! théorique `length * log2(charset)` ou `word_count * log2(wordlist)`.

use rand::rngs::OsRng;
use rand::seq::SliceRandom;
use rand::{Rng, RngCore};
use serde::{Deserialize, Serialize};

use crate::error::{ToolError, ToolResult};
use crate::tools::password::wordlist::WORDS;

const UPPER: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER: &str = "abcdefghijklmnopqrstuvwxyz";
const DIGITS: &str = "0123456789";
const SYMBOLS: &str = "!@#$%^&*()-_=+[]{};:,.<>?/";
/// Caractères ambigus visuellement filtrés sur option.
const AMBIGUOUS: &[char] = &['l', '1', 'I', 'O', '0', 'o'];

#[derive(Deserialize, Debug, Default)]
pub struct PasswordOpts {
    pub length: u32,
    pub upper: bool,
    pub lower: bool,
    pub digits: bool,
    pub symbols: bool,
    #[serde(default)]
    pub extra_chars: String,
    #[serde(default)]
    pub exclude_ambiguous: bool,
}

#[derive(Deserialize, Debug)]
pub struct PassphraseOpts {
    pub word_count: u32,
    pub separator: String,
    pub capitalize: bool,
    pub append_digits: bool,
    pub append_symbol: bool,
}

#[derive(Serialize, Debug)]
pub struct PasswordResult {
    pub value: String,
    pub entropy_bits: f64,
    pub score: u8,
}

#[tauri::command]
pub fn generate_password(opts: PasswordOpts) -> ToolResult<PasswordResult> {
    if !(4..=128).contains(&opts.length) {
        return Err(ToolError::InvalidInput(
            "length must be between 4 and 128".into(),
        ));
    }
    if !opts.upper && !opts.lower && !opts.digits && !opts.symbols && opts.extra_chars.is_empty() {
        return Err(ToolError::InvalidInput(
            "at least one character class must be enabled".into(),
        ));
    }

    let charset = build_charset(&opts);
    if charset.is_empty() {
        return Err(ToolError::InvalidInput(
            "character set is empty after filtering".into(),
        ));
    }

    let mut rng = OsRng;
    let value: String = (0..opts.length)
        .map(|_| charset[rng.gen_range(0..charset.len())])
        .collect();

    let entropy_bits = (charset.len() as f64).log2() * opts.length as f64;
    let score = score_password(&value);
    Ok(PasswordResult {
        value,
        entropy_bits,
        score,
    })
}

#[tauri::command]
pub fn generate_passphrase(opts: PassphraseOpts) -> ToolResult<PasswordResult> {
    if !(3..=10).contains(&opts.word_count) {
        return Err(ToolError::InvalidInput(
            "word_count must be between 3 and 10".into(),
        ));
    }
    let mut rng = OsRng;
    let separator = if opts.separator.is_empty() {
        "-".to_string()
    } else {
        opts.separator
    };

    let mut parts: Vec<String> = (0..opts.word_count)
        .map(|_| {
            let w: &&str = WORDS.choose(&mut rng).expect("wordlist non-empty");
            if opts.capitalize {
                capitalize(w)
            } else {
                (*w).to_string()
            }
        })
        .collect();

    if opts.append_digits {
        let mut buf = [0u8; 2];
        rng.fill_bytes(&mut buf);
        let n = (u16::from_be_bytes(buf) % 100) as u32;
        parts.push(format!("{n:02}"));
    }
    if opts.append_symbol {
        let symbols: Vec<char> = SYMBOLS.chars().collect();
        let s = symbols[rng.gen_range(0..symbols.len())];
        // Symbole accolé au dernier composant pour ne pas créer un séparateur fantôme.
        if let Some(last) = parts.last_mut() {
            last.push(s);
        }
    }

    let value = parts.join(&separator);
    let mut entropy_bits = (WORDS.len() as f64).log2() * opts.word_count as f64;
    if opts.append_digits {
        entropy_bits += (100.0_f64).log2();
    }
    if opts.append_symbol {
        entropy_bits += (SYMBOLS.chars().count() as f64).log2();
    }

    let score = score_password(&value);
    Ok(PasswordResult {
        value,
        entropy_bits,
        score,
    })
}

fn build_charset(opts: &PasswordOpts) -> Vec<char> {
    let mut chars: Vec<char> = Vec::new();
    if opts.upper {
        chars.extend(UPPER.chars());
    }
    if opts.lower {
        chars.extend(LOWER.chars());
    }
    if opts.digits {
        chars.extend(DIGITS.chars());
    }
    if opts.symbols {
        chars.extend(SYMBOLS.chars());
    }
    for c in opts.extra_chars.chars() {
        if !chars.contains(&c) {
            chars.push(c);
        }
    }
    if opts.exclude_ambiguous {
        chars.retain(|c| !AMBIGUOUS.contains(c));
    }
    chars
}

fn capitalize(word: &str) -> String {
    let mut chars = word.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

fn score_password(pw: &str) -> u8 {
    match zxcvbn::zxcvbn(pw, &[]).score() {
        zxcvbn::Score::Zero => 0,
        zxcvbn::Score::One => 1,
        zxcvbn::Score::Two => 2,
        zxcvbn::Score::Three => 3,
        zxcvbn::Score::Four => 4,
        _ => 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn random_password_respects_length_and_classes() {
        let opts = PasswordOpts {
            length: 32,
            upper: true,
            lower: true,
            digits: true,
            symbols: true,
            extra_chars: String::new(),
            exclude_ambiguous: false,
        };
        let r = generate_password(opts).expect("should generate");
        assert_eq!(r.value.chars().count(), 32);
        assert!(r.entropy_bits >= 128.0, "entropy {} < 128", r.entropy_bits);
    }

    #[test]
    fn excludes_ambiguous_chars() {
        let opts = PasswordOpts {
            length: 64,
            upper: true,
            lower: true,
            digits: true,
            symbols: false,
            extra_chars: String::new(),
            exclude_ambiguous: true,
        };
        for _ in 0..20 {
            let r = generate_password(PasswordOpts {
                length: opts.length,
                upper: opts.upper,
                lower: opts.lower,
                digits: opts.digits,
                symbols: opts.symbols,
                extra_chars: String::new(),
                exclude_ambiguous: true,
            })
            .expect("should generate");
            for c in r.value.chars() {
                assert!(!AMBIGUOUS.contains(&c), "found ambiguous char {c} in {}", r.value);
            }
        }
    }

    #[test]
    fn passphrase_uses_wordlist() {
        let r = generate_passphrase(PassphraseOpts {
            word_count: 4,
            separator: "-".into(),
            capitalize: false,
            append_digits: false,
            append_symbol: false,
        })
        .expect("should generate");
        let parts: Vec<&str> = r.value.split('-').collect();
        assert_eq!(parts.len(), 4);
        for p in parts {
            assert!(WORDS.contains(&p), "{p} not in wordlist");
        }
    }

    #[test]
    fn rejects_invalid_inputs() {
        assert!(generate_password(PasswordOpts {
            length: 2,
            lower: true,
            ..Default::default()
        })
        .is_err());
        assert!(generate_password(PasswordOpts {
            length: 16,
            ..Default::default()
        })
        .is_err());
    }
}
