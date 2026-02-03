import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const MANIFEST_URL = "./data/manifest.json";
const STORAGE_KEY = "cleanBibleApp.v1";

const firebaseConfig = {
  apiKey: "AIzaSyADpeTsG3dqArjfGaBa3CPu__qRRgHgO-Y",
  authDomain: "bible-2e330.firebaseapp.com",
  projectId: "bible-2e330",
  storageBucket: "bible-2e330.firebasestorage.app",
  messagingSenderId: "886807105919",
  appId: "1:886807105919:web:c65d84d9d41a63f1e68a4a",
  measurementId: "G-5T86DWN9VN"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const bookOrder = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah",
  "Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Songs","Isaiah","Jeremiah",
  "Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah",
  "Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke",
  "John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians",
  "Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
];

const palette = [
  { id: "red", name: "Red", hex: "#ff6259" },
  { id: "orange", name: "Orange", hex: "#ffaa33" },
  { id: "amber", name: "Amber", hex: "#ffcc33" },
  { id: "yellow", name: "Yellow", hex: "#ffd633" },
  { id: "lime", name: "Lime", hex: "#d2ee6b" },
  { id: "green", name: "Green", hex: "#5dd27a" },
  { id: "mint", name: "Mint", hex: "#33d2b4" },
  { id: "teal", name: "Teal", hex: "#33c6dd" },
  { id: "cyan", name: "Cyan", hex: "#5bbdeb" },
  { id: "sky", name: "Sky", hex: "#7bd3fb" },
  { id: "blue", name: "Blue", hex: "#3395ff" },
  { id: "indigo", name: "Indigo", hex: "#7978de" },
  { id: "violet", name: "Violet", hex: "#bf75e5" },
  { id: "magenta", name: "Magenta", hex: "#ff5777" },
  { id: "rose", name: "Rose", hex: "#ff9595" }
];

const state = {
  data: null,
  currentBook: "Genesis",
  currentChapter: "1",
  currentVerse: "1",
  selected: new Set(),
  favorites: {},
  memorize: {},
  highlights: {},
  notes: {},
  crossRefs: new Map(),
  crossRefsReady: false,
  navStack: [],
  xrefOrigin: null,
  searchIndex: [],
  searchQuery: "",
  manifest: [],
  translationId: "",
  view: "read",
  startupEnabled: false,
  startupMemoryId: "",
  startupActiveMemoryId: "",
  lastUpdatedAt: 0,
  notesVisible: false
};

const aliasOverrides = {
  "ps": "Psalms",
  "psalm": "Psalms",
  "psalms": "Psalms",
  "jn": "John",
  "jhn": "John",
  "1jn": "1 John",
  "2jn": "2 John",
  "3jn": "3 John",
  "songofsongs": "Song of Songs",
  "song": "Song of Songs",
  "sos": "Song of Songs",
  "canticles": "Song of Songs",
  "rev": "Revelation",
  "revelation": "Revelation"
};

const bookAliasMap = buildBookAliases();
const aliasKeys = Object.keys(bookAliasMap).sort((a, b) => b.length - a.length);
const chapterVerseCache = new Map();
const crossRefBookMap = {
  GEN: "Genesis",
  EXO: "Exodus",
  LEV: "Leviticus",
  NUM: "Numbers",
  DEU: "Deuteronomy",
  JOS: "Joshua",
  JDG: "Judges",
  RUT: "Ruth",
  "1SA": "1 Samuel",
  "2SA": "2 Samuel",
  "1KI": "1 Kings",
  "2KI": "2 Kings",
  "1CH": "1 Chronicles",
  "2CH": "2 Chronicles",
  EZR: "Ezra",
  NEH: "Nehemiah",
  EST: "Esther",
  JOB: "Job",
  PSA: "Psalms",
  PRO: "Proverbs",
  ECC: "Ecclesiastes",
  SNG: "Song of Songs",
  SOG: "Song of Songs",
  ISA: "Isaiah",
  JER: "Jeremiah",
  LAM: "Lamentations",
  EZK: "Ezekiel",
  DAN: "Daniel",
  HOS: "Hosea",
  JOL: "Joel",
  AMO: "Amos",
  OBA: "Obadiah",
  JON: "Jonah",
  MIC: "Micah",
  NAM: "Nahum",
  HAB: "Habakkuk",
  ZEP: "Zephaniah",
  HAG: "Haggai",
  ZEC: "Zechariah",
  MAL: "Malachi",
  MAT: "Matthew",
  MAR: "Mark",
  LUK: "Luke",
  JOH: "John",
  ACT: "Acts",
  ROM: "Romans",
  "1CO": "1 Corinthians",
  "2CO": "2 Corinthians",
  GAL: "Galatians",
  EPH: "Ephesians",
  PHP: "Philippians",
  COL: "Colossians",
  "1TH": "1 Thessalonians",
  "2TH": "2 Thessalonians",
  "1TI": "1 Timothy",
  "2TI": "2 Timothy",
  TIT: "Titus",
  PHM: "Philemon",
  HEB: "Hebrews",
  JAS: "James",
  "1PE": "1 Peter",
  "2PE": "2 Peter",
  "1JO": "1 John",
  "2JO": "2 John",
  "3JO": "3 John",
  JUD: "Jude",
  REV: "Revelation"
};
const translationLabels = {
  "KING JAMES BIBLE": "KJV",
  "ENGLISH STANDARD VERSION": "ESV",
  "INTERNATIONAL STANDARD VERSION": "ISV",
  "NEW INTERNATIONAL VERSION": "NIV",
  "NEW LIVING TRANSLATION": "NLT",
  "WESTMINSTER LENINGRAD CODEX": "WLC",
  "NESTLE GREEK NEW TESTAMENT 1904": "GNT",
  "PESHITTA HOLY BIBLE TRANSLATED": "PESHITTA"
};

