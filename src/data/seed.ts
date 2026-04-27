import type { TextClip, ImageClip } from "../types";


export const INIT_TEXT: TextClip[] = [
  { id: 1,  text: "résume les s fsfenctionnalités", date: "26/04", time: "03:04", type: "text", fav: false, pinned: false },
  { id: 2,  text: 'Ajoute un onglet "Système" à TyroLabs. ─────────────────── DÉPENDANCES ──────────────────────────────...', date: "26/04", time: "23:24", type: "text", fav: false, pinned: false },
  { id: 3,  text: "désolé c'est moche, change complètement le design de toutes les icones. Inspire toi des designs d'applications actuels (notion, linear, arc)...", date: "26/04", time: "23:18", type: "text", fav: true,  pinned: false },
  { id: 4,  text: "Dans l'onglet de texte copié, supprime les petit carrés des lignes.", date: "26/04", time: "23:08", type: "text", fav: false, pinned: false },
  { id: 5,  text: "``` Dans TyroLabs, applique ces deux changements en même temps. ──────────────────────────────────────...", date: "26/04", time: "03:21", type: "code", fav: false, pinned: false },
  { id: 6,  text: "Dans widgets.py, ClipRow._build() : Supprime complètement la pastille colorée (le QLabel dot 8×8). Garde tout le reste inchangé.", date: "26/04", time: "03:16", type: "text", fav: false, pinned: false },
  { id: 7,  text: 'Dans window.py, ajoute un bouton "Enregistrer et Copier" dans le footer de l\'éditeur, juste à gauche de "Enregistrer". Au clic : 1. sauvegarde 2. copie...', date: "26/04", time: "03:16", type: "text", fav: false, pinned: false },
  { id: 8,  text: 'Ajoute un bouton "Enregistrer et Copier" dans l\'éditeur', date: "26/04", time: "03:13", type: "text", fav: true, pinned: false },
  { id: 9,  text: "Dans window.py, simplifie le footer de l'éditeur. Supprime les menus déroulants Casse et Espaces. Remplace par 4 boutons direc ...", date: "26/04", time: "03:09", type: "text", fav: false, pinned: false },
  { id: 10, text: "il faut que les boutons majuscules, minuscules, phrase, couper espaces, tout nettoyer soient tous disponibles sans menu dérou ...", date: "26/04", time: "03:08", type: "text", fav: false, pinned: false },
  { id: 11, text: "┌─ EditorPanel ───────────────────────────────────────────┐ • 14:32:01 • Texte • × • ← header (• = di ...", date: "26/04", time: "03:07", type: "code", fav: false, pinned: false },
  { id: 12, text: "Refonte de l'éditeur de texte inline — version épurée. Garde uniquement les fonctionnalités essentielles, supprime les autres.", date: "25/04", time: "22:43", type: "text", fav: false, pinned: false },
  { id: 13, text: "Ok alors on va faire du ménage parmi tes propositions, on garde uniquement les choses suivantes: majuscules, minuscules, titre ...", date: "25/04", time: "22:41", type: "text", fav: false, pinned: false },
  { id: 14, text: "import subprocess, platform, psutil", date: "25/04", time: "22:38", type: "code", fav: false, pinned: false },
  { id: 15, text: "def get_system_info():\n    return {'cpu': platform.processor(), 'os': platform.version()}", date: "25/04", time: "22:35", type: "code", fav: false, pinned: false },
  { id: 16, text: "QPropertyAnimation, QEasingCurve — sidebar collapse animation", date: "25/04", time: "20:12", type: "code", fav: false, pinned: false },
  { id: 17, text: "Dans TyroLabs, le bouton capture en bas du sidebar doit ouvrir un menu avec deux options : Capture immédiate et Capture différée (5s)", date: "25/04", time: "21:44", type: "text", fav: false, pinned: false },
  { id: 18, text: "Refactor widgets.py — extract ClipDelegate for 60fps rendering with 1000+ items", date: "25/04", time: "19:30", type: "text", fav: false, pinned: false },
];

export const INIT_IMAGES: ImageClip[] = [
  { id: 1,  hash: "402d1734eb06ef97a...", dims: "342×48",    time: "00:14:13", hue: 220, pinned: false },
  { id: 2,  hash: "64a85f14c6ec7bd65...", dims: "820×560",   time: "01:12:48", hue: 230, pinned: false },
  { id: 3,  hash: "capture_260426_03...", dims: "2560×1392", time: "03:33:14", hue: 240, pinned: false },
  { id: 4,  hash: "fb496efa614a8037d...", dims: "404×363",   time: "17:16:49", hue: 0,   pinned: false },
  { id: 5,  hash: "capture_240426_17...", dims: "404×363",   time: "17:16:49", hue: 120, pinned: false },
  { id: 6,  hash: "e6faffb662371da33...", dims: "820×560",   time: "01:24:12", hue: 210, pinned: false },
  { id: 7,  hash: "ab9cf3bc24058d4eb...", dims: "2560×1392", time: "00:40:49", hue: 200, pinned: false },
  { id: 8,  hash: "9a744e58e4be7db3a...", dims: "820×560",   time: "23:44:48", hue: 260, pinned: false },
  { id: 9,  hash: "429a2a2a0403bc96d...", dims: "820×560",   time: "23:44:48", hue: 180, pinned: false },
  { id: 10, hash: "e3f9c81c4d48a0e2e...", dims: "1128×536",  time: "23:43:46", hue: 215, pinned: false },
  { id: 11, hash: "904eb676c4d58bdab...", dims: "1273×1015", time: "20:57:25", hue: 350, pinned: false },
  { id: 12, hash: "6764a2f3adde0b92...",  dims: "595×308",   time: "20:57:22", hue: 140, pinned: false },
];
