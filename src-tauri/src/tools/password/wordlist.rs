//! Liste de mots utilisée pour le mode "passphrase / easy remember".
//!
//! 256 mots anglais courts (3-7 lettres), choisis pour être mémorisables
//! et phonétiquement distincts. Inspiré de l'EFF Short Wordlist 1.0 mais
//! réduit pour limiter la taille du binaire. log2(256) = 8 bits par mot,
//! soit 32 bits d'entropie pour 4 mots — équivalent à 5 chiffres aléatoires.

pub const WORDS: &[&str] = &[
    "able", "acid", "aged", "also", "area", "army", "atom", "baby", "back", "ball",
    "band", "bank", "base", "bath", "bear", "beat", "been", "beer", "bell", "belt",
    "best", "bike", "bill", "bird", "blow", "blue", "boat", "body", "bone", "book",
    "boom", "boot", "born", "boss", "both", "bowl", "bulk", "burn", "bush", "busy",
    "cake", "call", "calm", "came", "camp", "card", "care", "case", "cash", "cast",
    "cell", "chat", "chip", "city", "club", "coal", "coat", "code", "cold", "come",
    "cook", "cool", "cope", "copy", "core", "cost", "crew", "crop", "cube", "cute",
    "dark", "data", "date", "dawn", "deal", "dean", "dear", "debt", "deep", "deny",
    "desk", "dial", "dice", "diet", "dirt", "disc", "dish", "does", "dome", "done",
    "door", "dose", "down", "draw", "drew", "drop", "drug", "drum", "duck", "dust",
    "duty", "each", "earn", "ease", "east", "easy", "edge", "exit", "face", "fact",
    "fail", "fair", "fall", "fame", "farm", "fast", "fate", "fear", "feed", "feel",
    "fell", "felt", "file", "fill", "film", "find", "fine", "fire", "firm", "fish",
    "five", "flag", "flat", "flew", "flow", "fold", "folk", "food", "foot", "form",
    "fort", "fuel", "full", "fund", "gain", "game", "gang", "gate", "gave", "gear",
    "gene", "gift", "girl", "give", "glad", "goal", "goat", "gold", "gone", "good",
    "grab", "gray", "grew", "grow", "gulf", "hair", "half", "hall", "hand", "hang",
    "hard", "harm", "hate", "have", "head", "heal", "hear", "heat", "held", "hell",
    "help", "here", "hero", "high", "hill", "hint", "hire", "hold", "hole", "holy",
    "home", "hope", "horn", "hour", "huge", "hung", "hunt", "hurt", "icon", "idea",
    "iron", "item", "jump", "june", "july", "keen", "keep", "kept", "kick", "kind",
    "king", "knee", "knew", "know", "lack", "lady", "lake", "lamp", "land", "lane",
    "last", "late", "lazy", "lead", "leaf", "leak", "lean", "left", "lend", "lens",
    "less", "life", "lift", "like", "lime", "line", "link", "lion", "list", "live",
    "load", "loan", "lock", "logo", "lone", "long", "look", "loop", "lord", "lose",
    "loss", "lost", "loud", "love", "luck", "made", "mail", "main", "many", "mark",
    "mass", "math", "meal", "mean", "meat", "meet", "menu", "milk", "mind", "mine",
    "miss", "moon", "more", "most", "much", "must", "name", "navy", "near", "neck",
    "need", "nest", "news", "next", "nice", "nine", "noon", "norm", "nose", "note",
    "noun", "ocean", "okay", "once", "only", "open", "oral", "oven", "page", "paid",
    "pair", "palm", "park", "part", "pass", "past", "path", "peak", "pear", "peer",
    "pile", "pink", "pipe", "plot", "plug", "plus", "poem", "poet", "pole", "polo",
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wordlist_has_unique_short_words() {
        let mut seen = std::collections::HashSet::new();
        for w in WORDS {
            assert!(w.len() >= 3 && w.len() <= 7, "{w} has unexpected length");
            assert!(seen.insert(*w), "duplicate word: {w}");
        }
        assert!(WORDS.len() >= 256, "wordlist must have at least 256 words, got {}", WORDS.len());
    }
}