const elements = {
  bookSelect: document.getElementById("bookSelect"),
  chapterSelect: document.getElementById("chapterSelect"),
  verseSelect: document.getElementById("verseSelect"),
  translationSelect: document.getElementById("translationSelect"),
  verseList: document.getElementById("verseList"),
  statusLine: document.getElementById("statusLine"),
  palette: document.getElementById("palette"),
  paletteGrid: document.getElementById("paletteGrid"),
  favoriteBtn: document.getElementById("favoriteBtn"),
  copyBtn: document.getElementById("copyBtn"),
  searchOriginalBtn: document.getElementById("searchOriginalBtn"),
  noteBtn: document.getElementById("noteBtn"),
  removeHighlightPill: document.getElementById("removeHighlightPill"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  resultsList: document.getElementById("resultsList"),
  resultsCount: document.getElementById("resultsCount"),
  controls: document.querySelector(".controls"),
  topbarControls: document.getElementById("topbarControls"),
  verseOfDay: document.getElementById("verseOfDay"),
  prevChapterBtn: document.getElementById("prevChapterBtn"),
  nextChapterBtn: document.getElementById("nextChapterBtn"),
  xrefBackFloating: document.getElementById("xrefBackFloating"),
  highlightList: document.getElementById("highlightList"),
  favoriteList: document.getElementById("favoriteList"),
  memorizeList: document.getElementById("memorizeList"),
  notesList: document.getElementById("notesList"),
  highlightFilter: document.getElementById("highlightFilter"),
  highlightSort: document.getElementById("highlightSort"),
  favoriteFilter: document.getElementById("favoriteFilter"),
  favoriteSort: document.getElementById("favoriteSort"),
  notesSort: document.getElementById("notesSort"),
  viewRead: document.getElementById("view-read"),
  memorizeBtn: document.getElementById("memorizeBtn"),
  startupToggle: document.getElementById("startupToggle"),
  startupSelect: document.getElementById("startupSelect"),
  startupOverlay: document.getElementById("startupOverlay"),
  startupCard: document.getElementById("startupCard"),
  startupReference: document.getElementById("startupReference"),
  startupText: document.getElementById("startupText"),
  startupContinue: document.getElementById("startupContinue"),
  startupShell: document.querySelector('[data-select="startupSelect"]'),
  windowMinimize: document.getElementById("windowMinimize"),
  windowMaximize: document.getElementById("windowMaximize"),
  windowClose: document.getElementById("windowClose"),
  appMinimize: document.getElementById("appMinimize"),
  appMaximize: document.getElementById("appMaximize"),
  appClose: document.getElementById("appClose"),
  notesToggle: document.getElementById("notesToggle"),
  authToggle: document.getElementById("authToggle"),
  authModal: document.getElementById("authModal"),
  authClose: document.getElementById("authClose"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authEmailSignIn: document.getElementById("authEmailSignIn"),
  authEmailCreate: document.getElementById("authEmailCreate"),
  authStatus: document.getElementById("authStatus")
};

let copyResetTimer = null;
let appClosed = false;
let startupLocked = false;
const customSelects = new Map();
let authUser = null;
let authReady = false;
let cloudSaveTimer = null;
let suppressCloudSave = false;
let lastCloudPayload = "";
const CLOUD_COLLECTION = "users";

function makeVerseId(book, chapter, verse) {
  return `${book}|${chapter}|${verse}`;
}

function parseVerseId(id) {
  const [book, chapter, verse] = id.split("|");
  return { book, chapter, verse };
}

function normalizeNotes(notes) {
  const normalized = {};
  Object.keys(notes || {}).forEach((id) => {
    const entry = notes[id];
    if (!entry) return;
    if (typeof entry === "string") {
      const text = entry.trim();
      if (!text) return;
      normalized[id] = { text, ts: 0 };
      return;
    }
    if (typeof entry === "object" && typeof entry.text === "string") {
      const text = entry.text.trim();
      if (!text) return;
      normalized[id] = { text, ts: Number(entry.ts) || 0 };
    }
  });
  return normalized;
}

function buildStatePayload(updatedAtOverride) {
  return {
    favorites: state.favorites,
    memorize: state.memorize,
    highlights: state.highlights,
    notes: normalizeNotes(state.notes),
    view: "read",
    currentBook: state.currentBook,
    currentChapter: state.currentChapter,
    currentVerse: state.currentVerse,
    searchQuery: "",
    translationId: state.translationId,
    startupEnabled: state.startupEnabled,
    startupMemoryId: state.startupMemoryId,
    notesVisible: state.notesVisible,
    updatedAt: updatedAtOverride ?? state.lastUpdatedAt,
    version: 2
  };
}

function applyStatePayload(payload) {
  state.favorites = payload.favorites || {};
  state.memorize = payload.memorize || {};
  state.highlights = payload.highlights || {};
  state.notes = normalizeNotes(payload.notes || {});
  state.view = "read";
  state.currentBook = payload.currentBook || state.currentBook;
  state.currentChapter = payload.currentChapter || state.currentChapter;
  state.currentVerse = payload.currentVerse || state.currentVerse;
  state.searchQuery = "";
  state.translationId = payload.translationId || "";
  state.startupEnabled = payload.startupEnabled || false;
  state.startupMemoryId = payload.startupMemoryId || "";
  state.notesVisible = payload.notesVisible || false;
  state.lastUpdatedAt = Number(payload.updatedAt) || 0;
}

function saveState(options = {}) {
  state.lastUpdatedAt = Date.now();
  const payload = buildStatePayload();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  if (!options.skipCloud) {
    scheduleCloudSave();
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const payload = JSON.parse(raw);
    applyStatePayload(payload);
  } catch (err) {
    console.warn("Failed to parse saved state", err);
  }
}

function mergeByTs(localMap = {}, remoteMap = {}) {
  const merged = { ...localMap };
  Object.keys(remoteMap).forEach((key) => {
    const localEntry = localMap[key];
    const remoteEntry = remoteMap[key];
    if (!localEntry) {
      merged[key] = remoteEntry;
      return;
    }
    const localTs = Number(localEntry.ts) || 0;
    const remoteTs = Number(remoteEntry.ts) || 0;
    merged[key] = remoteTs > localTs ? remoteEntry : localEntry;
  });
  return merged;
}

function mergePayloads(localPayload = {}, remotePayload = {}) {
  const localTs = Number(localPayload.updatedAt) || 0;
  const remoteTs = Number(remotePayload.updatedAt) || 0;
  const preferRemote = remoteTs > localTs;
  return {
    favorites: mergeByTs(localPayload.favorites, remotePayload.favorites),
    memorize: mergeByTs(localPayload.memorize, remotePayload.memorize),
    highlights: mergeByTs(localPayload.highlights, remotePayload.highlights),
    notes: mergeByTs(normalizeNotes(localPayload.notes), normalizeNotes(remotePayload.notes)),
    view: "read",
    currentBook: preferRemote ? remotePayload.currentBook : localPayload.currentBook,
    currentChapter: preferRemote ? remotePayload.currentChapter : localPayload.currentChapter,
    currentVerse: preferRemote ? remotePayload.currentVerse : localPayload.currentVerse,
    searchQuery: "",
    translationId: preferRemote ? remotePayload.translationId : localPayload.translationId,
    startupEnabled: preferRemote ? remotePayload.startupEnabled : localPayload.startupEnabled,
    startupMemoryId: preferRemote ? remotePayload.startupMemoryId : localPayload.startupMemoryId,
    notesVisible: preferRemote ? remotePayload.notesVisible : localPayload.notesVisible,
    updatedAt: Math.max(localTs, remoteTs),
    version: 2
  };
}

function scheduleCloudSave() {
  if (!authUser || suppressCloudSave) return;
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    pushCloudState();
  }, 1200);
}

async function pushCloudState() {
  if (!authUser) return;
  const payload = buildStatePayload();
  const payloadString = JSON.stringify(payload);
  if (payloadString === lastCloudPayload) return;
  lastCloudPayload = payloadString;
  try {
    await setDoc(doc(db, CLOUD_COLLECTION, authUser.uid), {
      state: payload,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("Cloud save failed", err);
  }
}

async function loadCloudState(user) {
  if (!user) return;
  try {
    const snapshot = await getDoc(doc(db, CLOUD_COLLECTION, user.uid));
    if (!snapshot.exists()) {
      await pushCloudState();
      return;
    }
    const remotePayload = snapshot.data()?.state || {};
    const localPayload = buildStatePayload(state.lastUpdatedAt);
    const merged = mergePayloads(localPayload, remotePayload);
    suppressCloudSave = true;
    applyStatePayload(merged);
    saveState({ skipCloud: true });
    suppressCloudSave = false;
    scheduleCloudSave();
    if (state.data) {
      render();
      if (startupLocked) updateStartupOverlayContent();
    }
  } catch (err) {
    console.warn("Cloud load failed", err);
  }
}

function setStatus(text) {
  elements.statusLine.textContent = text;
}

function buildPalette() {
  elements.paletteGrid.innerHTML = "";
  palette.forEach((color) => {
    const swatch = document.createElement("button");
    swatch.className = "palette-swatch";
    swatch.style.background = color.hex;
    swatch.title = color.name;
    swatch.addEventListener("click", () => applyHighlight(color.id));
    elements.paletteGrid.appendChild(swatch);
  });
  elements.highlightFilter.innerHTML = `<option value="all">All colors</option>`;
  if (elements.favoriteFilter) {
    elements.favoriteFilter.innerHTML = `<option value="all">All colors</option>`;
  }
  palette.forEach((color) => {
    const option = document.createElement("option");
    option.value = color.id;
    option.textContent = color.name;
    option.dataset.color = color.hex;
    elements.highlightFilter.appendChild(option);
    if (elements.favoriteFilter) {
      const favOption = document.createElement("option");
      favOption.value = color.id;
      favOption.textContent = color.name;
      favOption.dataset.color = color.hex;
      elements.favoriteFilter.appendChild(favOption);
    }
  });
  initCustomSelect(elements.highlightFilter);
  initCustomSelect(elements.favoriteFilter);
  syncCustomSelect(elements.highlightFilter);
  syncCustomSelect(elements.favoriteFilter);
}

function buildTranslationSelect() {
  elements.translationSelect.innerHTML = "";
  const sorted = [...state.manifest].sort((a, b) => {
    const langA = a.lang || "";
    const langB = b.lang || "";
    if (langA !== langB) return langA.localeCompare(langB);
    return a.name.localeCompare(b.name);
  });
  sorted.forEach((entry) => {
    const option = document.createElement("option");
    const label = translationLabels[entry.name] || entry.name;
    option.value = entry.id;
    option.textContent = label;
    elements.translationSelect.appendChild(option);
  });
  elements.translationSelect.value = state.translationId;
  syncCustomSelect(elements.translationSelect);
}

function loadTranslation(id) {
  const entry = state.manifest.find((item) => item.id === id) || state.manifest[0];
  if (!entry) return Promise.resolve();
  state.translationId = entry.id;
  return fetch(entry.path)
    .then((res) => res.json())
    .then((data) => {
      if (appClosed) return;
      state.data = data;
      chapterVerseCache.clear();
      const availableBooks = bookOrder.filter((book) => data[book]);
      state.currentBook = availableBooks.includes(state.currentBook)
        ? state.currentBook
        : (availableBooks[0] || Object.keys(data)[0]);
      const chapters = Object.keys(data[state.currentBook] || {});
      state.currentChapter = chapters.includes(state.currentChapter) ? state.currentChapter : (chapters[0] || "1");
      const verses = Object.keys(data[state.currentBook]?.[state.currentChapter] || {});
      state.currentVerse = verses.includes(state.currentVerse) ? state.currentVerse : (verses[0] || "1");
      buildSelectors(availableBooks);
      buildSearchIndex();
      render();
      if (state.searchQuery) handleSearch(state.searchQuery);
      setStatus("");
      saveState();
      if (startupLocked) updateStartupOverlayContent();
    });
}

function loadData() {
  return fetch(MANIFEST_URL)
    .then((res) => res.json())
    .then((manifest) => {
      state.manifest = manifest;
      if (!state.translationId) {
        const niv = manifest.find((entry) => entry.lang === "en" && entry.name === "NEW INTERNATIONAL VERSION");
        state.translationId = niv ? niv.id : (manifest[0] ? manifest[0].id : "");
      }
      buildTranslationSelect();
      return loadTranslation(state.translationId)
        .then(() => {
          renderVerses();
          setTimeout(() => loadCrossRefs(), 0);
          setTimeout(() => loadVerseOfDay(), 0);
        });
    });
}

function buildSelectors(availableBooks) {
  elements.bookSelect.innerHTML = "";
  availableBooks.forEach((book) => {
    const option = document.createElement("option");
    option.value = book;
    option.textContent = book;
    elements.bookSelect.appendChild(option);
  });
  elements.bookSelect.value = state.currentBook;
  syncCustomSelect(elements.bookSelect);
  updateChapterOptions();
  updateVerseOptions();
}

function updateChapterOptions() {
  const chapters = Object.keys(state.data[state.currentBook]);
  elements.chapterSelect.innerHTML = "";
  chapters.forEach((chapter) => {
    const option = document.createElement("option");
    option.value = chapter;
    option.textContent = chapter;
    elements.chapterSelect.appendChild(option);
  });
  if (!chapters.includes(state.currentChapter)) {
    state.currentChapter = chapters[0];
  }
  elements.chapterSelect.value = state.currentChapter;
  syncCustomSelect(elements.chapterSelect);
  saveState();
}

function updateVerseOptions() {
  const verses = Object.keys(state.data[state.currentBook][state.currentChapter]);
  elements.verseSelect.innerHTML = "";
  verses.forEach((verse) => {
    const option = document.createElement("option");
    option.value = verse;
    option.textContent = verse;
    elements.verseSelect.appendChild(option);
  });
  if (!verses.includes(state.currentVerse)) {
    state.currentVerse = verses[0];
  }
  elements.verseSelect.value = state.currentVerse;
  syncCustomSelect(elements.verseSelect);
  saveState();
}

function getChapterOrder() {
  return Object.keys(state.data[state.currentBook]).sort((a, b) => Number(a) - Number(b));
}

function goToChapter(delta) {
  const chapters = getChapterOrder();
  const currentIndex = chapters.indexOf(state.currentChapter);
  if (currentIndex === -1) return;
  const nextIndex = currentIndex + delta;
  if (nextIndex < 0 || nextIndex >= chapters.length) {
    const availableBooks = bookOrder.filter((book) => state.data[book]);
    const bookIndex = availableBooks.indexOf(state.currentBook);
    const nextBookIndex = bookIndex + (delta < 0 ? -1 : 1);
    if (nextBookIndex < 0 || nextBookIndex >= availableBooks.length) return;
    state.currentBook = availableBooks[nextBookIndex];
    const nextChapters = Object.keys(state.data[state.currentBook]).sort((a, b) => Number(a) - Number(b));
    state.currentChapter = delta < 0 ? nextChapters[nextChapters.length - 1] : nextChapters[0];
    state.currentVerse = "1";
  } else {
    state.currentChapter = chapters[nextIndex];
    state.currentVerse = "1";
  }
  elements.bookSelect.value = state.currentBook;
  updateChapterOptions();
  updateVerseOptions();
  renderVerses();
  saveState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildSearchIndex() {
  const index = [];
  Object.keys(state.data).forEach((book) => {
    Object.keys(state.data[book]).forEach((chapter) => {
      Object.keys(state.data[book][chapter]).forEach((verse) => {
        const text = state.data[book][chapter][verse];
        index.push({
          book,
          chapter,
          verse,
          text,
          haystack: text.toLowerCase()
        });
      });
    });
  });
  state.searchIndex = index;
}

function getChapterVerses(book, chapter) {
  const key = `${book}|${chapter}`;
  if (chapterVerseCache.has(key)) {
    return chapterVerseCache.get(key);
  }
  const verses = Object.keys(state.data?.[book]?.[chapter] || {}).sort((a, b) => Number(a) - Number(b));
  chapterVerseCache.set(key, verses);
  return verses;
}

function buildKeywordWindows(matches, span = 3) {
  const windows = new Map();
  const maxResults = 10000;
  matches.slice(0, maxResults).forEach((entry) => {
    const verses = getChapterVerses(entry.book, entry.chapter);
    const index = verses.indexOf(entry.verse);
    if (index < 0) return;
    const half = Math.floor((span - 1) / 2);
    const startIndex = Math.max(0, index - half);
    const endIndex = Math.min(verses.length - 1, startIndex + span - 1);
    const startVerse = verses[startIndex];
    const endVerse = verses[endIndex];
    const key = `${entry.book}|${entry.chapter}|${startVerse}|${endVerse}`;
    if (windows.has(key)) return;
    const textParts = [];
    for (let i = startIndex; i <= endIndex; i += 1) {
      const verseNum = verses[i];
      const text = state.data?.[entry.book]?.[entry.chapter]?.[verseNum];
      if (text) textParts.push(`${verseNum} ${text}`);
    }
    windows.set(key, {
      book: entry.book,
      chapter: entry.chapter,
      verse: startVerse,
      endVerse,
      text: textParts.join(" ")
    });
  });
  return Array.from(windows.values());
}

function normalizeQuery(query) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9:\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBookName(name) {
  const key = normalizeQuery(name).replace(/\s+/g, " ");
  return bookAliasMap[key] || name;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getQueryTokens(query) {
  const clean = normalizeQuery(query);
  if (!clean) return [];
  return clean.split(" ").filter((token) => token.length > 1);
}

function matchesWordStart(text, query) {
  const tokens = getQueryTokens(query);
  if (tokens.length === 0) return true;
  const haystack = normalizeQuery(text);
  return tokens.every((token) => new RegExp(`\\b${escapeRegExp(token)}`, "i").test(haystack));
}

function highlightText(text, query) {
  const tokens = getQueryTokens(query);
  if (tokens.length === 0) return escapeHtml(text);
  const ranges = [];
  tokens.forEach((token) => {
    const pattern = new RegExp(`\\b${escapeRegExp(token)}`, "gi");
    let match = null;
    while ((match = pattern.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  });
  if (ranges.length === 0) return escapeHtml(text);
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  ranges.forEach((range) => {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...range });
      return;
    }
    if (range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
      return;
    }
    const gap = text.slice(last.end, range.start);
    if (/^\s+$/.test(gap)) {
      last.end = range.end;
      return;
    }
    merged.push({ ...range });
  });
  let result = "";
  let cursor = 0;
  merged.forEach((range) => {
    result += escapeHtml(text.slice(cursor, range.start));
    result += `<span class="keyword-glow">${escapeHtml(text.slice(range.start, range.end))}</span>`;
    cursor = range.end;
  });
  result += escapeHtml(text.slice(cursor));
  return result;
}

function initCustomSelect(select) {
  if (!select) return;
  const shell = select.closest(".select-shell");
  if (!shell) return;
  if (customSelects.has(select)) return;
  const trigger = shell.querySelector(".select-trigger");
  const menu = shell.querySelector(".select-menu");
  if (!trigger || !menu) return;
  customSelects.set(select, { trigger, menu });
  trigger.addEventListener("click", () => {
    closeAllSelectMenus(select);
    menu.hidden = !menu.hidden;
  });
  menu.addEventListener("click", (event) => {
    const item = event.target.closest(".select-item");
    if (!item) return;
    select.value = item.dataset.value;
    select.dispatchEvent(new Event("change"));
    menu.hidden = true;
    syncCustomSelect(select);
  });
  syncCustomSelect(select);
}

function syncCustomSelect(select) {
  if (!select) return;
  const entry = customSelects.get(select);
  if (!entry) return;
  const { trigger, menu } = entry;
  menu.innerHTML = "";
  Array.from(select.options).forEach((opt) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "select-item";
    item.dataset.value = opt.value;
    const color = opt.dataset.color;
    if (color) {
      item.innerHTML = `<span class="color-dot" style="background:${color}"></span><span>${escapeHtml(opt.textContent)}</span>`;
    } else {
      item.innerHTML = `<span>${escapeHtml(opt.textContent)}</span>`;
    }
    menu.appendChild(item);
  });
  const selected = select.options[select.selectedIndex] || select.options[0];
  if (selected) {
    const color = selected.dataset.color;
    if (color) {
      trigger.innerHTML = `<span class="color-dot" style="background:${color}"></span><span>${escapeHtml(selected.textContent)}</span>`;
    } else {
      trigger.innerHTML = `<span>${escapeHtml(selected.textContent)}</span>`;
    }
  } else {
    trigger.textContent = "";
  }
}

function closeAllSelectMenus(exceptSelect) {
  customSelects.forEach((entry, select) => {
    if (select === exceptSelect) return;
    entry.menu.hidden = true;
  });
}

function openCustomSelect(select) {
  if (!select) return;
  initCustomSelect(select);
  const entry = customSelects.get(select);
  if (!entry) return;
  closeAllSelectMenus(select);
  entry.menu.hidden = false;
}

function buildBookAliases() {
  const map = {};
  bookOrder.forEach((book) => {
    const lower = book.toLowerCase();
    const compact = lower.replace(/\s+/g, "");
    map[lower] = book;
    map[compact] = book;
    map[lower.replace(/\s+of\s+/g, " ")] = book;
    map[compact.replace(/of/g, "")] = book;

    const parts = lower.split(" ");
    const firstWord = parts[0];
    map[firstWord] = book;

    if (parts.length > 1) {
      const initials = parts.map((p) => p[0]).join("");
      map[initials] = book;
      map[`${parts[0]}${parts[1]}`] = book;
    }
  });

  Object.keys(aliasOverrides).forEach((key) => {
    map[key] = aliasOverrides[key];
  });

  return map;
}

function parseReference(query) {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;

  let matchedBook = null;
  let remainder = normalized;
  for (const key of aliasKeys) {
    if (normalized === key || normalized.startsWith(`${key} `)) {
      matchedBook = bookAliasMap[key];
      remainder = normalized.slice(key.length).trim();
      break;
    }
  }

  if (!matchedBook) return null;

  if (!remainder) {
    return { book: matchedBook };
  }

  const chapterVerse = remainder.split(":");
  let chapter = null;
  let verse = null;

  if (chapterVerse.length > 1) {
    chapter = chapterVerse[0].trim().split(" ")[0];
    verse = chapterVerse[1].trim().split(" ")[0];
  } else {
    const nums = remainder.split(" ").filter(Boolean);
    if (nums.length >= 1) chapter = nums[0];
    if (nums.length >= 2) verse = nums[1];
  }

  return { book: matchedBook, chapter, verse };
}

function buildReferenceMatches(ref) {
  const matches = [];
  if (!state.data?.[ref.book]) return matches;
  if (!ref.chapter) {
    const chapter = "1";
    const verses = state.data[ref.book][chapter] || {};
    Object.keys(verses).forEach((verse) => {
      matches.push({ book: ref.book, chapter, verse, text: verses[verse] });
    });
    return matches;
  }

  const chapter = String(ref.chapter);
  if (!state.data[ref.book][chapter]) return matches;

  if (ref.verse) {
    const verse = String(ref.verse);
    const text = state.data[ref.book][chapter]?.[verse];
    if (text) matches.push({ book: ref.book, chapter, verse, text });
    return matches;
  }

  const verses = state.data[ref.book][chapter];
  Object.keys(verses).forEach((verse) => {
    matches.push({ book: ref.book, chapter, verse, text: verses[verse] });
  });
  return matches;
}

function render() {
  renderVerses();
  renderHighlights();
  renderFavorites();
  renderMemorize();
  renderNotes();
  applyView(state.view);
}

function renderVerses() {
  const openNoteIds = Array.from(document.querySelectorAll(".note-popup"))
    .map((popup) => popup.dataset.verseId)
    .filter(Boolean);
  const verses = state.data[state.currentBook][state.currentChapter];
  elements.verseList.innerHTML = "";
  const verseKeys = Object.keys(verses);
  const memorizedIds = new Set();
  Object.keys(state.memorize).forEach((memId) => {
    const ids = state.memorize[memId]?.verseIds || [];
    ids.forEach((id) => memorizedIds.add(id));
  });
  const notedIds = new Set(Object.keys(state.notes).filter((id) => state.notes[id]?.text?.trim()));
  const block = document.createElement("div");
  block.className = "paragraph";
  verseKeys.forEach((verse, index) => {
    const id = makeVerseId(state.currentBook, state.currentChapter, verse);
    const row = document.createElement("div");
    row.className = "verse-inline";
    row.dataset.verseId = id;
    if (state.selected.has(id)) {
      row.classList.add("selected");
    }
    if (state.highlights[id]) {
      const colorId = state.highlights[id].colorId;
      const color = palette.find((entry) => entry.id === colorId);
      if (color) {
        row.classList.add("highlighted");
        row.style.setProperty("--hl", color.hex);
        const prevId = index > 0 ? makeVerseId(state.currentBook, state.currentChapter, verseKeys[index - 1]) : null;
        const nextId = index < verseKeys.length - 1 ? makeVerseId(state.currentBook, state.currentChapter, verseKeys[index + 1]) : null;
        const prevSame = prevId && state.highlights[prevId]?.colorId === colorId;
        const nextSame = nextId && state.highlights[nextId]?.colorId === colorId;
        if (prevSame) row.classList.add("join-top");
        if (nextSame) row.classList.add("join-bottom");
      }
    }
    const favMark = state.favorites[id] ? "★" : "";
    const memMark = memorizedIds.has(id) ? "🧠" : "";
    const hasXref = state.crossRefsReady && state.crossRefs.has(id);
    const hasNote = notedIds.has(id);
    const markers = `${favMark}${memMark}${hasNote ? "✎" : ""}`;
    row.innerHTML = `
      <div class="verse-inline-text">
        <span class="verse-num">${verse}</span>
        <span class="verse-body">${verses[verse]}</span>
      </div>
      <div class="marker-group ${markers || hasXref ? "" : "hidden"}">
        ${favMark ? `<span class="marker star">★</span>` : ""}
        ${memMark ? `<span class="marker brain">🧠</span>` : ""}
        ${hasNote ? `<span class="marker note">✎</span>` : ""}
        ${hasXref ? `<button class="xref-btn" type="button" data-verse-id="${id}" aria-label="Cross references">📖</button>` : ""}
      </div>
    `;
    row.addEventListener("click", (event) => handleVerseClick(event, id));
    block.appendChild(row);
  });
  elements.verseList.appendChild(block);
  const noteIdsToOpen = state.notesVisible
    ? Array.from(notedIds)
    : openNoteIds;
  noteIdsToOpen.forEach((id) => openNotePopup(id));
}

function handleVerseClick(event, id) {
  if (event.target.closest(".xref-btn") || event.target.closest(".xref-popup") || event.target.closest(".marker.note")) {
    return;
  }
  const multi = event.ctrlKey || event.metaKey;
  const { book, chapter, verse } = parseVerseId(id);
  state.currentBook = book;
  state.currentChapter = chapter;
  state.currentVerse = verse;
  saveState();
  elements.bookSelect.value = book;
  updateChapterOptions();
  updateVerseOptions();
  if (!multi) {
    if (state.selected.size === 1 && state.selected.has(id)) {
      state.selected.clear();
    } else {
      state.selected.clear();
      state.selected.add(id);
    }
  } else {
    if (state.selected.has(id)) {
      state.selected.delete(id);
    } else {
      state.selected.add(id);
    }
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  const count = state.selected.size;
  if (count === 0) {
    elements.palette.hidden = true;
    elements.xrefBackFloating?.classList.remove("above-palette");
    renderVerses();
    return;
  }
  elements.palette.hidden = false;
  elements.xrefBackFloating?.classList.add("above-palette");
  const hasHighlight = Array.from(state.selected).some((id) => state.highlights[id]);
  elements.removeHighlightPill.hidden = !hasHighlight;
  const allFavorite = Array.from(state.selected).every((id) => state.favorites[id]);
  elements.favoriteBtn.textContent = allFavorite ? "★ Unfavorite" : "★ Favorite";
  const memorizedIds = new Set();
  Object.keys(state.memorize).forEach((memId) => {
    const ids = state.memorize[memId]?.verseIds || [];
    ids.forEach((id) => memorizedIds.add(id));
  });
  const allMemorized = Array.from(state.selected).every((id) => memorizedIds.has(id));
  elements.memorizeBtn.textContent = allMemorized ? "🧠 Unmemorize" : "🧠 Memorize";
  const firstSelected = Array.from(state.selected)[0];
  const hasNote = firstSelected && state.notes[firstSelected]?.text;
  elements.noteBtn.hidden = !!hasNote;
  saveState();
  renderVerses();
}

function updateNotesToggle() {
  if (!elements.notesToggle) return;
  elements.notesToggle.textContent = state.notesVisible ? "Notes: On" : "Notes: Off";
  elements.notesToggle.setAttribute("aria-pressed", state.notesVisible ? "true" : "false");
}

function updateNotesVisibility() {
  if (state.notesVisible) {
    renderVerses();
  } else {
    closeAllNotePopups();
  }
  updateNotesToggle();
}

function buildSelectionPayload() {
  const selectedIds = Array.from(state.selected);
  if (selectedIds.length === 0) return "";
  const sorted = selectedIds
    .map((id) => parseVerseId(id))
    .sort((a, b) => {
      const bookIndex = bookOrder.indexOf(a.book) - bookOrder.indexOf(b.book);
      if (bookIndex !== 0) return bookIndex;
      const chapterDiff = Number(a.chapter) - Number(b.chapter);
      if (chapterDiff !== 0) return chapterDiff;
      return Number(a.verse) - Number(b.verse);
    });
  const lines = [];
  let lastGroup = "";
  sorted.forEach((entry) => {
    const text = getVerseText(entry);
    const groupKey = `${entry.book}|${entry.chapter}`;
    if (groupKey !== lastGroup) {
      lines.push(`${entry.book} ${entry.chapter}:${entry.verse} ${text}`);
      lastGroup = groupKey;
    } else {
      lines.push(`${entry.verse} ${text}`);
    }
  });
  return lines.join("\n");
}

function sortVerseEntries(ids) {
  return ids
    .map((id) => parseVerseId(id))
    .sort((a, b) => {
      const bookIndex = bookOrder.indexOf(a.book) - bookOrder.indexOf(b.book);
      if (bookIndex !== 0) return bookIndex;
      const chapterDiff = Number(a.chapter) - Number(b.chapter);
      if (chapterDiff !== 0) return chapterDiff;
      return Number(a.verse) - Number(b.verse);
    });
}

function formatMemorizeLabel(ids) {
  const sorted = sortVerseEntries(ids);
  if (sorted.length === 0) return "Memorize";
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first.book === last.book && first.chapter === last.chapter) {
    if (first.verse === last.verse) {
      return `${first.book} ${first.chapter}:${first.verse}`;
    }
    return `${first.book} ${first.chapter}:${first.verse}-${last.verse}`;
  }
  return `${first.book} ${first.chapter}:${first.verse} → ${last.book} ${last.chapter}:${last.verse}`;
}

function buildMemorizeText(ids) {
  const sorted = sortVerseEntries(ids);
  const parts = [];
  sorted.forEach(({ book, chapter, verse }) => {
    const text = getVerseText({ book, chapter, verse });
    if (!text) return;
    parts.push(text);
  });
  return parts.join(" ");
}

function addMemorizeFromSelection() {
  if (state.selected.size === 0) return;
  const selectedIds = Array.from(state.selected);
  const memorizedIds = new Set();
  Object.keys(state.memorize).forEach((memId) => {
    const ids = state.memorize[memId]?.verseIds || [];
    ids.forEach((id) => memorizedIds.add(id));
  });
  const allMemorized = selectedIds.every((id) => memorizedIds.has(id));

  if (allMemorized) {
    Object.keys(state.memorize).forEach((memId) => {
      const entry = state.memorize[memId];
      if (!entry) return;
      const nextIds = (entry.verseIds || []).filter((id) => !state.selected.has(id));
      if (nextIds.length === 0) {
        delete state.memorize[memId];
      } else if (nextIds.length !== entry.verseIds.length) {
        state.memorize[memId] = { verseIds: nextIds, ts: Date.now() };
      }
    });
  } else {
    const id = `mem-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    state.memorize[id] = { verseIds: selectedIds, ts: Date.now() };
  }

  saveState();
  state.selected.clear();
  elements.palette.hidden = true;
  renderMemorize();
  renderVerses();
}

function buildMemorizeEntries() {
  return Object.keys(state.memorize).map((id) => ({
    id,
    verseIds: state.memorize[id].verseIds || [],
    ts: state.memorize[id].ts || 0
  })).sort((a, b) => b.ts - a.ts);
}

function applyHighlight(colorId) {
  const now = Date.now();
  state.selected.forEach((id) => {
    state.highlights[id] = { colorId, ts: now };
  });
  saveState();
  elements.palette.hidden = true;
  state.selected.clear();
  render();
}

function clearHighlight() {
  state.selected.forEach((id) => {
    delete state.highlights[id];
  });
  saveState();
  render();
}

function clearSelection() {
  const openNoteIds = Array.from(document.querySelectorAll(".note-popup"))
    .map((popup) => popup.dataset.verseId)
    .filter(Boolean);
  state.selected.clear();
  elements.palette.hidden = true;
  elements.xrefBackFloating?.classList.remove("above-palette");
  saveState();
  renderVerses();
  openNoteIds.forEach((id) => openNotePopup(id));
}

function getVerseText({ book, chapter, verse }) {
  return state.data?.[book]?.[chapter]?.[verse] || "";
}

function parseCrossRef(code) {
  if (!code) return null;
  const parts = code.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const bookCode = parts[0].toUpperCase();
  const chapter = parts[1];
  const verse = parts[2];
  const book = crossRefBookMap[bookCode];
  if (!book) return null;
  return { book, chapter, verse };
}

function formatRefLabel(ref) {
  return `${ref.book} ${ref.chapter}:${ref.verse}`;
}

function loadCrossRefs() {
  if (state.crossRefsReady) return Promise.resolve();
  const files = Array.from({ length: 32 }, (_, i) => `data/crossrefs/${i + 1}.json`);
  return Promise.all(files.map((path) => fetch(path).then((res) => res.json())))
    .then((chunks) => {
      const map = new Map();
      chunks.forEach((chunk) => {
        Object.keys(chunk || {}).forEach((key) => {
          const entry = chunk[key];
          if (!entry || !entry.v || !entry.r) return;
          const ref = parseCrossRef(entry.v);
          if (!ref) return;
          const verseId = makeVerseId(ref.book, ref.chapter, ref.verse);
          const refs = Object.values(entry.r)
            .map((code) => parseCrossRef(code))
            .filter(Boolean);
          if (refs.length) {
            map.set(verseId, refs);
          }
        });
      });
      state.crossRefs = map;
      state.crossRefsReady = true;
    })
    .catch((err) => {
      console.warn("Failed to load cross references", err);
    });
}

function loadVerseOfDay() {
  if (!elements.verseOfDay) return Promise.resolve();
  const url = "https://labs.bible.org/api/?passage=votd&type=json";
  return fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) return;
      const entry = data[0];
      const book = normalizeBookName(entry.bookname);
      const chapter = String(entry.chapter);
      const verse = String(entry.verse);
      elements.verseOfDay.textContent = "Verse of the day";
      elements.verseOfDay.dataset.book = book;
      elements.verseOfDay.dataset.chapter = chapter;
      elements.verseOfDay.dataset.verse = verse;
    })
    .catch((err) => {
      console.warn("Failed to load verse of the day", err);
      elements.verseOfDay.textContent = "Verse of the day";
    });
}

function closeAllCrossRefPopups() {
  document.querySelectorAll(".xref-popup").forEach((popup) => {
    popup.remove();
  });
}

function closeAllNotePopups() {
  document.querySelectorAll(".note-popup").forEach((popup) => {
    popup.remove();
  });
}

function toggleCrossRefPopup(verseId) {
  const existing = document.querySelector(`.xref-popup[data-verse-id="${verseId}"]`);
  if (existing) {
    existing.remove();
    return;
  }
  closeAllCrossRefPopups();
  const row = document.querySelector(`.verse-inline[data-verse-id="${verseId}"]`);
  if (!row) return;
  state.xrefOrigin = parseVerseId(verseId);
  const popup = document.createElement("div");
  popup.className = "xref-popup";
  popup.dataset.verseId = verseId;
  renderCrossRefPopup(verseId, popup);
  row.insertAdjacentElement("afterend", popup);
}

function toggleNotePopup(verseId) {
  const existing = document.querySelector(`.note-popup[data-verse-id="${verseId}"]`);
  if (existing) {
    existing.remove();
    return;
  }
  openNotePopup(verseId, true);
}

function openNotePopup(verseId, focus = false) {
  const row = document.querySelector(`.verse-inline[data-verse-id="${verseId}"]`);
  if (!row) return;
  const existing = document.querySelector(`.note-popup[data-verse-id="${verseId}"]`);
  if (existing) return;
  const popup = document.createElement("div");
  popup.className = "note-popup";
  popup.dataset.verseId = verseId;
  const textarea = document.createElement("textarea");
  textarea.className = "note-input";
  textarea.rows = 1;
  textarea.placeholder = "Add a note...";
  textarea.value = state.notes[verseId]?.text || "";
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "note-delete";
  deleteBtn.type = "button";
  deleteBtn.setAttribute("aria-label", "Delete note");
  deleteBtn.textContent = "🗑";
  popup.appendChild(textarea);
  popup.appendChild(deleteBtn);
  const resize = () => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
  requestAnimationFrame(resize);
  popup.addEventListener("click", () => textarea.focus());
  textarea.addEventListener("input", () => {
    resize();
    const value = textarea.value.trim();
    if (!value) {
      delete state.notes[verseId];
    } else {
      state.notes[verseId] = { text: textarea.value, ts: Date.now() };
    }
    saveState();
  });
  textarea.addEventListener("blur", () => {
    const value = textarea.value.trim();
    if (!value) {
      delete state.notes[verseId];
    } else {
      state.notes[verseId] = { text: textarea.value, ts: Date.now() };
    }
    saveState();
  });
  deleteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    delete state.notes[verseId];
    saveState();
    popup.remove();
    renderVerses();
    updateSelectionUI();
  });
  row.insertAdjacentElement("afterend", popup);
  if (focus) {
    textarea.focus();
  }
}

function updateFloatingBack() {
  if (!elements.xrefBackFloating) return;
  elements.xrefBackFloating.hidden = state.navStack.length === 0;
}

function renderCrossRefPopup(verseId, popup) {
  if (!popup) return;
  const refs = state.crossRefs.get(verseId) || [];
  if (refs.length === 0) {
    popup.innerHTML = "<div>No cross references found.</div>";
    return;
  }
  const links = refs.map((ref, index) => {
    const label = formatRefLabel(ref);
    const sep = index < refs.length - 1 ? ", " : "";
    const refData = `${ref.book}|${ref.chapter}|${ref.verse}`;
    return `<button class="xref-link" type="button" data-ref="${refData}">${label}</button>${sep}`;
  }).join("");
  popup.innerHTML = `<div class="xref-links">${links}</div>`;
}

function shouldShowStartup() {
  if (!state.startupEnabled) return false;
  if (state.startupMemoryId === "random") {
    return Object.keys(state.memorize).length > 0;
  }
  return state.startupMemoryId && state.memorize[state.startupMemoryId];
}

function updateStartupOverlayContent() {
  if (!elements.startupOverlay) return;
  if (!state.data) {
    elements.startupReference.textContent = "Loading…";
    elements.startupText.textContent = "Preparing your verse.";
    scheduleStartupResize();
    return;
  }
  const activeId = state.startupActiveMemoryId || state.startupMemoryId;
  const entry = state.memorize[activeId];
  if (!entry) {
    elements.startupReference.textContent = "No verse selected";
    elements.startupText.textContent = "Choose a verse or group in the Memorize tab.";
    scheduleStartupResize();
    return;
  }
  elements.startupReference.textContent = formatMemorizeLabel(entry.verseIds);
  elements.startupText.textContent = buildMemorizeText(entry.verseIds) || "Select a verse to memorize.";
  scheduleStartupResize();
}

let startupResizeTimer = null;
function scheduleStartupResize() {
  if (!startupLocked) return;
  if (!window.appShell || typeof window.appShell.setStartupMode !== "function") return;
  if (startupResizeTimer) {
    clearTimeout(startupResizeTimer);
  }
  startupResizeTimer = setTimeout(() => {
    resizeStartupWindow();
  }, 50);
}

function resizeStartupWindow() {
  const card = elements.startupCard;
  if (!card) {
    window.appShell.setStartupMode("compact");
    return;
  }
  const rect = card.getBoundingClientRect();
  const padding = 64;
  const width = Math.ceil(rect.width + padding);
  const height = Math.ceil(rect.height + padding);
  window.appShell.setStartupMode({ mode: "compact", width, height });
}

function showStartupOverlay() {
  if (state.startupMemoryId === "random") {
    const keys = Object.keys(state.memorize);
    state.startupActiveMemoryId = keys[Math.floor(Math.random() * keys.length)] || "";
  } else {
    state.startupActiveMemoryId = state.startupMemoryId;
  }
  startupLocked = true;
  document.body.classList.add("startup-locked");
  elements.startupOverlay.hidden = false;
  updateStartupOverlayContent();
  if (window.appShell && typeof window.appShell.setStartupMode === "function") {
    requestAnimationFrame(() => {
      resizeStartupWindow();
    });
  }
}

function hideStartupOverlay() {
  startupLocked = false;
  state.startupActiveMemoryId = "";
  document.body.classList.remove("startup-locked");
  elements.startupOverlay.hidden = true;
  if (window.appShell && typeof window.appShell.setStartupMode === "function") {
    window.appShell.setStartupMode({ mode: "normal", width: 950, height: 750, center: true });
  }
}

function buildHighlightEntries() {
  return Object.keys(state.highlights).map((id) => {
    const { book, chapter, verse } = parseVerseId(id);
    return {
      id,
      book,
      chapter: parseInt(chapter, 10),
      verse: parseInt(verse, 10),
      text: getVerseText({ book, chapter, verse }),
      colorId: state.highlights[id].colorId,
      ts: state.highlights[id].ts
    };
  });
}

function renderHighlights() {
  if (!state.data) return;
  const filter = elements.highlightFilter?.value || "all";
  const sort = elements.highlightSort.value;
  let entries = buildHighlightEntries();

  if (filter !== "all") {
    entries = entries.filter((entry) => entry.colorId === filter);
  }

  if (state.searchQuery) {
    entries = entries.filter((entry) => matchesWordStart(`${entry.book} ${entry.chapter}:${entry.verse} ${entry.text}`, state.searchQuery));
  }

  const bookIndex = Object.fromEntries(bookOrder.map((book, index) => [book, index]));
  if (sort === "recency") {
    entries.sort((a, b) => b.ts - a.ts);
  } else if (sort === "oldest") {
    entries.sort((a, b) => a.ts - b.ts);
  } else if (sort === "book") {
    entries.sort((a, b) => {
      const bi = (bookIndex[a.book] ?? 999) - (bookIndex[b.book] ?? 999);
      if (bi !== 0) return bi;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  } else if (sort === "color") {
    entries.sort((a, b) => {
      const ci = palette.findIndex((p) => p.id === a.colorId) - palette.findIndex((p) => p.id === b.colorId);
      if (ci !== 0) return ci;
      const bi = (bookIndex[a.book] ?? 999) - (bookIndex[b.book] ?? 999);
      if (bi !== 0) return bi;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  }

  elements.highlightList.innerHTML = "";
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.textContent = "No highlights yet. Select verses and choose a color.";
    elements.highlightList.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const verseHtml = highlightText(entry.text, state.searchQuery);
    const color = palette.find((p) => p.id === entry.colorId);
    const card = document.createElement("article");
    card.className = "card highlighted";
    if (color) card.style.setProperty("--hl", color.hex);
    card.innerHTML = `
      <div class="verse">
        <div class="verse-number">${escapeHtml(`${entry.book} ${entry.chapter}:${entry.verse}`)}</div>
        <div class="verse-text muted">${verseHtml}</div>
        <div class="verse-actions">
        </div>
      </div>
    `;
    card.addEventListener("click", () => {
      jumpToVerse(entry.book, String(entry.chapter), String(entry.verse));
      applyView("read");
    });
    elements.highlightList.appendChild(card);
  });
}

function renderFavorites() {
  if (!state.data) return;
  let entries = Object.keys(state.favorites).map((id) => {
    const { book, chapter, verse } = parseVerseId(id);
    return {
      id,
      book,
      chapter: parseInt(chapter, 10),
      verse: parseInt(verse, 10),
      text: getVerseText({ book, chapter, verse }),
      ts: state.favorites[id].ts,
      colorId: state.highlights[id]?.colorId || null
    };
  });

  const filter = elements.favoriteFilter?.value || "all";
  const sort = elements.favoriteSort?.value || "recency";
  if (filter !== "all") {
    entries = entries.filter((entry) => entry.colorId === filter);
  }
  if (state.searchQuery) {
    entries = entries.filter((entry) => matchesWordStart(`${entry.book} ${entry.chapter}:${entry.verse} ${entry.text}`, state.searchQuery));
  }

  const bookIndex = Object.fromEntries(bookOrder.map((book, index) => [book, index]));
  if (sort === "recency") {
    entries.sort((a, b) => b.ts - a.ts);
  } else if (sort === "oldest") {
    entries.sort((a, b) => a.ts - b.ts);
  } else if (sort === "book") {
    entries.sort((a, b) => {
      const bi = (bookIndex[a.book] ?? 999) - (bookIndex[b.book] ?? 999);
      if (bi !== 0) return bi;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  } else if (sort === "color") {
    entries.sort((a, b) => {
      const ci = palette.findIndex((p) => p.id === a.colorId) - palette.findIndex((p) => p.id === b.colorId);
      if (ci !== 0) return ci;
      const bi = (bookIndex[a.book] ?? 999) - (bookIndex[b.book] ?? 999);
      if (bi !== 0) return bi;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  }

  elements.favoriteList.innerHTML = "";
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.textContent = "No favorites yet. Select verses and tap Favorite.";
    elements.favoriteList.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const verseHtml = highlightText(entry.text, state.searchQuery);
    const card = document.createElement("article");
    card.className = "card favorite";
    const highlight = state.highlights[entry.id];
    if (highlight) {
      const color = palette.find((p) => p.id === highlight.colorId);
      if (color) {
        card.classList.add("highlighted");
        card.style.setProperty("--hl", color.hex);
      }
    }
    card.innerHTML = `
      <div class="verse">
        <div class="verse-number">${escapeHtml(`${entry.book} ${entry.chapter}:${entry.verse}`)}</div>
        <div class="verse-text">${verseHtml}</div>
        <div class="verse-actions">
          ${highlight ? `<span class="badge">${(palette.find((p) => p.id === highlight.colorId) || {}).name || "Highlight"}</span>` : ""}
          <button class="ghost" type="button" data-action="remove" data-id="${entry.id}">🗑</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="remove"]').addEventListener("click", (event) => {
      event.stopPropagation();
      delete state.favorites[entry.id];
      saveState();
      renderFavorites();
    });
    card.addEventListener("click", () => {
      jumpToVerse(entry.book, String(entry.chapter), String(entry.verse));
      applyView("read");
    });
    elements.favoriteList.appendChild(card);
  });
}

function updateStartupSelect() {
  elements.startupSelect.innerHTML = "";
  const entries = buildMemorizeEntries();
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = entries.length ? "Choose a verse or group" : "No memorized verses yet";
  elements.startupSelect.appendChild(emptyOption);
  if (entries.length) {
    const randomOption = document.createElement("option");
    randomOption.value = "random";
    randomOption.textContent = "Random (from memorized)";
    elements.startupSelect.appendChild(randomOption);
  }
  entries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = formatMemorizeLabel(entry.verseIds);
    elements.startupSelect.appendChild(option);
  });
  if (!state.startupMemoryId || (state.startupMemoryId !== "random" && !state.memorize[state.startupMemoryId])) {
    state.startupMemoryId = "";
  }
  elements.startupSelect.value = state.startupMemoryId;
  initCustomSelect(elements.startupSelect);
  syncCustomSelect(elements.startupSelect);
  elements.startupToggle.checked = state.startupEnabled;
  updateStartupVisibility();
  saveState();
}

function renderMemorize() {
  if (!state.data) return;
  let entries = buildMemorizeEntries();
  elements.memorizeList.innerHTML = "";
  updateStartupSelect();
  if (state.searchQuery) {
    entries = entries.filter((entry) => {
      const label = formatMemorizeLabel(entry.verseIds);
      const text = buildMemorizeText(entry.verseIds);
      return matchesWordStart(`${label} ${text}`, state.searchQuery);
    });
  }
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.textContent = state.searchQuery
      ? "No memorized verses match your search."
      : "No memorized verses yet. Select verses and tap Memorize.";
    elements.memorizeList.appendChild(empty);
    return;
  }
  entries.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "card";
    const label = formatMemorizeLabel(entry.verseIds);
    const text = buildMemorizeText(entry.verseIds);
    const textHtml = highlightText(text, state.searchQuery);
    card.innerHTML = `
      <div class="verse">
        <div class="verse-number">${escapeHtml(label)}</div>
        <div class="verse-text">${textHtml}</div>
        <div class="verse-actions">
          <button class="ghost" type="button" data-action="remove" data-id="${entry.id}">🗑</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="remove"]').addEventListener("click", (event) => {
      event.stopPropagation();
      delete state.memorize[entry.id];
      if (state.startupMemoryId === entry.id) {
        state.startupMemoryId = "";
      }
      saveState();
      renderMemorize();
    });
    card.addEventListener("click", () => {
      const first = sortVerseEntries(entry.verseIds)[0];
      if (first) {
        jumpToVerse(first.book, String(first.chapter), String(first.verse));
        applyView("read");
      }
    });
    elements.memorizeList.appendChild(card);
  });
}

function renderNotes() {
  if (!state.data) return;
  let entries = Object.keys(state.notes).map((id) => {
    const { book, chapter, verse } = parseVerseId(id);
    const note = state.notes[id] || {};
    return {
      id,
      book,
      chapter: parseInt(chapter, 10),
      verse: parseInt(verse, 10),
      text: getVerseText({ book, chapter, verse }),
      note: note.text || "",
      ts: note.ts || 0
    };
  });

  if (state.searchQuery) {
    entries = entries.filter((entry) => matchesWordStart(`${entry.book} ${entry.chapter}:${entry.verse} ${entry.text} ${entry.note}`, state.searchQuery));
  }

  const sort = elements.notesSort?.value || "recency";
  const bookIndex = Object.fromEntries(bookOrder.map((book, index) => [book, index]));
  if (sort === "recency") {
    entries.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  } else if (sort === "oldest") {
    entries.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  } else if (sort === "book") {
    entries.sort((a, b) => {
      const bi = (bookIndex[a.book] ?? 999) - (bookIndex[b.book] ?? 999);
      if (bi !== 0) return bi;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  }

  elements.notesList.innerHTML = "";
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.textContent = state.searchQuery
      ? "No notes match your search."
      : "No notes yet. Add a note from the Read view.";
    elements.notesList.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const verseHtml = highlightText(entry.text, state.searchQuery);
    const noteHtml = highlightText(entry.note, state.searchQuery);
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="verse">
        <div class="verse-number">${escapeHtml(`${entry.book} ${entry.chapter}:${entry.verse}`)}</div>
        <div class="verse-text">${verseHtml}</div>
        <div class="verse-actions">
          <button class="ghost" type="button" data-action="remove" data-id="${entry.id}">🗑</button>
        </div>
      </div>
      <div class="verse-text">${noteHtml}</div>
    `;
    card.querySelector('[data-action="remove"]').addEventListener("click", (event) => {
      event.stopPropagation();
      delete state.notes[entry.id];
      saveState();
      renderNotes();
      renderVerses();
    });
    card.addEventListener("click", () => {
      jumpToVerse(entry.book, String(entry.chapter), String(entry.verse));
      applyView("read");
      state.notesVisible = true;
      updateNotesVisibility();
      openNotePopup(entry.id, true);
    });
    elements.notesList.appendChild(card);
  });
}

function applyView(view) {
  state.view = view;
  saveState();
  document.querySelectorAll(".view").forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
  if (elements.controls) {
    elements.controls.hidden = view !== "read";
  }
  if (elements.topbarControls) {
    elements.topbarControls.hidden = view !== "read";
  }
  if (view !== "read") {
    elements.palette.hidden = true;
    elements.xrefBackFloating?.classList.remove("above-palette");
  }
}

function jumpToVerse(book, chapter, verse) {
  state.currentBook = book;
  state.currentChapter = chapter;
  state.currentVerse = verse;
  saveState();
  elements.bookSelect.value = book;
  syncCustomSelect(elements.bookSelect);
  updateChapterOptions();
  updateVerseOptions();
  renderVerses();
  const target = document.querySelector(`[data-verse-id="${makeVerseId(book, chapter, verse)}"]`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => flashVerse(target), 400);
  }
}

function flashVerse(target) {
  target.classList.remove("flash");
  requestAnimationFrame(() => {
    target.classList.add("flash");
    setTimeout(() => target.classList.remove("flash"), 900);
  });
}

function handleSearch(query) {
  const clean = normalizeQuery(query);
  state.searchQuery = clean;
  saveState();
  if (!state.data) return;
  if (state.view !== "read") {
    elements.searchResults.hidden = true;
    elements.resultsList.innerHTML = "";
    elements.viewRead.classList.remove("search-active");
    if (state.view === "highlights") renderHighlights();
    if (state.view === "favorites") renderFavorites();
    if (state.view === "memorize") renderMemorize();
    if (state.view === "notes") renderNotes();
    return;
  }
  if (clean.length < 2) {
    elements.searchResults.hidden = true;
    elements.resultsList.innerHTML = "";
    elements.viewRead.classList.remove("search-active");
    return;
  }
  const ref = parseReference(clean);
  const textMatches = ref
    ? buildReferenceMatches(ref)
    : state.searchIndex.filter((entry) => matchesWordStart(entry.haystack, clean));
  const matches = ref ? textMatches : textMatches;
  elements.resultsList.innerHTML = "";
  const limited = matches.slice(0, 100);
  limited.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "card";
    const rangeLabel = entry.endVerse
      ? `${entry.book} ${entry.chapter}:${entry.verse}-${entry.endVerse}`
      : `${entry.book} ${entry.chapter}:${entry.verse}`;
    const verseHtml = highlightText(entry.text, clean);
    card.innerHTML = `
      <div class="verse">
        <div class="verse-number">${escapeHtml(rangeLabel)}</div>
        <div class="verse-text">${verseHtml}</div>
        <div class="verse-actions"></div>
      </div>
    `;
    card.addEventListener("click", () => {
      elements.searchInput.value = "";
      handleSearch("");
      applyView("read");
      setTimeout(() => jumpToVerse(entry.book, entry.chapter, entry.verse), 0);
    });
    elements.resultsList.appendChild(card);
  });
  elements.searchResults.hidden = false;
  elements.resultsCount.textContent = `${matches.length} results`;
  elements.viewRead.classList.add("search-active");
}

function setAuthStatus(text) {
  if (!elements.authStatus) return;
  elements.authStatus.textContent = text || "";
}

function openAuthModal() {
  if (!elements.authModal) return;
  elements.authModal.hidden = false;
  setAuthStatus("");
  if (elements.authPassword) elements.authPassword.value = "";
  if (elements.authEmail) elements.authEmail.focus();
}

function closeAuthModal() {
  if (!elements.authModal) return;
  elements.authModal.hidden = true;
}

function updateAuthButton() {
  if (!elements.authToggle) return;
  const icon = elements.authToggle.querySelector(".auth-icon");
  if (authUser) {
    elements.authToggle.dataset.auth = "in";
    elements.authToggle.setAttribute("aria-label", "Sign out");
    elements.authToggle.title = "Sign out";
    if (icon) icon.textContent = "⍈";
  } else {
    elements.authToggle.dataset.auth = "out";
    elements.authToggle.setAttribute("aria-label", "Sign in");
    elements.authToggle.title = "Sign in";
    if (icon) icon.textContent = "☁︎";
  }
}

function bindEvents() {
  document.querySelectorAll("select.native-select").forEach((select) => initCustomSelect(select));
  elements.bookSelect.addEventListener("change", (event) => {
    state.currentBook = event.target.value;
    updateChapterOptions();
    updateVerseOptions();
    renderVerses();
    saveState();
    setTimeout(() => openCustomSelect(elements.chapterSelect), 0);
  });

  elements.chapterSelect.addEventListener("change", (event) => {
    state.currentChapter = event.target.value;
    updateVerseOptions();
    renderVerses();
    saveState();
    setTimeout(() => openCustomSelect(elements.verseSelect), 0);
  });

  elements.verseSelect.addEventListener("change", (event) => {
    state.currentVerse = event.target.value;
    jumpToVerse(state.currentBook, state.currentChapter, state.currentVerse);
    saveState();
  });

  elements.translationSelect.addEventListener("change", (event) => {
    loadTranslation(event.target.value);
  });

  elements.favoriteBtn.addEventListener("click", () => {
    const now = Date.now();
    const allFavorite = Array.from(state.selected).every((id) => state.favorites[id]);
    state.selected.forEach((id) => {
      if (allFavorite) {
        delete state.favorites[id];
      } else {
        state.favorites[id] = { ts: now };
      }
    });
    saveState();
    render();
    updateSelectionUI();
  });

  elements.memorizeBtn.addEventListener("click", addMemorizeFromSelection);

  elements.copyBtn.addEventListener("click", async () => {
    const payload = buildSelectionPayload();
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      elements.copyBtn.textContent = "Copied";
      if (copyResetTimer) clearTimeout(copyResetTimer);
      copyResetTimer = setTimeout(() => {
        elements.copyBtn.textContent = "Copy";
        copyResetTimer = null;
      }, 1000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  });

  elements.searchOriginalBtn.addEventListener("click", async () => {
    const payload = buildSelectionPayload();
    if (!payload) return;
    const prompt = "break down this in it's original language whether it be Greek, Hebrew, or Aramaic";
    const query = `${payload}\n\n${prompt}`;
    try {
      await navigator.clipboard.writeText(payload);
    } catch (err) {
      console.error("Copy failed", err);
    }
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(url, "_blank");
  });

  elements.noteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const targetId = Array.from(state.selected)[0];
    if (!targetId) return;
    toggleNotePopup(targetId);
  });

  elements.removeHighlightPill.addEventListener("click", clearHighlight);
  elements.searchInput.addEventListener("input", (event) => handleSearch(event.target.value));

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => applyView(tab.dataset.view));
  });

  elements.highlightFilter?.addEventListener("change", renderHighlights);
  elements.highlightSort?.addEventListener("change", renderHighlights);
  elements.favoriteFilter?.addEventListener("change", renderFavorites);
  elements.favoriteSort?.addEventListener("change", renderFavorites);
  elements.notesSort?.addEventListener("change", renderNotes);
  elements.startupToggle.addEventListener("change", (event) => {
    state.startupEnabled = event.target.checked;
    updateStartupVisibility();
    saveState();
  });

  elements.startupSelect.addEventListener("change", (event) => {
    state.startupMemoryId = event.target.value;
    state.startupActiveMemoryId = "";
    saveState();
    if (startupLocked) updateStartupOverlayContent();
  });

  if (elements.notesToggle) {
    elements.notesToggle.addEventListener("click", () => {
      state.notesVisible = !state.notesVisible;
      updateNotesVisibility();
      saveState();
    });
  }

  elements.startupContinue.addEventListener("click", hideStartupOverlay);
  elements.windowMinimize.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.minimize === "function") {
      window.appShell.minimize();
    }
  });
  elements.windowMaximize.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.toggleMaximize === "function") {
      window.appShell.toggleMaximize();
    }
  });
  elements.windowClose.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.closeApp === "function") {
      window.appShell.closeApp();
    } else {
      window.close();
    }
  });
  elements.appMinimize.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.minimize === "function") {
      window.appShell.minimize();
    }
  });
  elements.appMaximize.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.toggleMaximize === "function") {
      window.appShell.toggleMaximize();
    }
  });
  elements.appClose.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.closeApp === "function") {
      window.appShell.closeApp();
    } else {
      window.close();
    }
  });

  if (elements.authToggle) {
    elements.authToggle.addEventListener("click", async () => {
      if (authUser) {
        try {
          await signOut(auth);
        } catch (err) {
          console.warn("Sign out failed", err);
        }
        return;
      }
      openAuthModal();
    });
  }
  if (elements.authClose) {
    elements.authClose.addEventListener("click", closeAuthModal);
  }
  if (elements.authModal) {
    elements.authModal.addEventListener("click", (event) => {
      if (event.target === elements.authModal) {
        closeAuthModal();
      }
    });
  }
  if (elements.authEmailSignIn) {
    elements.authEmailSignIn.addEventListener("click", async () => {
      const email = elements.authEmail?.value?.trim() || "";
      const password = elements.authPassword?.value || "";
      if (!email || !password) {
        setAuthStatus("Enter email and password.");
        return;
      }
      setAuthStatus("Signing in...");
      try {
        await signInWithEmailAndPassword(auth, email, password);
        closeAuthModal();
      } catch (err) {
        console.warn("Email sign-in failed", err);
        setAuthStatus("Sign-in failed. Check your email and password.");
      }
    });
  }
  if (elements.authEmailCreate) {
    elements.authEmailCreate.addEventListener("click", async () => {
      const email = elements.authEmail?.value?.trim() || "";
      const password = elements.authPassword?.value || "";
      if (!email || !password) {
        setAuthStatus("Enter email and password.");
        return;
      }
      setAuthStatus("Creating account...");
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        closeAuthModal();
      } catch (err) {
        console.warn("Account creation failed", err);
        setAuthStatus("Could not create account. Try a stronger password.");
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (state.selected.size === 0) return;
    const isVerseCard = event.target.closest(".card");
    const isVerseInline = event.target.closest(".verse-inline");
    const inPalette = event.target.closest("#palette");
    const inXref = event.target.closest(".xref-popup");
    const inNote = event.target.closest(".note-popup");
    if (isVerseCard || isVerseInline || inPalette) return;
    if (inXref) return;
    if (inNote) return;
    clearSelection();
  });

  document.addEventListener("click", (event) => {
    const xrefBtn = event.target.closest(".xref-btn");
    if (xrefBtn) {
      event.stopPropagation();
      const verseId = xrefBtn.dataset.verseId;
      toggleCrossRefPopup(verseId);
      return;
    }
    const noteMarker = event.target.closest(".marker.note");
    if (noteMarker) {
      event.stopPropagation();
      const row = noteMarker.closest(".verse-inline");
      if (row?.dataset.verseId) {
        toggleNotePopup(row.dataset.verseId);
      }
      return;
    }
    const xrefLink = event.target.closest(".xref-link");
    if (xrefLink) {
      event.stopPropagation();
      const ref = xrefLink.dataset.ref;
      if (ref) {
        const [book, chapter, verse] = ref.split("|");
        if (!book || !chapter || !verse) return;
        const origin = state.xrefOrigin || {
          book: state.currentBook,
          chapter: state.currentChapter,
          verse: state.currentVerse
        };
        state.navStack.push(origin);
        updateFloatingBack();
        closeAllCrossRefPopups();
        jumpToVerse(book, chapter, verse);
      }
      return;
    }
    const inSelect = event.target.closest(".select-shell");
    if (inSelect) return;
    if (event.target.closest("#palette")) return;
    if (event.target.closest(".xref-popup")) return;
    if (event.target.closest(".note-popup")) return;
    if (event.target.closest(".marker.note")) return;
    closeAllSelectMenus();
    closeAllCrossRefPopups();
    document.querySelectorAll(".note-popup").forEach((popup) => {
      const textarea = popup.querySelector(".note-input");
      const value = textarea ? textarea.value.trim() : "";
      if (!value) {
        const id = popup.dataset.verseId;
        if (id) {
          delete state.notes[id];
        }
        popup.remove();
      }
    });
    saveState();
  });

  elements.prevChapterBtn.addEventListener("click", () => goToChapter(-1));
  elements.nextChapterBtn.addEventListener("click", () => goToChapter(1));
  elements.xrefBackFloating.addEventListener("click", () => {
    const prev = state.navStack.pop();
    if (prev) {
      closeAllCrossRefPopups();
      jumpToVerse(prev.book, prev.chapter, prev.verse);
    }
    updateFloatingBack();
  });
  if (elements.verseOfDay) {
    elements.verseOfDay.addEventListener("click", () => {
      const { book, chapter, verse } = elements.verseOfDay.dataset;
      if (book && chapter && verse) {
        state.navStack.push({
          book: state.currentBook,
          chapter: state.currentChapter,
          verse: state.currentVerse
        });
        updateFloatingBack();
        jumpToVerse(book, chapter, verse);
      }
    });
  }

  window.addEventListener("beforeunload", saveState);
}

function updateStartupVisibility() {
  const shell = elements.startupShell || elements.startupSelect?.closest(".select-shell");
  if (!shell) return;
  const hidden = !state.startupEnabled;
  shell.hidden = hidden;
  shell.style.display = hidden ? "none" : "";
}

function initAuth() {
  onAuthStateChanged(auth, (user) => {
    authUser = user || null;
    authReady = true;
    updateAuthButton();
    if (authUser) {
      loadCloudState(authUser);
    } else {
      lastCloudPayload = "";
      closeAuthModal();
    }
  });
}

loadState();
buildPalette();
bindEvents();
updateStartupVisibility();
updateNotesToggle();
if (shouldShowStartup()) {
  showStartupOverlay();
}
updateFloatingBack();
loadData()
  .then(() => {
    initAuth();
  })
  .catch((err) => {
    if (appClosed) return;
    console.error(err);
    setStatus("Failed to load the NIV data.");
  });
