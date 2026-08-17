import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getDatabase,
  onValue,
  ref,
  serverTimestamp,
  update
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const CAMPAIGN_ID = "main-campaign";
const CHARACTERS_PATH = `campaigns/${CAMPAIGN_ID}/characters`;
const DEFAULT_CHARACTER_NAMES = ["Rogue", "Character 2", "Character 3", "Character 4", "Character 5"];
const CHARACTER_IDS = ["character-1", "character-2", "character-3", "character-4", "character-5"];
const PAGE_IDS = ["core", "details", "spellcasting"];
const DICE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];
const DICE_ROLL_DURATION = 1220;
const DICE_ICON_PATHS = {
  d4: ["M50 8 90 84H10Z", "M50 8v76M10 84l40-40 40 40"],
  d6: ["M50 7 88 29v43L50 94 12 72V29Z", "M12 29l38 22 38-22M50 51v43"],
  d8: ["M50 6 90 50 50 94 10 50Z", "M50 6v88M10 50l40-17 40 17M10 50l40 17 40-17"],
  d10: ["M50 5 89 42 76 80 50 95 24 80 11 42Z", "M50 5 64 42 50 95 36 42ZM11 42h78M24 80l12-38M76 80 64 42"],
  d12: ["M50 5 79 16 95 43 89 74 65 94H35L11 74 5 43 21 16Z", "M50 24 72 40 64 66H36L28 40Z", "M50 5v19M79 16 72 40M95 43 64 66M89 74 64 66M65 94 64 66M35 94 36 66M11 74 36 66M5 43 28 40M21 16 28 40"],
  d20: ["M50 4 86 23 94 62 70 91H30L6 62 14 23Z", "M50 4 70 38 86 23M50 4 30 38 14 23M6 62l24-24h40l24 24M6 62l42-8-18 37M94 62l-42-8 18 37M30 38l18 16-18 37M70 38 52 54l18 37"],
  d100: ["M50 5 79 14 96 38 92 68 70 92H30L8 68 4 38 21 14Z", "M21 14 31 38 8 68M79 14 69 38 92 68M31 38h38L50 5ZM31 38 30 92l20-25 20 25-1-54M8 68l42-1 42 1"]
};
const LOCAL_PREVIEW_MODE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  && new URLSearchParams(window.location.search).get("preview") === "1";
const STORAGE_KEYS = {
  activePage: "adventurers-archive-active-page",
  cachedCharacters: "adventurers-archive-character-cache",
  campaignName: "adventurers-archive-campaign-name",
  diceHistory: "adventurers-archive-dice-history",
  dicePrefs: "adventurers-archive-dice-preferences",
  pendingWrites: "adventurers-archive-pending-writes",
  selectedCharacterId: "adventurers-archive-selected-character"
};

const ABILITY_CONFIG = [
  { key: "strength", label: "Strength", abbr: "STR" },
  { key: "dexterity", label: "Dexterity", abbr: "DEX" },
  { key: "constitution", label: "Constitution", abbr: "CON" },
  { key: "intelligence", label: "Intelligence", abbr: "INT" },
  { key: "wisdom", label: "Wisdom", abbr: "WIS" },
  { key: "charisma", label: "Charisma", abbr: "CHA" }
];

const SKILL_CONFIG = [
  { key: "acrobatics", label: "Acrobatics", ability: "dexterity", abbr: "DEX" },
  { key: "animalHandling", label: "Animal Handling", ability: "wisdom", abbr: "WIS" },
  { key: "arcana", label: "Arcana", ability: "intelligence", abbr: "INT" },
  { key: "athletics", label: "Athletics", ability: "strength", abbr: "STR" },
  { key: "deception", label: "Deception", ability: "charisma", abbr: "CHA" },
  { key: "history", label: "History", ability: "intelligence", abbr: "INT" },
  { key: "insight", label: "Insight", ability: "wisdom", abbr: "WIS" },
  { key: "intimidation", label: "Intimidation", ability: "charisma", abbr: "CHA" },
  { key: "investigation", label: "Investigation", ability: "intelligence", abbr: "INT" },
  { key: "medicine", label: "Medicine", ability: "wisdom", abbr: "WIS" },
  { key: "nature", label: "Nature", ability: "intelligence", abbr: "INT" },
  { key: "perception", label: "Perception", ability: "wisdom", abbr: "WIS" },
  { key: "performance", label: "Performance", ability: "charisma", abbr: "CHA" },
  { key: "persuasion", label: "Persuasion", ability: "charisma", abbr: "CHA" },
  { key: "religion", label: "Religion", ability: "intelligence", abbr: "INT" },
  { key: "sleightOfHand", label: "Sleight of Hand", ability: "dexterity", abbr: "DEX" },
  { key: "stealth", label: "Stealth", ability: "dexterity", abbr: "DEX" },
  { key: "survival", label: "Survival", ability: "wisdom", abbr: "WIS" }
];

const SPELL_LEVELS = [
  { key: "cantrips", label: "Cantrips", slotBased: false, defaultRows: 4 },
  { key: "level1", label: "Level 1", slotBased: true, defaultRows: 4 },
  { key: "level2", label: "Level 2", slotBased: true, defaultRows: 4 },
  { key: "level3", label: "Level 3", slotBased: true, defaultRows: 4 },
  { key: "level4", label: "Level 4", slotBased: true, defaultRows: 4 },
  { key: "level5", label: "Level 5", slotBased: true, defaultRows: 4 },
  { key: "level6", label: "Level 6", slotBased: true, defaultRows: 4 },
  { key: "level7", label: "Level 7", slotBased: true, defaultRows: 4 },
  { key: "level8", label: "Level 8", slotBased: true, defaultRows: 4 },
  { key: "level9", label: "Level 9", slotBased: true, defaultRows: 4 }
];

const SPELL_LEVEL_BADGES = {
  cantrips: "0",
  level1: "1",
  level2: "2",
  level3: "3",
  level4: "4",
  level5: "5",
  level6: "6",
  level7: "7",
  level8: "8",
  level9: "9"
};

function safeJsonParse(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("Malformed JSON encountered in localStorage.", error);
    return fallback;
  }
}

function readLocalStorage(key, fallback) {
  try {
    return safeJsonParse(localStorage.getItem(key), fallback);
  } catch (error) {
    console.warn(`Unable to read localStorage key "${key}".`, error);
    return fallback;
  }
}

function writeLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Unable to write localStorage key "${key}".`, error);
  }
}

function removeLocalStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Unable to remove localStorage key "${key}".`, error);
  }
}

function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  if (options.type) {
    element.type = options.type;
  }

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      if (value === false || value === undefined || value === null) {
        return;
      }
      if (value === true) {
        element.setAttribute(key, "");
      } else {
        element.setAttribute(key, String(value));
      }
    });
  }

  return element;
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function pathSegments(path) {
  return String(path)
    .split(/[./]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getNestedValue(source, path) {
  return pathSegments(path).reduce((current, segment) => {
    if (current == null) {
      return undefined;
    }
    return current[segment];
  }, source);
}

function setNestedValue(target, path, value) {
  const segments = pathSegments(path);
  let pointer = target;

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      pointer[segment] = value;
      return;
    }

    if (!isPlainObject(pointer[segment])) {
      pointer[segment] = {};
    }

    pointer = pointer[segment];
  });
}

function deleteNestedValue(target, path) {
  const segments = pathSegments(path);
  let pointer = target;

  for (let index = 0; index < segments.length - 1; index += 1) {
    pointer = pointer?.[segments[index]];
    if (!pointer) {
      return;
    }
  }

  if (pointer) {
    delete pointer[segments[segments.length - 1]];
  }
}

function deepMerge(defaultValue, providedValue) {
  if (providedValue === undefined) {
    return deepClone(defaultValue);
  }

  if (Array.isArray(defaultValue)) {
    return Array.isArray(providedValue) ? deepClone(providedValue) : deepClone(defaultValue);
  }

  if (isPlainObject(defaultValue)) {
    const merged = {};
    const sourceObject = isPlainObject(providedValue) ? providedValue : {};
    const keys = new Set([...Object.keys(defaultValue), ...Object.keys(sourceObject)]);

    keys.forEach((key) => {
      if (defaultValue[key] === undefined) {
        merged[key] = deepClone(sourceObject[key]);
      } else {
        merged[key] = deepMerge(defaultValue[key], sourceObject[key]);
      }
    });

    return merged;
  }

  return deepClone(providedValue);
}

function clampNumber(value, min, max, fallback = null) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  if (min !== undefined && numericValue < min) {
    return min;
  }

  if (max !== undefined && numericValue > max) {
    return max;
  }

  return numericValue;
}

function normalizeText(value, maxLength = 5000) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).slice(0, maxLength);
}

function createBlankAttackRow(id) {
  return {
    name: "",
    attackBonus: "",
    damage: "",
    damageType: "",
    notes: "",
    rowId: id
  };
}

function createBlankSpellRow(id) {
  return {
    prepared: false,
    spellName: "",
    notes: "",
    rowId: id
  };
}

function createStarterRows(prefix, count, factory) {
  const rows = {};

  for (let index = 1; index <= count; index += 1) {
    const id = `${prefix}-${index}`;
    rows[id] = factory(id);
  }

  return rows;
}

function buildDefaultSpellcasting() {
  const spellcasting = {
    spellcastingClass: "",
    spellcastingAbility: "",
    spellSaveDC: null,
    spellAttackBonus: null
  };

  SPELL_LEVELS.forEach((level) => {
    spellcasting[level.key] = {
      rows: createStarterRows(`spell-${level.key}`, level.defaultRows, createBlankSpellRow)
    };

    if (level.slotBased) {
      spellcasting[level.key].slotsTotal = null;
      spellcasting[level.key].slotsExpended = null;
    }
  });

  return spellcasting;
}

function buildDefaultSheet(defaultName) {
  return {
    settings: {},
    identity: {
      characterName: defaultName,
      class: "",
      level: 1,
      background: "",
      playerName: "",
      race: "",
      alignment: "",
      experiencePoints: 0
    },
    abilities: Object.fromEntries(ABILITY_CONFIG.map((ability) => [ability.key, { score: 10 }])),
    savingThrows: Object.fromEntries(ABILITY_CONFIG.map((ability) => [ability.key, { proficient: false }])),
    skills: Object.fromEntries(SKILL_CONFIG.map((skill) => [skill.key, { proficient: false, expertise: false }])),
    combat: {
      inspiration: null,
      proficiencyBonus: 2,
      armorClass: null,
      initiative: null,
      speed: null,
      hitPointMaximum: null,
      currentHitPoints: null,
      temporaryHitPoints: null,
      hitDiceTotal: "",
      hitDice: "",
      deathSaveSuccesses: 0,
      deathSaveFailures: 0
    },
    attacks: {
      rows: createStarterRows("attack", 6, createBlankAttackRow)
    },
    personality: {
      traits: "",
      ideals: "",
      bonds: "",
      flaws: ""
    },
    proficiencies: {
      other: ""
    },
    equipment: {
      items: "",
      currency: {
        cp: 0,
        sp: 0,
        ep: 0,
        gp: 0,
        pp: 0
      }
    },
    features: {
      featuresAndTraits: "",
      additionalFeaturesAndTraits: ""
    },
    appearance: {
      age: "",
      height: "",
      weight: "",
      eyes: "",
      skin: "",
      hair: "",
      characterAppearance: ""
    },
    organizations: {
      alliesAndOrganizations: "",
      organizationName: "",
      organizationSymbolDescription: ""
    },
    backstory: {
      characterBackstory: "",
      notes: ""
    },
    treasure: {
      treasure: ""
    },
    spellcasting: buildDefaultSpellcasting(),
    calculatedOverrides: {
      abilityModifiers: {},
      savingThrows: {},
      skills: {},
      passivePerception: null
    }
  };
}

function createDefaultCharacter(characterId, index, userStamp = "system", updatedAtValue = Date.now()) {
  const defaultName = DEFAULT_CHARACTER_NAMES[index];

  return {
    meta: {
      name: defaultName,
      order: index + 1,
      updatedAt: updatedAtValue,
      updatedBy: userStamp
    },
    sheet: buildDefaultSheet(defaultName)
  };
}

function normalizeRows(rows, minimumCount, factory, prefix) {
  const normalized = {};

  if (isPlainObject(rows)) {
    Object.entries(rows).forEach(([rowId, rowValue]) => {
      normalized[rowId] = deepMerge(factory(rowId), isPlainObject(rowValue) ? rowValue : {});
    });
  }

  let index = 1;
  while (Object.keys(normalized).length < minimumCount) {
    const rowId = `${prefix}-${index}`;
    if (!normalized[rowId]) {
      normalized[rowId] = factory(rowId);
    }
    index += 1;
  }

  return normalized;
}

function normalizeCharacter(rawCharacter, characterId, index) {
  const fallback = createDefaultCharacter(characterId, index);
  const merged = deepMerge(fallback, isPlainObject(rawCharacter) ? rawCharacter : {});
  const defaultName = DEFAULT_CHARACTER_NAMES[index];

  merged.meta.name = normalizeText(merged.meta.name || defaultName, 30).trim() || defaultName;
  merged.meta.order = clampNumber(merged.meta.order, 1, 5, index + 1);
  merged.sheet.identity.characterName = normalizeText(merged.sheet.identity.characterName || merged.meta.name, 80);
  merged.sheet.identity.level = clampNumber(merged.sheet.identity.level, 1, 20, 1);
  merged.sheet.identity.experiencePoints = clampNumber(merged.sheet.identity.experiencePoints, 0, 99999999, 0);

  ABILITY_CONFIG.forEach((ability) => {
    merged.sheet.abilities[ability.key].score = clampNumber(
      merged.sheet.abilities[ability.key].score,
      1,
      30,
      10
    );

    merged.sheet.savingThrows[ability.key].proficient = Boolean(merged.sheet.savingThrows[ability.key].proficient);
  });

  SKILL_CONFIG.forEach((skill) => {
    const skillEntry = merged.sheet.skills[skill.key];
    skillEntry.proficient = Boolean(skillEntry.proficient);
    skillEntry.expertise = Boolean(skillEntry.expertise);
  });

  if (merged.sheet.combat.inspiration === true) {
    merged.sheet.combat.inspiration = 1;
  } else if (
    merged.sheet.combat.inspiration === false ||
    merged.sheet.combat.inspiration === "" ||
    merged.sheet.combat.inspiration === undefined
  ) {
    merged.sheet.combat.inspiration = null;
  } else {
    merged.sheet.combat.inspiration = clampNumber(merged.sheet.combat.inspiration, 0, 99, null);
  }
  merged.sheet.combat.proficiencyBonus = clampNumber(merged.sheet.combat.proficiencyBonus, 0, 20, 2);

  merged.sheet.attacks.rows = normalizeRows(merged.sheet.attacks.rows, 6, createBlankAttackRow, "attack");

  SPELL_LEVELS.forEach((level) => {
    const levelEntry = merged.sheet.spellcasting[level.key] || {};
    levelEntry.rows = normalizeRows(levelEntry.rows, level.defaultRows, createBlankSpellRow, `spell-${level.key}`);
    if (level.slotBased) {
      levelEntry.slotsTotal = levelEntry.slotsTotal === null || levelEntry.slotsTotal === "" ? null : clampNumber(levelEntry.slotsTotal, 0, 99, null);
      levelEntry.slotsExpended =
        levelEntry.slotsExpended === null || levelEntry.slotsExpended === ""
          ? null
          : clampNumber(levelEntry.slotsExpended, 0, 99, null);
    }
    merged.sheet.spellcasting[level.key] = levelEntry;
  });

  return merged;
}

function flattenObject(source, prefix = "") {
  const flattened = {};

  if (!isPlainObject(source)) {
    if (prefix) {
      flattened[prefix] = source;
    }
    return flattened;
  }

  Object.entries(source).forEach(([key, value]) => {
    const nextPrefix = prefix ? `${prefix}/${key}` : key;

    if (isPlainObject(value) && Object.keys(value).length > 0) {
      Object.assign(flattened, flattenObject(value, nextPrefix));
    } else {
      flattened[nextPrefix] = value;
    }
  });

  return flattened;
}

function generateStableId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const randomValues = new Uint32Array(2);
  crypto.getRandomValues(randomValues);
  return `${prefix}-${Date.now()}-${randomValues[0].toString(16)}${randomValues[1].toString(16)}`;
}

function currentUserStamp() {
  if (!state.currentUser) {
    return "unknown-user";
  }

  return state.currentUser.email || state.currentUser.uid;
}

function formatSaveStatus() {
  if (LOCAL_PREVIEW_MODE) {
    return "Preview only";
  }

  if (state.permissionDenied) {
    return "Save failed";
  }

  if (!state.remoteReady && state.currentUser) {
    return "Syncing...";
  }

  if (state.isSyncingQueue) {
    return "Syncing...";
  }

  if (!navigator.onLine && Object.keys(state.queuedWrites).length > 0) {
    return "Offline - changes queued";
  }

  if (state.activeNetworkWrites > 0 || state.pendingDebouncers.size > 0) {
    return "Saving...";
  }

  if (state.lastWriteError) {
    return "Save failed";
  }

  return "Saved";
}

function describeTimestamp(timestampValue) {
  if (!timestampValue || typeof timestampValue === "object") {
    return "Waiting for Firebase...";
  }

  const date = new Date(timestampValue);

  if (Number.isNaN(date.getTime())) {
    return "Waiting for Firebase...";
  }

  return `Last updated ${date.toLocaleString()}`;
}

function friendlyAuthError(error) {
  switch (error?.code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That password was not recognized.";
    case "auth/too-many-requests":
      return "Too many sign-in attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "The network request failed. Check your connection and try again.";
    default:
      return "Unable to sign in right now. Please try again.";
  }
}

function friendlyDatabaseError(error) {
  switch (error?.code) {
    case "PERMISSION_DENIED":
    case "database/permission-denied":
      return "Permission denied. This signed-in account is not in the Firebase rules allowlist.";
    case "database/network-error":
      return "A network error prevented the save from reaching Firebase.";
    case "database/unavailable":
      return "Firebase Realtime Database is currently unavailable.";
    default:
      return "A database error interrupted synchronization.";
  }
}

function isRecoverableWriteError(error) {
  return [
    "database/network-error",
    "database/unavailable",
    "database/disconnected"
  ].includes(error?.code);
}

function isPermissionError(error) {
  return ["PERMISSION_DENIED", "database/permission-denied"].includes(error?.code);
}

function firebaseConfigIsPlaceholder(config) {
  const requiredKeys = ["apiKey", "authDomain", "databaseURL", "projectId", "storageBucket", "messagingSenderId", "appId"];

  return requiredKeys.some((key) => {
    const value = config?.[key];
    return !value || String(value).includes("YOUR_");
  });
}

const dom = {
  abilitiesGrid: document.getElementById("abilities-grid"),
  activePageButtons: Array.from(document.querySelectorAll("[data-page-tab]")),
  authErrorLive: document.getElementById("auth-error-live"),
  authLoadingScreen: document.getElementById("auth-loading-screen"),
  authScreen: document.getElementById("auth-screen"),
  campaignDisplay: document.getElementById("campaign-display"),
  campaignNameInput: document.getElementById("campaign-name-input"),
  characterTablist: document.getElementById("character-tablist"),
  clearDiceButton: document.getElementById("clear-dice-button"),
  clearHistoryButton: document.getElementById("clear-history-button"),
  configBanner: document.getElementById("config-banner"),
  dashboard: document.getElementById("dashboard"),
  diceBreakdown: document.getElementById("dice-breakdown"),
  diceButton: document.getElementById("dice-button"),
  diceCloseButton: document.getElementById("dice-close-button"),
  diceFormula: document.getElementById("dice-formula"),
  diceHistory: document.getElementById("dice-history"),
  diceLive: document.getElementById("dice-live"),
  diceModal: document.getElementById("dice-modal"),
  diceModifier: document.getElementById("dice-modifier"),
  diceResultCard: document.getElementById("dice-result-card"),
  diceTotal: document.getElementById("dice-total"),
  diceTray: document.getElementById("dice-tray"),
  diceTypeGroup: document.getElementById("dice-type-group"),
  emailInput: document.getElementById("email-input"),
  exportAllButton: document.getElementById("export-all-button"),
  exportCurrentButton: document.getElementById("export-current-button"),
  hpMeterFill: document.getElementById("hp-meter-fill"),
  importCharacterButton: document.getElementById("import-character-button"),
  importFileInput: document.getElementById("import-file-input"),
  lastUpdatedLabel: document.getElementById("last-updated-label"),
  loginButton: document.getElementById("login-button"),
  loginError: document.getElementById("login-error"),
  loginForm: document.getElementById("login-form"),
  offlineBanner: document.getElementById("offline-banner"),
  pagePanels: Array.from(document.querySelectorAll("[data-page-panel]")),
  pageTablist: document.getElementById("page-tablist"),
  passwordInput: document.getElementById("password-input"),
  permissionBanner: document.getElementById("permission-banner"),
  printSheetButton: document.getElementById("print-sheet-button"),
  remoteUpdateLive: document.getElementById("remote-update-live"),
  remoteUpdateMessage: document.getElementById("remote-update-message"),
  remoteUpdateNote: document.getElementById("remote-update-note"),
  resetCacheButton: document.getElementById("reset-cache-button"),
  rollButton: document.getElementById("roll-button"),
  saveStatusIndicator: document.getElementById("save-status-indicator"),
  saveStatusLive: document.getElementById("save-status-live"),
  savingThrowsList: document.getElementById("saving-throws-list"),
  settingsButton: document.getElementById("settings-button"),
  settingsCloseButton: document.getElementById("settings-close-button"),
  settingsForm: document.getElementById("settings-form"),
  settingsModal: document.getElementById("settings-modal"),
  sheetForm: document.getElementById("sheet-form"),
  sheetTitle: document.getElementById("sheet-title"),
  signoutButton: document.getElementById("signout-button"),
  spellSections: document.getElementById("spell-sections"),
  skillsList: document.getElementById("skills-list"),
  undoActionButton: document.getElementById("undo-action-button"),
  userLabel: document.getElementById("user-label")
};

const cachedCharacters = readLocalStorage(STORAGE_KEYS.cachedCharacters, null);
const initialCharacters = cachedCharacters
  ? Object.fromEntries(CHARACTER_IDS.map((characterId, index) => [characterId, normalizeCharacter(cachedCharacters[characterId], characterId, index)]))
  : Object.fromEntries(CHARACTER_IDS.map((characterId, index) => [characterId, createDefaultCharacter(characterId, index)]));

const state = {
  app: null,
  auth: null,
  currentModal: null,
  currentUser: null,
  collapsedSpellLevels: new Set(),
  db: null,
  diceHistory: readLocalStorage(STORAGE_KEYS.diceHistory, []).slice(0, 10),
  dicePrefs: {
    die: "d20",
    count: 1,
    modifier: "",
    ...readLocalStorage(STORAGE_KEYS.dicePrefs, {})
  },
  diceTray: [],
  diceTrayInitialized: false,
  isDiceRolling: false,
  editingTabId: null,
  initializingDefaults: false,
  isSyncingQueue: false,
  lastServerCharacters: null,
  lastWriteError: "",
  localCampaignName: readLocalStorage(STORAGE_KEYS.campaignName, "Main Campaign"),
  modalReturnFocus: null,
  pendingDebouncers: new Map(),
  inFlightWrites: new Map(),
  awaitingServerWrites: new Map(),
  pendingRemoteFields: new Set(),
  pageObserver: null,
  permissionDenied: false,
  queuedWrites: readLocalStorage(STORAGE_KEYS.pendingWrites, {}),
  remoteReady: false,
  saveNoteTimer: null,
  pendingUndo: null,
  undoTimer: null,
  selectedCharacterId: CHARACTER_IDS.includes(readLocalStorage(STORAGE_KEYS.selectedCharacterId, CHARACTER_IDS[0]))
    ? readLocalStorage(STORAGE_KEYS.selectedCharacterId, CHARACTER_IDS[0])
    : CHARACTER_IDS[0],
  selectedPage: PAGE_IDS.includes(readLocalStorage(STORAGE_KEYS.activePage, "core"))
    ? readLocalStorage(STORAGE_KEYS.activePage, "core")
    : "core",
  signInResolved: false,
  savingTabNameId: null,
  tabNameDraft: "",
  tabNameOriginal: "",
  characters: initialCharacters,
  activeNetworkWrites: 0
};

function persistCharacterCache() {
  writeLocalStorage(STORAGE_KEYS.cachedCharacters, state.characters);
}

function persistQueuedWrites() {
  writeLocalStorage(STORAGE_KEYS.pendingWrites, state.queuedWrites);
}

function persistDiceState() {
  state.dicePrefs.tray = state.diceTray.map(({ id, die, value }) => ({ id, die, value }));
  state.dicePrefs.count = state.diceTray.length;
  state.dicePrefs.die = state.diceTray.at(-1)?.die || state.dicePrefs.die || "d20";
  writeLocalStorage(STORAGE_KEYS.dicePrefs, state.dicePrefs);
  writeLocalStorage(STORAGE_KEYS.diceHistory, state.diceHistory);
}

function currentCharacter() {
  return state.characters[state.selectedCharacterId] || state.characters[CHARACTER_IDS[0]];
}

function renderTransientNote(message, timeout = 3000) {
  dom.remoteUpdateNote.hidden = false;
  dom.remoteUpdateMessage.textContent = message;
  dom.undoActionButton.hidden = true;
  dom.remoteUpdateLive.textContent = message;

  window.clearTimeout(state.saveNoteTimer);
  state.saveNoteTimer = window.setTimeout(() => {
    dom.remoteUpdateNote.hidden = true;
    dom.remoteUpdateMessage.textContent = "";
  }, timeout);
}

function clearUndoState() {
  window.clearTimeout(state.undoTimer);
  state.undoTimer = null;
  state.pendingUndo = null;
  dom.undoActionButton.hidden = true;
}

function finalizePendingUndo() {
  if (!state.pendingUndo) {
    return;
  }

  const pending = state.pendingUndo;
  clearUndoState();
  pending.commit();
}

function showUndoableNote(message, commit, undo, timeout = 5000) {
  finalizePendingUndo();
  window.clearTimeout(state.saveNoteTimer);

  state.pendingUndo = { commit, undo };
  dom.remoteUpdateNote.hidden = false;
  dom.remoteUpdateMessage.textContent = message;
  dom.undoActionButton.hidden = false;
  dom.remoteUpdateLive.textContent = `${message} Undo is available.`;

  state.undoTimer = window.setTimeout(() => {
    finalizePendingUndo();
    dom.remoteUpdateNote.hidden = true;
  }, timeout);
}

function undoPendingAction() {
  if (!state.pendingUndo) {
    return;
  }

  const pending = state.pendingUndo;
  clearUndoState();
  pending.undo();
  renderTransientNote("Restored.");
}

function renderBanners() {
  dom.offlineBanner.hidden = navigator.onLine;

  if (state.permissionDenied) {
    dom.permissionBanner.hidden = false;
    dom.permissionBanner.textContent =
      "This Firebase account authenticated successfully, but the Realtime Database rules denied access.";
  } else {
    dom.permissionBanner.hidden = true;
    dom.permissionBanner.textContent = "";
  }

  if (state.configError) {
    dom.configBanner.hidden = false;
    dom.configBanner.textContent = state.configError;
  } else {
    dom.configBanner.hidden = true;
    dom.configBanner.textContent = "";
  }
}

function renderSaveStatus() {
  const status = formatSaveStatus();
  dom.saveStatusIndicator.textContent = status;
  dom.saveStatusLive.textContent = status;
  const statusCard = dom.saveStatusIndicator.closest(".status-card");
  if (statusCard) {
    statusCard.dataset.state = status === "Saved" ? "saved" : status.includes("failed") ? "error" : "working";
  }
}

function renderCampaignDisplay() {
  dom.campaignDisplay.textContent = state.localCampaignName || "Main Campaign";
}

function renderAuthState() {
  const canShowDashboard = LOCAL_PREVIEW_MODE || (state.signInResolved && Boolean(state.currentUser) && !state.configError);
  const shouldShowAuth = state.signInResolved && !state.currentUser && !LOCAL_PREVIEW_MODE;

  dom.authLoadingScreen.hidden = canShowDashboard || state.signInResolved;
  dom.authScreen.hidden = canShowDashboard || !shouldShowAuth;
  dom.dashboard.hidden = !canShowDashboard;
  dom.authLoadingScreen.setAttribute("aria-hidden", String(dom.authLoadingScreen.hidden));
  dom.authScreen.setAttribute("aria-hidden", String(dom.authScreen.hidden));
  dom.dashboard.setAttribute("aria-hidden", String(dom.dashboard.hidden));
  dom.userLabel.textContent = LOCAL_PREVIEW_MODE ? "Local preview" : state.currentUser ? currentUserStamp() : "Not signed in";
  dom.signoutButton.hidden = LOCAL_PREVIEW_MODE;
  dom.loginButton.disabled = Boolean(state.configError);
  renderBanners();
  renderSaveStatus();
}

function renderPageTabs() {
  dom.activePageButtons.forEach((button) => {
    const isSelected = button.dataset.pageTab === state.selectedPage;
    button.setAttribute("aria-selected", String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  });
}

function scrollToSelectedPagePanel() {
  const selectedPanel = dom.pagePanels.find((panel) => panel.dataset.pagePanel === state.selectedPage);
  if (!selectedPanel) {
    return;
  }

  requestAnimationFrame(() => {
    selectedPanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function renderCharacterTabs() {
  dom.characterTablist.textContent = "";

  CHARACTER_IDS.forEach((characterId, index) => {
    const character = state.characters[characterId] || createDefaultCharacter(characterId, index);
    const currentName = character.meta.name;
    const identity = character.sheet?.identity || {};
    const initials = currentName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || String(index + 1);
    const wrapper = createElement("div", {
      className: `character-card${characterId === state.selectedCharacterId ? " is-selected" : ""}`
    });

    if (state.editingTabId === characterId) {
      const input = createElement("input", {
        className: "tab-name-editor",
        type: "text",
        attributes: {
          "aria-label": `Rename ${currentName || "character"}`,
          "data-tab-name-input": characterId,
          maxlength: 30,
          value: state.tabNameDraft
        }
      });

      wrapper.appendChild(input);
      dom.characterTablist.appendChild(wrapper);
      queueMicrotask(() => {
        input.focus();
        input.select();
      });
      return;
    }

    const tabButton = createElement("button", {
      className: "character-tab",
      type: "button",
      attributes: {
        role: "tab",
        "aria-selected": characterId === state.selectedCharacterId,
        tabindex: characterId === state.selectedCharacterId ? 0 : -1,
        "data-character-tab": characterId
      }
    });

    const profile = createElement("div", { className: "character-tab-profile" });
    const avatar = createElement("span", { className: "character-tab-avatar", text: initials });
    const title = createElement("span", { className: "character-tab-title", text: character.meta.name });
    const playerName = createElement("span", {
      className: "character-tab-player",
      text: identity.playerName || "No player name"
    });
    const titleBlock = createElement("div", { className: "character-tab-title-block" });
    titleBlock.append(title, playerName);
    profile.append(avatar, titleBlock);
    tabButton.appendChild(profile);

    const profileDetails = [identity.class, identity.level ? `Level ${identity.level}` : ""].filter(Boolean);
    const metaText = state.savingTabNameId === characterId ? "Saving..." : profileDetails.join(" | ") || "Character details not set";
    tabButton.appendChild(createElement("span", { className: "character-tab-meta", text: metaText }));

    const editButton = createElement("button", {
      className: "tab-edit-button",
      type: "button",
      text: "...",
      attributes: {
        "aria-label": `Rename ${currentName}`,
        title: `Rename ${currentName}`,
        "data-character-edit": characterId
      }
    });

    wrapper.append(tabButton, editButton);
    dom.characterTablist.appendChild(wrapper);
  });
}

function renderSheetHeader() {
  const character = currentCharacter();
  dom.sheetTitle.textContent = character?.meta?.name || "Current Character";
  dom.lastUpdatedLabel.textContent = character
    ? `${describeTimestamp(character.meta.updatedAt)}${character.meta.updatedBy ? ` | ${character.meta.updatedBy}` : ""}`
    : "Waiting for Firebase...";
}

function controlDesiredValue(control, character) {
  const fieldPath = control.dataset.field;

  if (!fieldPath) {
    return "";
  }

  if (control.dataset.attackCombined) {
    const rowId = control.dataset.attackCombined;
    const damage = getNestedValue(character.sheet, `attacks.rows.${rowId}.damage`) || "";
    const damageType = getNestedValue(character.sheet, `attacks.rows.${rowId}.damageType`) || "";
    return [damage, damageType].filter(Boolean).join(" ").trim();
  }

  return getNestedValue(character.sheet, fieldPath);
}

function formatSignedManualValue(value) {
  const trimmedValue = normalizeText(value ?? "", 8).trim();
  if (trimmedValue === "") {
    return "";
  }

  const numericValue = Number(trimmedValue);
  if (!Number.isFinite(numericValue)) {
    return "";
  }

  if (numericValue === 0) {
    return "+0";
  }

  return numericValue > 0 ? `+${numericValue}` : String(numericValue);
}

function renderFieldControl(control, character) {
  const desiredValue = controlDesiredValue(control, character);
  const isFocused = document.activeElement === control;

  if (control.type === "checkbox") {
    control.checked = Boolean(desiredValue);
    return;
  }

  if (isFocused) {
    const currentValue = control.value;
    const desiredComparable = String(desiredValue ?? "");
    if (currentValue !== desiredComparable) {
      state.pendingRemoteFields.add(control.dataset.field);
    }
    return;
  }

  control.value = control.dataset.signedNumber
    ? formatSignedManualValue(desiredValue)
    : desiredValue ?? "";
}

function renderVitalControls(character) {
  const current = Number(getNestedValue(character, "sheet.combat.currentHitPoints"));
  const maximum = Number(getNestedValue(character, "sheet.combat.hitPointMaximum"));
  const validMaximum = Number.isFinite(maximum) && maximum > 0;
  const percentage = validMaximum && Number.isFinite(current)
    ? Math.max(0, Math.min(100, (current / maximum) * 100))
    : 0;

  if (dom.hpMeterFill) {
    dom.hpMeterFill.style.width = `${percentage}%`;
    dom.hpMeterFill.parentElement.dataset.state = percentage <= 25 ? "critical" : percentage <= 50 ? "wounded" : "healthy";
  }

  dom.sheetForm.querySelectorAll("[data-death-save-group]").forEach((group) => {
    const fieldPath = group.dataset.deathSaveGroup;
    const value = Number(getNestedValue(character, `sheet.${fieldPath}`)) || 0;
    group.querySelectorAll("[data-death-save-value]").forEach((button) => {
      const pipValue = Number(button.dataset.deathSaveValue);
      button.setAttribute("aria-pressed", String(pipValue <= value));
    });
  });
}

function renderSpellSlotPips(character) {
  dom.spellSections.querySelectorAll("[data-spell-slot-pips]").forEach((container) => {
    const levelKey = container.dataset.spellSlotPips;
    const total = Math.max(0, Math.min(9, Number(getNestedValue(character, `sheet.spellcasting.${levelKey}.slotsTotal`)) || 0));
    const expended = Math.max(0, Math.min(total, Number(getNestedValue(character, `sheet.spellcasting.${levelKey}.slotsExpended`)) || 0));
    container.textContent = "";

    if (!total) {
      container.appendChild(createElement("span", { className: "spell-slot-empty", text: "Set total slots to create pips" }));
      return;
    }

    for (let index = 1; index <= total; index += 1) {
      container.appendChild(
        createElement("button", {
          className: "spell-slot-pip",
          type: "button",
          attributes: {
            "aria-label": `${index <= expended ? "Restore" : "Expend"} spell slot ${index}`,
            "aria-pressed": index <= expended,
            "data-spell-slot-level": levelKey,
            "data-spell-slot-value": index
          }
        })
      );
    }
  });
}

function renderAllFields() {
  const character = currentCharacter();
  if (!character) {
    return;
  }

  Array.from(dom.sheetForm.querySelectorAll("[data-field]")).forEach((control) => {
    renderFieldControl(control, character);
  });

  renderVitalControls(character);
  renderSpellSlotPips(character);
}

function renderAttacks() {
  const tbody = document.getElementById("attacks-body");
  const rows = getNestedValue(currentCharacter(), "sheet.attacks.rows") || {};
  tbody.textContent = "";

  Object.entries(rows).forEach(([rowId]) => {
    const row = createElement("tr", { className: "attack-row" });
    const nameCell = createElement("td", { attributes: { "data-label": "Name" } });
    nameCell.appendChild(
      createElement("input", {
        type: "text",
        attributes: {
          "aria-label": `Attack name for ${rowId}`,
          "data-field": `attacks.rows.${rowId}.name`
        }
      })
    );
    row.appendChild(nameCell);

    const bonusCell = createElement("td", { attributes: { "data-label": "Attack Bonus" } });
    bonusCell.appendChild(
      createElement("input", {
        type: "text",
        attributes: {
          "aria-label": `Attack bonus for ${rowId}`,
          "data-field": `attacks.rows.${rowId}.attackBonus`
        }
      })
    );
    row.appendChild(bonusCell);

    const damageCell = createElement("td", {
      className: "attack-damage-cell",
      attributes: { "data-label": "Damage / Type" }
    });
    damageCell.appendChild(
      createElement("input", {
        type: "text",
        attributes: {
          "aria-label": `Damage and type for ${rowId}`,
          "data-field": `attacks.rows.${rowId}.damage`,
          "data-attack-combined": rowId
        }
      })
    );
    row.appendChild(damageCell);

    const actionCell = createElement("td", {
      className: "attack-action-cell",
      attributes: { "data-label": "Action" }
    });
    actionCell.appendChild(
      createElement("button", {
        className: "btn btn-danger btn-small icon-action-button delete-icon-button",
        type: "button",
        attributes: {
          "aria-label": `Delete attack ${rowId}`,
          title: "Delete attack",
          "data-delete-attack": rowId
        }
      })
    );
    row.appendChild(actionCell);
    tbody.appendChild(row);
  });

  renderAllFields();
}

function renderSpellSections() {
  dom.spellSections.textContent = "";
  const character = currentCharacter();

  SPELL_LEVELS.forEach((level) => {
    const isCollapsed = state.collapsedSpellLevels.has(level.key);
    const rows = getNestedValue(character, `sheet.spellcasting.${level.key}.rows`) || {};
    const spellCount = Object.keys(rows).length;
    const section = createElement("section", {
      className: `spell-section spell-section-${level.key}${isCollapsed ? " is-collapsed" : ""}`
    });
    const header = createElement("div", { className: "spell-section-header" });
    const collapseButton = createElement("button", {
      className: "spell-collapse-button",
      type: "button",
      attributes: {
        "aria-expanded": !isCollapsed,
        "data-toggle-spell-level": level.key
      }
    });
    const badge = createElement("span", {
      className: "spell-level-badge",
      text: SPELL_LEVEL_BADGES[level.key]
    });
    const title = createElement("h3", {
      className: "spell-level-title",
      text: level.label
    });
    const count = createElement("span", {
      className: "spell-count",
      text: `${spellCount} ${spellCount === 1 ? "spell" : "spells"}`
    });
    const titleWrap = createElement("span", { className: "spell-title-wrap" });
    const chevron = createElement("span", { className: "spell-chevron", text: "+" });
    titleWrap.append(title, count);
    collapseButton.append(badge, titleWrap, chevron);
    const addButton = createElement("button", {
      className: "btn btn-secondary btn-small spell-add-button",
      type: "button",
      text: "Add",
      attributes: {
        "data-add-spell": level.key
      }
    });

    header.append(collapseButton, addButton);
    const body = createElement("div", { className: "spell-section-body" });
    body.hidden = isCollapsed;
    section.append(header, body);

    if (level.slotBased) {
      const metaGrid = createElement("div", { className: "spell-meta-grid" });
      ["slotsTotal", "slotsExpended"].forEach((fieldKey) => {
        const field = createElement("label", { className: "field-block" });
        const labelText = fieldKey === "slotsTotal" ? "Slots Total" : "Slots Expended";
        field.appendChild(createElement("span", { text: labelText }));
        field.appendChild(
          createElement("input", {
            type: "number",
            attributes: {
              "aria-label": `${labelText} for ${level.label}`,
              "data-field": `spellcasting.${level.key}.${fieldKey}`,
              min: 0,
              max: 99,
              inputmode: "numeric"
            }
          })
        );
        metaGrid.appendChild(field);
      });
      body.appendChild(metaGrid);
      body.appendChild(
        createElement("div", {
          className: "spell-slot-pips",
          attributes: {
            "data-spell-slot-pips": level.key,
            "aria-label": `${level.label} spell slots`
          }
        })
      );
    }

    const table = createElement("table", { className: "spell-table" });
    const thead = createElement("thead");
    const headRow = createElement("tr");
    ["Prep", "Spell", "Notes", "Action"].forEach((label) => {
      headRow.appendChild(createElement("th", { text: label }));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = createElement("tbody");
    Object.entries(rows).forEach(([rowId]) => {
      const row = createElement("tr", { className: "spell-row" });

      const preparedCell = createElement("td", {
        className: "spell-prepared-cell",
        attributes: { "data-label": "Prepared" }
      });
      preparedCell.appendChild(
        createElement("input", {
          type: "checkbox",
          attributes: {
            "aria-label": `Prepared status for ${level.label} ${rowId}`,
            "data-field": `spellcasting.${level.key}.rows.${rowId}.prepared`
          }
        })
      );
      row.appendChild(preparedCell);

      const nameCell = createElement("td", { attributes: { "data-label": "Spell" } });
      nameCell.appendChild(
        createElement("input", {
          type: "text",
          attributes: {
            "aria-label": `Spell name for ${level.label} ${rowId}`,
            "data-field": `spellcasting.${level.key}.rows.${rowId}.spellName`
          }
        })
      );
      row.appendChild(nameCell);

      const notesCell = createElement("td", { attributes: { "data-label": "Notes" } });
      notesCell.appendChild(
        createElement("textarea", {
          attributes: {
            "aria-label": `Spell notes for ${level.label} ${rowId}`,
            "data-field": `spellcasting.${level.key}.rows.${rowId}.notes`,
            rows: 2
          }
        })
      );
      row.appendChild(notesCell);

      const actionCell = createElement("td", {
        className: "spell-action-cell",
        attributes: { "data-label": "Action" }
      });
      actionCell.appendChild(
        createElement("button", {
          className: "btn btn-danger btn-small icon-action-button spell-delete-button delete-icon-button",
          type: "button",
          attributes: {
            title: "Delete spell",
            "aria-label": `Delete ${level.label} ${rowId}`,
            "data-delete-spell": `${level.key}:${rowId}`
          }
        })
      );
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    body.appendChild(table);
    dom.spellSections.appendChild(section);
  });

  renderAllFields();
}

function createDiceIcon(dieType, className = "dice-icon") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");

  (DICE_ICON_PATHS[dieType] || DICE_ICON_PATHS.d20).forEach((pathData) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
  });

  return svg;
}

function ensureDiceTray() {
  if (state.diceTrayInitialized) {
    return;
  }

  const storedTray = state.dicePrefs.tray;
  if (Array.isArray(storedTray)) {
    state.diceTray = storedTray
      .filter((entry) => DICE_TYPES.includes(entry?.die))
      .slice(0, 20)
      .map((entry) => ({
        id: entry.id || generateStableId("die"),
        die: entry.die,
        value: clampNumber(entry.value, 1, Number(entry.die.slice(1)), 1)
      }));
  } else {
    const legacyDie = DICE_TYPES.includes(state.dicePrefs.die) ? state.dicePrefs.die : "d20";
    const legacyCount = clampNumber(state.dicePrefs.count, 1, 10, 1);
    const sides = Number(legacyDie.slice(1));
    state.diceTray = Array.from({ length: legacyCount }, () => ({
      id: generateStableId("die"),
      die: legacyDie,
      value: cryptoRoll(sides)
    }));
  }

  state.diceTrayInitialized = true;
}

function diceFormula(dice, modifier = 0) {
  const parts = DICE_TYPES.map((dieType) => {
    const count = dice.filter((die) => die.die === dieType).length;
    return count ? `${count}${dieType}` : "";
  }).filter(Boolean);
  const baseFormula = parts.join(" + ");
  return modifier
    ? `${baseFormula}${baseFormula ? " " : ""}${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}`
    : baseFormula;
}

function currentDiceResult() {
  ensureDiceTray();
  const modifier = clampNumber(state.dicePrefs.modifier, -99, 99, 0);
  const dice = state.diceTray.map((entry) => ({ ...entry }));
  const total = dice.reduce((sum, entry) => sum + Number(entry.value || 0), 0) + modifier;

  return {
    formula: diceFormula(dice, modifier),
    dice,
    results: dice.map((entry) => entry.value),
    modifier,
    total,
    isNatural20: dice.length === 1 && dice[0].die === "d20" && modifier === 0 && dice[0].value === 20,
    isNatural1: dice.length === 1 && dice[0].die === "d20" && modifier === 0 && dice[0].value === 1
  };
}

function parseOptionalDiceModifier(value) {
  const trimmedValue = String(value ?? "").trim();
  return trimmedValue === "" ? "" : clampNumber(trimmedValue, -99, 99, 0);
}

function renderDiceOptions() {
  dom.diceTypeGroup.textContent = "";

  DICE_TYPES.forEach((dieType) => {
    const count = state.diceTray.filter((die) => die.die === dieType).length;
    const button = createElement("button", {
      className: `dice-type-button${count ? " has-dice" : ""}`,
      type: "button",
      attributes: {
        "aria-label": `Add ${dieType}${count ? `, ${count} currently in tray` : ""}`,
        "data-die": dieType,
        "data-count": count
      }
    });
    button.append(
      createDiceIcon(dieType),
      createElement("span", { className: "dice-type-label", text: dieType })
    );
    if (count) {
      button.appendChild(createElement("span", { className: "dice-type-count", text: count }));
    }
    dom.diceTypeGroup.appendChild(button);
  });
}

function renderDiceTray() {
  dom.diceTray.textContent = "";

  if (!state.diceTray.length) {
    const emptyState = createElement("div", { className: "dice-tray-empty" });
    emptyState.append(
      createDiceIcon("d20", "dice-empty-icon"),
      createElement("strong", { text: "Your dice tray is empty" }),
      createElement("span", { text: "Choose a die below to roll it." })
    );
    dom.diceTray.appendChild(emptyState);
    return;
  }

  state.diceTray.forEach((die, index) => {
    const button = createElement("button", {
      className: "dice-tray-item",
      type: "button",
      attributes: {
        "aria-label": `Remove ${die.die} showing ${die.value}`,
        title: `Remove this ${die.die}`,
        "data-remove-die": die.id,
        "data-die-type": die.die
      }
    });
    const rollX = ((index % 5) - 2) * 11;
    const rollDirection = index % 2 === 0 ? 1 : -1;
    button.style.setProperty("--roll-delay", `${Math.min(index, 7) * 42}ms`);
    button.style.setProperty("--roll-x", `${rollX}px`);
    button.style.setProperty("--roll-x-back", `${rollX * -0.35}px`);
    button.style.setProperty("--roll-x-small", `${rollX * 0.35}px`);
    button.style.setProperty("--roll-spin-65", `${65 * rollDirection}deg`);
    button.style.setProperty("--roll-spin-190", `${190 * rollDirection}deg`);
    button.style.setProperty("--roll-spin-285", `${285 * rollDirection}deg`);
    button.style.setProperty("--roll-spin-332", `${332 * rollDirection}deg`);
    button.style.setProperty("--roll-spin-360", `${360 * rollDirection}deg`);
    const face = createElement("span", { className: "dice-result-face" });
    face.append(
      createDiceIcon(die.die, "dice-result-icon"),
      createElement("strong", { className: "dice-face-value", text: die.value })
    );
    button.append(
      face,
      createElement("span", { className: "dice-result-type", text: die.die })
    );
    dom.diceTray.appendChild(button);
  });
}

function renderDiceInputs() {
  ensureDiceTray();
  const modifier = parseOptionalDiceModifier(state.dicePrefs.modifier);
  dom.diceModifier.value = modifier === "" || modifier === 0 ? "" : String(modifier);
  renderDiceOptions();
  renderDiceTray();
  renderDiceResult(currentDiceResult());
}

function renderDiceHistory() {
  dom.diceHistory.textContent = "";

  if (!state.diceHistory.length) {
    dom.diceHistory.appendChild(createElement("li", { className: "empty-history", text: "No rolls recorded yet." }));
    return;
  }

  state.diceHistory.forEach((entry) => {
    const results = Array.isArray(entry.dice)
      ? entry.dice.map((die) => `${die.die}: ${die.value}`).join(", ")
      : (entry.results || []).join(", ");
    const item = createElement("li", { className: "dice-history-item" });
    const copy = createElement("span", { className: "dice-history-copy" });
    copy.append(
      createElement("strong", { text: entry.formula || "Roll" }),
      createElement("small", { text: results || "No dice" })
    );
    item.append(copy, createElement("strong", { className: "dice-history-total", text: entry.total }));
    dom.diceHistory.appendChild(item);
  });
}

function renderCalculatedSections() {
  renderAttacks();
  renderSpellSections();
}

function dynamicSectionSignature(character) {
  const parts = [state.selectedCharacterId];
  const attackKeys = Object.keys(getNestedValue(character, "sheet.attacks.rows") || {}).sort();
  parts.push(`attacks:${attackKeys.join(",")}`);

  SPELL_LEVELS.forEach((level) => {
    const spellKeys = Object.keys(getNestedValue(character, `sheet.spellcasting.${level.key}.rows`) || {}).sort();
    parts.push(`${level.key}:${spellKeys.join(",")}`);
  });

  return parts.join("|");
}

function renderSheet() {
  renderCampaignDisplay();
  renderPageTabs();
  renderCharacterTabs();
  renderSheetHeader();
  const signature = dynamicSectionSignature(currentCharacter());
  if (state.lastDynamicSectionSignature !== signature) {
    renderCalculatedSections();
    state.lastDynamicSectionSignature = signature;
  }
  renderAllFields();
  renderSaveStatus();
}

function queueWrite(characterId, relativePath, value) {
  const key = `${characterId}:${relativePath}`;
  state.queuedWrites[key] = {
    characterId,
    relativePath,
    value,
    queuedAt: Date.now()
  };
  persistQueuedWrites();
  renderSaveStatus();
}

function removeQueuedWrite(characterId, relativePath) {
  delete state.queuedWrites[`${characterId}:${relativePath}`];
  persistQueuedWrites();
}

function writeKey(characterId, relativePath) {
  return `${characterId}:${relativePath}`;
}

function valuesMatchForAck(snapshotValue, pendingValue) {
  if (pendingValue === null) {
    return snapshotValue === null || snapshotValue === undefined;
  }

  return snapshotValue === pendingValue;
}

function applyRelativeUpdate(characterId, relativePath, value) {
  const character = state.characters[characterId];
  if (!character) {
    return;
  }

  if (value === null) {
    deleteNestedValue(character, relativePath);
  } else {
    setNestedValue(character, relativePath, value);
  }

  persistCharacterCache();
}

function relativePathFromFieldPath(fieldPath) {
  return `sheet/${fieldPath.replaceAll(".", "/")}`;
}

function scheduleWrite(characterId, relativePath, value, delay) {
  const key = writeKey(characterId, relativePath);
  const existing = state.pendingDebouncers.get(key);
  if (existing) {
    clearTimeout(existing.timerId);
  }

  const timerId = window.setTimeout(() => {
    const pending = state.pendingDebouncers.get(key);
    if (!pending) {
      return;
    }

    state.pendingDebouncers.delete(key);
    state.inFlightWrites.set(key, {
      characterId: pending.characterId,
      relativePath: pending.relativePath,
      value: pending.value
    });
    commitWrite(characterId, relativePath, value, { pendingKey: key, writeKey: key });
    renderSaveStatus();
  }, delay);

  state.pendingDebouncers.set(key, { timerId, characterId, relativePath, value });
  renderSaveStatus();
}

function flushPendingWrites(characterId) {
  Array.from(state.pendingDebouncers.entries()).forEach(([key, pending]) => {
    if (characterId && pending.characterId !== characterId) {
      return;
    }
    clearTimeout(pending.timerId);
    state.pendingDebouncers.delete(key);
    commitWrite(pending.characterId, pending.relativePath, pending.value);
  });
  renderSaveStatus();
}

async function commitWrite(characterId, relativePath, value, options = {}) {
  const queueable = options.queueable !== false;
  const pendingKey = options.pendingKey || null;
  const key = options.writeKey || writeKey(characterId, relativePath);

  if (LOCAL_PREVIEW_MODE) {
    if (pendingKey) {
      state.inFlightWrites.delete(pendingKey);
    }
    renderSaveStatus();
    return;
  }

  if (!state.db || !state.currentUser) {
    if (queueable) {
      queueWrite(characterId, relativePath, value);
    }
    if (pendingKey) {
      state.inFlightWrites.delete(pendingKey);
    }
    return;
  }

  if (!navigator.onLine) {
    if (queueable) {
      queueWrite(characterId, relativePath, value);
    }
    if (pendingKey) {
      state.inFlightWrites.delete(pendingKey);
    }
    return;
  }

  state.activeNetworkWrites += 1;
  state.lastWriteError = "";
  renderSaveStatus();

  try {
    const characterRef = ref(state.db, `${CHARACTERS_PATH}/${characterId}`);
    const payload = {
      [relativePath]: value,
      "meta/updatedAt": serverTimestamp(),
      "meta/updatedBy": currentUserStamp()
    };

    await update(characterRef, payload);
    removeQueuedWrite(characterId, relativePath);
    state.permissionDenied = false;
    state.awaitingServerWrites.set(key, {
      characterId,
      relativePath,
      value
    });
  } catch (error) {
    console.error("Firebase write failed.", error);
    state.lastWriteError = friendlyDatabaseError(error);
    state.awaitingServerWrites.delete(key);

    if (isPermissionError(error)) {
      state.permissionDenied = true;
    } else if (queueable && isRecoverableWriteError(error)) {
      queueWrite(characterId, relativePath, value);
    }
  } finally {
    if (pendingKey) {
      state.inFlightWrites.delete(pendingKey);
    }
    state.activeNetworkWrites -= 1;
    renderBanners();
    renderSaveStatus();
  }
}

async function flushQueuedWrites() {
  if (!state.currentUser || !state.db || !navigator.onLine) {
    return;
  }

  const entries = Object.values(state.queuedWrites).sort((left, right) => left.queuedAt - right.queuedAt);
  if (!entries.length) {
    return;
  }

  state.isSyncingQueue = true;
  renderSaveStatus();

  for (const entry of entries) {
    await commitWrite(entry.characterId, entry.relativePath, entry.value, { queueable: true });
    if (!navigator.onLine || state.permissionDenied) {
      break;
    }
  }

  state.isSyncingQueue = false;
  renderSaveStatus();
}

function overlayPendingChanges(characters) {
  const merged = deepClone(characters);

  Object.values(state.queuedWrites).forEach((entry) => {
    if (merged[entry.characterId]) {
      applyRelativeUpdateToTarget(merged[entry.characterId], entry.relativePath, entry.value);
    }
  });

  state.pendingDebouncers.forEach((pending) => {
    if (merged[pending.characterId]) {
      applyRelativeUpdateToTarget(merged[pending.characterId], pending.relativePath, pending.value);
    }
  });

  state.inFlightWrites.forEach((pending) => {
    if (merged[pending.characterId]) {
      applyRelativeUpdateToTarget(merged[pending.characterId], pending.relativePath, pending.value);
    }
  });

  state.awaitingServerWrites.forEach((pending) => {
    if (merged[pending.characterId]) {
      applyRelativeUpdateToTarget(merged[pending.characterId], pending.relativePath, pending.value);
    }
  });

  return merged;
}

function applyRelativeUpdateToTarget(target, relativePath, value) {
  if (value === null) {
    deleteNestedValue(target, relativePath);
  } else {
    setNestedValue(target, relativePath, value);
  }
}

async function initializeDefaultCharactersIfNeeded(remoteValue) {
  if (!state.currentUser || state.initializingDefaults || !state.db) {
    return;
  }

  const missingIds = CHARACTER_IDS.filter((characterId) => !remoteValue?.[characterId]);
  if (!missingIds.length) {
    return;
  }

  state.initializingDefaults = true;

  try {
    const payload = {};
    missingIds.forEach((characterId, index) => {
      const characterIndex = CHARACTER_IDS.indexOf(characterId);
      payload[characterId] = createDefaultCharacter(characterId, characterIndex, currentUserStamp(), serverTimestamp());
    });
    await update(ref(state.db, CHARACTERS_PATH), payload);
  } catch (error) {
    console.error("Default character initialization failed.", error);
    state.lastWriteError = friendlyDatabaseError(error);
    if (isPermissionError(error)) {
      state.permissionDenied = true;
      renderBanners();
    }
  } finally {
    state.initializingDefaults = false;
    renderSaveStatus();
  }
}

function applyIncomingSnapshot(snapshotValue) {
  const normalized = Object.fromEntries(
    CHARACTER_IDS.map((characterId, index) => [characterId, normalizeCharacter(snapshotValue?.[characterId], characterId, index)])
  );

  state.awaitingServerWrites.forEach((pending, key) => {
    const snapshotCharacter = snapshotValue?.[pending.characterId];
    const snapshotFieldValue = getNestedValue(snapshotCharacter, pending.relativePath);
    if (valuesMatchForAck(snapshotFieldValue, pending.value)) {
      state.awaitingServerWrites.delete(key);
    }
  });

  if (state.lastServerCharacters) {
    const selected = state.selectedCharacterId;
    const previousMeta = state.lastServerCharacters[selected]?.meta;
    const incomingMeta = normalized[selected]?.meta;
    if (
      previousMeta?.updatedAt !== incomingMeta?.updatedAt &&
      incomingMeta?.updatedBy &&
      incomingMeta.updatedBy !== currentUserStamp()
    ) {
      renderTransientNote("Updated by another player.");
    }
  }

  state.lastServerCharacters = deepClone(normalized);
  state.characters = overlayPendingChanges(normalized);
  persistCharacterCache();
  renderSheet();
}

function attachCharactersListener() {
  if (!state.db || !state.currentUser) {
    return;
  }

  if (typeof state.charactersUnsubscribe === "function") {
    state.charactersUnsubscribe();
  }

  state.remoteReady = false;
  renderSaveStatus();
  renderSheet();

  state.charactersUnsubscribe = onValue(
    ref(state.db, CHARACTERS_PATH),
    async (snapshot) => {
      state.remoteReady = true;
      state.permissionDenied = false;
      renderBanners();
      const rawValue = snapshot.val() || {};
      await initializeDefaultCharactersIfNeeded(rawValue);
      applyIncomingSnapshot(rawValue);
      flushQueuedWrites();
      renderSaveStatus();
    },
    (error) => {
      console.error("Firebase listener error.", error);
      state.remoteReady = true;
      state.lastWriteError = friendlyDatabaseError(error);
      state.permissionDenied = isPermissionError(error);
      renderBanners();
      renderSaveStatus();
    }
  );
}

function detachCharactersListener() {
  if (typeof state.charactersUnsubscribe === "function") {
    state.charactersUnsubscribe();
    state.charactersUnsubscribe = null;
  }
}

function parseControlValue(control) {
  if (control.type === "checkbox") {
    return Boolean(control.checked);
  }

  if (control.dataset.signedNumber) {
    return normalizeText(control.value, 8).trim();
  }

  if (control.type === "number") {
    if (control.value === "") {
      return null;
    }
    const numericValue = Number(control.value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return control.value;
}

function normalizeFieldValue(fieldPath, rawValue) {
  if (rawValue === undefined) {
    return null;
  }

  if (typeof rawValue === "boolean") {
    return rawValue;
  }

  if (fieldPath === "combat.inspiration") {
    return clampNumber(rawValue, 0, 99, null);
  }

  if (fieldPath.startsWith("abilities.") && fieldPath.endsWith(".score")) {
    return clampNumber(rawValue, 1, 30, 10);
  }

  if (fieldPath === "combat.proficiencyBonus") {
    return clampNumber(rawValue, 0, 20, 2);
  }

  if (fieldPath.startsWith("calculatedOverrides.")) {
    return rawValue === null || rawValue === "" ? "" : normalizeText(rawValue, 8).trim();
  }

  if (fieldPath.startsWith("identity.level")) {
    return clampNumber(rawValue, 1, 20, 1);
  }

  if (fieldPath.endsWith("deathSaveSuccesses") || fieldPath.endsWith("deathSaveFailures")) {
    return clampNumber(rawValue, 0, 3, 0);
  }

  if (typeof rawValue === "number") {
    return rawValue;
  }

  return normalizeText(rawValue);
}

function handleSheetFieldInteraction(control, mode) {
  const fieldPath = control.dataset.field;
  if (!fieldPath) {
    return;
  }

  if (control.type === "checkbox" && mode === "input") {
    return;
  }

  const character = currentCharacter();
  if (!character) {
    return;
  }

  if (control.dataset.attackCombined) {
    const rowId = control.dataset.attackCombined;
    const combinedValue = normalizeText(control.value);
    const damagePath = `sheet/attacks/rows/${rowId}/damage`;
    const damageTypePath = `sheet/attacks/rows/${rowId}/damageType`;
    const delay = mode === "change" ? 0 : 600;

    applyRelativeUpdate(state.selectedCharacterId, damagePath, combinedValue);
    applyRelativeUpdate(state.selectedCharacterId, damageTypePath, "");
    renderAllFields();
    renderSaveStatus();
    scheduleWrite(state.selectedCharacterId, damagePath, combinedValue, delay);
    scheduleWrite(state.selectedCharacterId, damageTypePath, "", delay);
    return;
  }

  const parsedValue = parseControlValue(control);
  const normalizedValue = control.dataset.signedNumber && mode === "change"
    ? formatSignedManualValue(parsedValue)
    : normalizeFieldValue(fieldPath, parsedValue);
  const relativePath = relativePathFromFieldPath(fieldPath);
  const delay = control.type === "checkbox" || control.tagName === "SELECT" || mode === "change"
    ? 0
    : control.type === "number"
      ? 250
      : 600;

  applyRelativeUpdate(state.selectedCharacterId, relativePath, normalizedValue);
  renderAllFields();
  renderSaveStatus();
  scheduleWrite(state.selectedCharacterId, relativePath, normalizedValue, delay);
}

function beginTabNameEdit(characterId) {
  const currentName = state.characters[characterId]?.meta?.name || "";
  state.editingTabId = characterId;
  state.tabNameDraft = currentName;
  state.tabNameOriginal = currentName;
  renderCharacterTabs();
}

function cancelTabNameEdit() {
  state.editingTabId = null;
  state.tabNameDraft = "";
  state.tabNameOriginal = "";
  renderCharacterTabs();
}

async function saveTabNameEdit(characterId, proposedName) {
  if (state.editingTabId !== characterId) {
    return;
  }

  const trimmedName = normalizeText(proposedName, 30).trim();

  if (!trimmedName) {
    renderTransientNote("Character names cannot be blank.");
    cancelTabNameEdit();
    return;
  }

  const previousName = state.characters[characterId].meta.name;
  state.editingTabId = null;
  state.savingTabNameId = characterId;
  applyRelativeUpdate(characterId, "meta/name", trimmedName);
  renderCharacterTabs();
  renderSheetHeader();
  persistCharacterCache();

  try {
    await commitWrite(characterId, "meta/name", trimmedName, { queueable: false });
    if (state.permissionDenied || state.lastWriteError) {
      throw new Error(state.lastWriteError || "Name update failed.");
    }
  } catch (error) {
    applyRelativeUpdate(characterId, "meta/name", previousName);
    state.lastWriteError = error.message || "Name update failed.";
    renderTransientNote("Name update failed and was reverted.");
  } finally {
    state.savingTabNameId = null;
    renderSheet();
  }
}

function selectCharacter(characterId) {
  if (!CHARACTER_IDS.includes(characterId) || state.selectedCharacterId === characterId) {
    return;
  }

  finalizePendingUndo();
  flushPendingWrites(state.selectedCharacterId);
  state.selectedCharacterId = characterId;
  writeLocalStorage(STORAGE_KEYS.selectedCharacterId, characterId);
  renderSheet();
}

function setSelectedPage(pageId, options = {}) {
  if (!PAGE_IDS.includes(pageId)) {
    return;
  }

  const { scroll = false } = options;
  state.selectedPage = pageId;
  writeLocalStorage(STORAGE_KEYS.activePage, pageId);
  renderPageTabs();

  if (scroll) {
    scrollToSelectedPagePanel();
  }
}

function handleCharacterTabKeydown(event) {
  const tabs = Array.from(dom.characterTablist.querySelectorAll("[data-character-tab]"));
  const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
  if (currentIndex === -1) {
    return;
  }

  let nextIndex = null;

  if (event.key === "ArrowRight") {
    nextIndex = (currentIndex + 1) % tabs.length;
  } else if (event.key === "ArrowLeft") {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = tabs.length - 1;
  }

  if (nextIndex !== null) {
    event.preventDefault();
    tabs[nextIndex].focus();
    selectCharacter(tabs[nextIndex].dataset.characterTab);
  }
}

function handlePageTabKeydown(event) {
  const tabs = dom.activePageButtons;
  const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
  if (currentIndex === -1) {
    return;
  }

  let nextIndex = null;

  if (event.key === "ArrowRight") {
    nextIndex = (currentIndex + 1) % tabs.length;
  } else if (event.key === "ArrowLeft") {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = tabs.length - 1;
  }

  if (nextIndex !== null) {
    event.preventDefault();
    tabs[nextIndex].focus();
    setSelectedPage(tabs[nextIndex].dataset.pageTab, { scroll: true });
  }
}

function initializePageTracking() {
  if (!("IntersectionObserver" in window) || state.pageObserver) {
    return;
  }

  state.pageObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

      const pageId = visibleEntry?.target?.dataset?.pagePanel;
      if (!PAGE_IDS.includes(pageId) || pageId === state.selectedPage) {
        return;
      }

      state.selectedPage = pageId;
      writeLocalStorage(STORAGE_KEYS.activePage, pageId);
      renderPageTabs();
    },
    {
      rootMargin: "-18% 0px -68% 0px",
      threshold: [0, 0.1, 0.3, 0.6]
    }
  );

  dom.pagePanels.forEach((panel) => state.pageObserver.observe(panel));
}

function openModal(modalName, triggerElement) {
  closeModal();
  state.currentModal = modalName;
  state.modalReturnFocus = triggerElement || document.activeElement;
  document.body.classList.add("modal-open");

  if (modalName === "dice") {
    dom.diceModal.hidden = false;
    dom.diceCloseButton.focus();
  }

  if (modalName === "settings") {
    dom.campaignNameInput.value = state.localCampaignName;
    dom.settingsModal.hidden = false;
    dom.campaignNameInput.focus();
  }
}

function closeModal() {
  dom.diceModal.hidden = true;
  dom.settingsModal.hidden = true;
  state.currentModal = null;
  document.body.classList.remove("modal-open");
  if (state.modalReturnFocus && typeof state.modalReturnFocus.focus === "function") {
    state.modalReturnFocus.focus();
  }
}

function trapFocusWithinModal(event) {
  if (!state.currentModal || event.key !== "Tab") {
    return;
  }

  const modal = state.currentModal === "dice" ? dom.diceModal : dom.settingsModal;
  const focusable = Array.from(
    modal.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')
  ).filter((element) => !element.disabled && !element.hidden);

  if (!focusable.length) {
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function resetLocalCache() {
  const hasQueuedChanges = Object.keys(state.queuedWrites).length > 0;
  const confirmation = window.confirm(
    hasQueuedChanges
      ? "Resetting the local cache will discard queued offline edits in this browser. Continue?"
      : "Reset the local cache for selected tabs, cached sheets, and dice history?"
  );

  if (!confirmation) {
    return;
  }

  Object.values(STORAGE_KEYS).forEach((key) => removeLocalStorage(key));
  state.queuedWrites = {};
  state.diceHistory = [];
  state.dicePrefs = { die: "d20", count: 0, modifier: "", tray: [] };
  state.diceTray = [];
  state.diceTrayInitialized = true;
  state.localCampaignName = "Main Campaign";
  persistQueuedWrites();
  persistDiceState();
  renderCampaignDisplay();
  renderDiceInputs();
  renderDiceHistory();
  renderTransientNote("Local cache cleared.");
  renderSaveStatus();
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = createElement("a", {
    attributes: {
      href: url,
      download: filename
    }
  });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportCurrentCharacter() {
  const payload = {
    format: "adventurers-archive-character",
    version: 1,
    exportedAt: new Date().toISOString(),
    characterId: state.selectedCharacterId,
    character: currentCharacter()
  };
  downloadJson(`${state.selectedCharacterId}.json`, payload);
}

function exportAllCharacters() {
  const payload = {
    format: "adventurers-archive-all-characters",
    version: 1,
    exportedAt: new Date().toISOString(),
    characters: state.characters
  };
  downloadJson("all-characters.json", payload);
}

function validateImportedCharacterPayload(payload) {
  if (!isPlainObject(payload) || payload.format !== "adventurers-archive-character" || payload.version !== 1) {
    throw new Error("This JSON file does not match the expected Adventurers' Archive character schema.");
  }

  if (!isPlainObject(payload.character)) {
    throw new Error("The imported file is missing a valid character object.");
  }

  return normalizeCharacter(payload.character, state.selectedCharacterId, CHARACTER_IDS.indexOf(state.selectedCharacterId));
}

async function replaceCurrentCharacterFromImport(characterData) {
  const characterId = state.selectedCharacterId;
  const existingCharacter = currentCharacter();
  const nextCharacter = normalizeCharacter(characterData, characterId, CHARACTER_IDS.indexOf(characterId));

  const confirmed = window.confirm(
    `Replace ${existingCharacter.meta.name} with the imported character data? This will overwrite the current Firebase fields for this record.`
  );

  if (!confirmed) {
    return;
  }

  const currentFlat = flattenObject({ meta: existingCharacter.meta, sheet: existingCharacter.sheet });
  const nextFlat = flattenObject({ meta: nextCharacter.meta, sheet: nextCharacter.sheet });
  const allKeys = new Set([...Object.keys(currentFlat), ...Object.keys(nextFlat)]);
  const payload = {
    "meta/updatedAt": serverTimestamp(),
    "meta/updatedBy": currentUserStamp()
  };

  allKeys.forEach((path) => {
    payload[path] = Object.prototype.hasOwnProperty.call(nextFlat, path) ? nextFlat[path] : null;
  });

  state.activeNetworkWrites += 1;
  renderSaveStatus();

  try {
    await update(ref(state.db, `${CHARACTERS_PATH}/${characterId}`), payload);
    state.characters[characterId] = nextCharacter;
    persistCharacterCache();
    renderSheet();
    renderTransientNote("Character import complete.");
  } catch (error) {
    console.error("Character import failed.", error);
    state.lastWriteError = friendlyDatabaseError(error);
    renderSaveStatus();
    renderTransientNote("Import failed. The current character was left unchanged.");
  } finally {
    state.activeNetworkWrites -= 1;
    renderSaveStatus();
  }
}

function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const payload = safeJsonParse(reader.result, null);
      const normalizedCharacter = validateImportedCharacterPayload(payload);
      await replaceCurrentCharacterFromImport(normalizedCharacter);
    } catch (error) {
      renderTransientNote(error.message || "That file could not be imported.");
    } finally {
      dom.importFileInput.value = "";
    }
  };
  reader.readAsText(file);
}

function persistSettings() {
  state.localCampaignName = normalizeText(dom.campaignNameInput.value, 60).trim() || "Main Campaign";
  writeLocalStorage(STORAGE_KEYS.campaignName, state.localCampaignName);
  renderCampaignDisplay();
  closeModal();
}

function cryptoRoll(sides) {
  const maxUint = 0x100000000;
  const limit = Math.floor(maxUint / sides) * sides;
  const randomArray = new Uint32Array(1);

  do {
    crypto.getRandomValues(randomArray);
  } while (randomArray[0] >= limit);

  return (randomArray[0] % sides) + 1;
}

function renderDiceResult(result) {
  const dice = Array.isArray(result?.dice) ? result.dice : [];
  const hasDice = dice.length > 0;
  dom.diceFormula.textContent = hasDice ? result.formula : "Choose dice below to begin.";
  const modifierText = result?.modifier ? ` | Modifier ${result.modifier >= 0 ? "+" : ""}${result.modifier}` : "";
  dom.diceBreakdown.textContent = hasDice
    ? `${dice.map((entry) => `${entry.die} rolled ${entry.value}`).join(" | ")}${modifierText}`
    : "Each die will appear here with its result.";
  dom.diceTotal.textContent = hasDice ? String(result.total) : "-";
  dom.diceResultCard.classList.toggle("is-natural-20", Boolean(result?.isNatural20));
  dom.diceResultCard.classList.toggle("is-natural-1", Boolean(result?.isNatural1));
  dom.diceLive.textContent = hasDice ? `${result.formula} totals ${result.total}.` : "The dice tray is empty.";
}

function animateDiceStage() {
  dom.diceResultCard.classList.remove("is-tossing");
  void dom.diceResultCard.offsetWidth;
  dom.diceResultCard.classList.add("is-tossing");
  window.setTimeout(() => dom.diceResultCard.classList.remove("is-tossing"), 560);
}

function setDiceRolling(isRolling) {
  state.isDiceRolling = isRolling;
  dom.diceResultCard.classList.toggle("is-rolling", isRolling);
  dom.diceResultCard.setAttribute("aria-busy", String(isRolling));
  dom.rollButton.disabled = isRolling;
  dom.rollButton.textContent = isRolling ? "Rolling..." : "Roll All Dice";
  dom.clearDiceButton.disabled = isRolling;
  dom.diceModifier.disabled = isRolling;
  dom.diceTypeGroup.querySelectorAll("button").forEach((button) => {
    button.disabled = isRolling;
  });
  dom.diceTray.querySelectorAll("button").forEach((button) => {
    button.disabled = isRolling;
  });
}

function renderRollingFaces() {
  dom.diceTray.querySelectorAll("[data-die-type]").forEach((dieButton) => {
    const faceValue = dieButton.querySelector(".dice-face-value");
    const sides = Number(dieButton.dataset.dieType.slice(1));
    if (faceValue && Number.isFinite(sides)) {
      faceValue.textContent = String(cryptoRoll(sides));
    }
  });
}

function finishDiceRoll(finalTray) {
  state.diceTray = finalTray;
  const result = currentDiceResult();
  state.diceHistory = [{ ...result, rolledAt: Date.now() }, ...state.diceHistory].slice(0, 10);
  persistDiceState();
  renderDiceInputs();
  renderDiceHistory();
  setDiceRolling(false);
}

function addDieToTray(dieType) {
  if (state.isDiceRolling) {
    return;
  }

  if (!DICE_TYPES.includes(dieType) || state.diceTray.length >= 20) {
    if (state.diceTray.length >= 20) {
      renderTransientNote("The dice tray can hold up to 20 dice.");
    }
    return;
  }

  state.diceTray.push({
    id: generateStableId("die"),
    die: dieType,
    value: cryptoRoll(Number(dieType.slice(1)))
  });
  state.dicePrefs.die = dieType;
  persistDiceState();
  renderDiceInputs();
  animateDiceStage();
}

function removeDieFromTray(dieId) {
  if (state.isDiceRolling) {
    return;
  }

  state.diceTray = state.diceTray.filter((die) => die.id !== dieId);
  persistDiceState();
  renderDiceInputs();
}

function clearDiceTray() {
  if (state.isDiceRolling) {
    return;
  }

  state.diceTray = [];
  persistDiceState();
  renderDiceInputs();
}

function rollDice() {
  if (state.isDiceRolling) {
    return;
  }

  if (!state.diceTray.length) {
    renderTransientNote("Add at least one die before rolling.");
    return;
  }

  state.dicePrefs.modifier = parseOptionalDiceModifier(dom.diceModifier.value);
  const finalTray = state.diceTray.map((die) => ({
    ...die,
    value: cryptoRoll(Number(die.die.slice(1)))
  }));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    finishDiceRoll(finalTray);
    return;
  }

  setDiceRolling(true);
  dom.diceResultCard.classList.remove("is-natural-20", "is-natural-1");
  dom.diceFormula.textContent = `${diceFormula(state.diceTray, clampNumber(state.dicePrefs.modifier, -99, 99, 0))} in motion`;
  dom.diceBreakdown.textContent = "Tumbling across the tray...";
  dom.diceTotal.textContent = "...";
  dom.diceLive.textContent = "Rolling dice.";
  renderRollingFaces();

  const faceCycle = window.setInterval(renderRollingFaces, 72);
  window.setTimeout(() => {
    window.clearInterval(faceCycle);
    finishDiceRoll(finalTray);
  }, DICE_ROLL_DURATION);
}

function buildAbilityCards() {
  dom.abilitiesGrid.textContent = "";

  ABILITY_CONFIG.forEach((ability) => {
    const card = createElement("article", { className: "ability-card" });
    const header = createElement("div", { className: "ability-card-header" });
    const heading = createElement("h4", { text: ability.label });
    const abbr = createElement("small", { text: ability.abbr });

    header.append(heading, abbr);
    card.appendChild(header);

    const stack = createElement("div", { className: "ability-stack" });

    const scoreField = createElement("div", { className: "mini-field ability-score-field" });
    scoreField.appendChild(createElement("label", { text: "Score" }));
    scoreField.appendChild(
      createElement("input", {
        type: "number",
        attributes: {
          "aria-label": `${ability.label} score`,
          "data-field": `abilities.${ability.key}.score`,
          min: 1,
          max: 30,
          inputmode: "numeric"
        }
      })
    );
    stack.appendChild(scoreField);

    const modField = createElement("div", { className: "mini-field ability-modifier-field" });
    modField.appendChild(createElement("label", { text: "Modifier" }));
    modField.appendChild(
      createElement("input", {
        type: "text",
        attributes: {
          "aria-label": `${ability.label} modifier`,
          "data-field": `calculatedOverrides.abilityModifiers.${ability.key}`,
          "data-signed-number": "true",
          inputmode: "text"
        }
      })
    );
    stack.appendChild(modField);

    card.appendChild(stack);
    dom.abilitiesGrid.appendChild(card);
  });
}

function buildSavingThrowsList() {
  dom.savingThrowsList.textContent = "";

  ABILITY_CONFIG.forEach((ability) => {
    const row = createElement("div", { className: "score-list-row saving-throw-row" });
    const profToggle = createElement("input", {
      type: "checkbox",
      attributes: {
        "aria-label": `${ability.label} saving throw proficiency`,
        "data-field": `savingThrows.${ability.key}.proficient`
      }
    });
    const label = createElement("span", { className: "score-list-label", text: ability.label });
    const abbr = createElement("small", { className: "score-list-abbr", text: ability.abbr });
    const modifier = createElement("input", {
      type: "text",
      attributes: {
        "aria-label": `${ability.label} saving throw`,
        "data-field": `calculatedOverrides.savingThrows.${ability.key}`,
        "data-signed-number": "true",
        inputmode: "text"
      }
    });

    row.append(profToggle, label, abbr, modifier);
    dom.savingThrowsList.appendChild(row);
  });
}

function buildSkillsList() {
  dom.skillsList.textContent = "";

  SKILL_CONFIG.forEach((skill) => {
    const row = createElement("div", { className: "score-list-row skill-row" });
    const proficientToggle = createElement("input", {
      type: "checkbox",
      attributes: {
        "aria-label": `${skill.label} proficiency`,
        "data-field": `skills.${skill.key}.proficient`
      }
    });
    const labelWrap = createElement("div", { className: "score-list-text" });
    labelWrap.append(
      createElement("span", { className: "score-list-label", text: skill.label }),
      createElement("small", { className: "score-list-abbr", text: skill.abbr })
    );
    const modifier = createElement("input", {
      type: "text",
      attributes: {
        "aria-label": `${skill.label} modifier`,
        "data-field": `calculatedOverrides.skills.${skill.key}`,
        "data-signed-number": "true",
        inputmode: "text"
      }
    });

    row.append(proficientToggle, labelWrap, modifier);
    dom.skillsList.appendChild(row);
  });
}

function initializeStaticUi() {
  buildAbilityCards();
  buildSavingThrowsList();
  buildSkillsList();
  renderDiceInputs();
  renderDiceHistory();
  renderSheet();
  initializePageTracking();
}

async function handleSignInSubmit(event) {
  event.preventDefault();

  if (!state.auth || state.configError) {
    return;
  }

  const email = dom.emailInput.value.trim();
  const password = dom.passwordInput.value;

  dom.loginError.hidden = true;
  dom.loginButton.disabled = true;
  dom.loginButton.textContent = "Signing In...";

  try {
    await signInWithEmailAndPassword(state.auth, email, password);
    dom.loginForm.reset();
  } catch (error) {
    const message = friendlyAuthError(error);
    dom.loginError.textContent = message;
    dom.loginError.hidden = false;
    dom.authErrorLive.textContent = message;
  } finally {
    dom.loginButton.disabled = false;
    dom.loginButton.textContent = "Sign In";
  }
}

async function signOutCurrentUser() {
  finalizePendingUndo();
  flushPendingWrites();
  try {
    await firebaseSignOut(state.auth);
  } catch (error) {
    console.error("Sign out failed.", error);
    renderTransientNote("Sign out failed. Please try again.");
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === "hidden") {
    finalizePendingUndo();
    flushPendingWrites();
  }
}

function bindEvents() {
  dom.loginForm.addEventListener("submit", handleSignInSubmit);
  dom.signoutButton.addEventListener("click", signOutCurrentUser);
  dom.characterTablist.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-character-edit]");
    if (editButton) {
      event.preventDefault();
      beginTabNameEdit(editButton.dataset.characterEdit);
      return;
    }

    const tabButton = event.target.closest("[data-character-tab]");
    if (tabButton) {
      selectCharacter(tabButton.dataset.characterTab);
    }
  });

  dom.characterTablist.addEventListener("keydown", (event) => {
    if (event.target.matches("[data-tab-name-input]")) {
      if (event.key === "Enter") {
        event.preventDefault();
        saveTabNameEdit(event.target.dataset.tabNameInput, event.target.value);
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancelTabNameEdit();
      }
      return;
    }

    handleCharacterTabKeydown(event);
  });

  dom.characterTablist.addEventListener("input", (event) => {
    if (event.target.matches("[data-tab-name-input]")) {
      state.tabNameDraft = event.target.value;
    }
  });

  dom.characterTablist.addEventListener("focusout", (event) => {
    if (event.target.matches("[data-tab-name-input]")) {
      saveTabNameEdit(event.target.dataset.tabNameInput, event.target.value);
    }
  });

  dom.pageTablist.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-page-tab]");
    if (tab) {
      setSelectedPage(tab.dataset.pageTab, { scroll: true });
    }
  });

  dom.pageTablist.addEventListener("keydown", handlePageTabKeydown);

  dom.sheetForm.addEventListener("input", (event) => {
    const control = event.target.closest("[data-field]");
    if (control) {
      handleSheetFieldInteraction(control, "input");
    }
  });

  dom.sheetForm.addEventListener("change", (event) => {
    const control = event.target.closest("[data-field]");
    if (control) {
      handleSheetFieldInteraction(control, "change");
    }
  });

  dom.sheetForm.addEventListener("focusout", (event) => {
    const control = event.target.closest("[data-field]");
    if (!control) {
      return;
    }

    if (control.dataset.signedNumber) {
      handleSheetFieldInteraction(control, "change");
      state.pendingRemoteFields.delete(control.dataset.field);
      renderAllFields();
      return;
    }

    if (state.pendingRemoteFields.has(control.dataset.field)) {
      state.pendingRemoteFields.delete(control.dataset.field);
      renderAllFields();
    }
  });

  dom.sheetForm.addEventListener("click", (event) => {
    const deathSaveButton = event.target.closest("[data-death-save-value]");
    if (deathSaveButton) {
      const group = deathSaveButton.closest("[data-death-save-group]");
      const control = group?.querySelector("[data-field]");
      if (control) {
        const selectedValue = Number(deathSaveButton.dataset.deathSaveValue);
        const currentValue = Number(control.value) || 0;
        control.value = String(currentValue >= selectedValue ? selectedValue - 1 : selectedValue);
        handleSheetFieldInteraction(control, "change");
      }
      return;
    }

    const spellSlotButton = event.target.closest("[data-spell-slot-value]");
    if (spellSlotButton) {
      const levelKey = spellSlotButton.dataset.spellSlotLevel;
      const control = dom.spellSections.querySelector(`[data-field="spellcasting.${levelKey}.slotsExpended"]`);
      if (control) {
        const selectedValue = Number(spellSlotButton.dataset.spellSlotValue);
        const currentValue = Number(control.value) || 0;
        control.value = String(currentValue >= selectedValue ? selectedValue - 1 : selectedValue);
        handleSheetFieldInteraction(control, "change");
      }
      return;
    }

    const spellToggleButton = event.target.closest("[data-toggle-spell-level]");
    if (spellToggleButton) {
      const levelKey = spellToggleButton.dataset.toggleSpellLevel;
      if (state.collapsedSpellLevels.has(levelKey)) {
        state.collapsedSpellLevels.delete(levelKey);
      } else {
        state.collapsedSpellLevels.add(levelKey);
      }
      renderSpellSections();
      return;
    }

    const attackDeleteButton = event.target.closest("[data-delete-attack]");
    if (attackDeleteButton) {
      const rowId = attackDeleteButton.dataset.deleteAttack;
      const relativePath = `sheet/attacks/rows/${rowId}`;
      const deletedRow = deepClone(getNestedValue(currentCharacter(), `sheet.attacks.rows.${rowId}`));
      const characterId = state.selectedCharacterId;
      applyRelativeUpdate(state.selectedCharacterId, relativePath, null);
      renderAttacks();
      showUndoableNote(
        "Attack removed.",
        () => commitWrite(characterId, relativePath, null),
        () => {
          applyRelativeUpdate(characterId, relativePath, deletedRow);
          renderAttacks();
        }
      );
      return;
    }

    const spellDeleteButton = event.target.closest("[data-delete-spell]");
    if (spellDeleteButton) {
      const [levelKey, rowId] = spellDeleteButton.dataset.deleteSpell.split(":");
      const relativePath = `sheet/spellcasting/${levelKey}/rows/${rowId}`;
      const deletedRow = deepClone(getNestedValue(currentCharacter(), `sheet.spellcasting.${levelKey}.rows.${rowId}`));
      const characterId = state.selectedCharacterId;
      applyRelativeUpdate(state.selectedCharacterId, relativePath, null);
      renderSpellSections();
      showUndoableNote(
        "Spell removed.",
        () => commitWrite(characterId, relativePath, null),
        () => {
          applyRelativeUpdate(characterId, relativePath, deletedRow);
          renderSpellSections();
        }
      );
      return;
    }

    const addSpellButton = event.target.closest("[data-add-spell]");
    if (addSpellButton) {
      const levelKey = addSpellButton.dataset.addSpell;
      const rowId = generateStableId(`spell-${levelKey}`);
      const relativePath = `sheet/spellcasting/${levelKey}/rows/${rowId}`;
      applyRelativeUpdate(state.selectedCharacterId, relativePath, createBlankSpellRow(rowId));
      renderSpellSections();
      commitWrite(state.selectedCharacterId, relativePath, createBlankSpellRow(rowId));
    }
  });

  document.getElementById("add-attack-button").addEventListener("click", () => {
    const rowId = generateStableId("attack");
    const relativePath = `sheet/attacks/rows/${rowId}`;
    applyRelativeUpdate(state.selectedCharacterId, relativePath, createBlankAttackRow(rowId));
    renderAttacks();
    commitWrite(state.selectedCharacterId, relativePath, createBlankAttackRow(rowId));
  });

  dom.diceButton.addEventListener("click", () => openModal("dice", dom.diceButton));
  dom.undoActionButton.addEventListener("click", undoPendingAction);
  dom.diceCloseButton.addEventListener("click", closeModal);
  dom.settingsButton.addEventListener("click", () => openModal("settings", dom.settingsButton));
  dom.settingsCloseButton.addEventListener("click", closeModal);
  dom.rollButton.addEventListener("click", rollDice);
  dom.clearDiceButton.addEventListener("click", clearDiceTray);
  dom.clearHistoryButton.addEventListener("click", () => {
    state.diceHistory = [];
    persistDiceState();
    renderDiceHistory();
  });

  dom.diceTypeGroup.addEventListener("click", (event) => {
    const dieButton = event.target.closest("[data-die]");
    if (!dieButton) {
      return;
    }
    addDieToTray(dieButton.dataset.die);
  });

  dom.diceTray.addEventListener("click", (event) => {
    const dieButton = event.target.closest("[data-remove-die]");
    if (dieButton) {
      removeDieFromTray(dieButton.dataset.removeDie);
    }
  });

  dom.diceModifier.addEventListener("input", () => {
    state.dicePrefs.modifier = parseOptionalDiceModifier(dom.diceModifier.value);
    persistDiceState();
    renderDiceResult(currentDiceResult());
  });

  document.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  dom.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    persistSettings();
  });

  dom.resetCacheButton.addEventListener("click", resetLocalCache);
  dom.exportCurrentButton.addEventListener("click", exportCurrentCharacter);
  dom.exportAllButton.addEventListener("click", exportAllCharacters);
  dom.importCharacterButton.addEventListener("click", () => dom.importFileInput.click());
  dom.importFileInput.addEventListener("change", handleImportFile);
  dom.printSheetButton.addEventListener("click", () => window.print());

  window.addEventListener("online", () => {
    renderBanners();
    flushQueuedWrites();
  });

  window.addEventListener("offline", () => {
    renderBanners();
    renderSaveStatus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.currentModal) {
      closeModal();
      return;
    }

    trapFocusWithinModal(event);
  });

  document.addEventListener("visibilitychange", handleVisibilityChange);
}

function initializeFirebase() {
  if (firebaseConfigIsPlaceholder(firebaseConfig)) {
    state.configError =
      "Firebase configuration is still using placeholders. Update firebase-config.js with your Web SDK config before signing in.";
    state.signInResolved = true;
    renderAuthState();
    return;
  }

  try {
    state.app = initializeApp(firebaseConfig);
    state.auth = getAuth(state.app);
    state.db = getDatabase(state.app);
  } catch (error) {
    console.error("Firebase failed to initialize.", error);
    state.configError = "Firebase could not initialize. Check firebase-config.js and the browser console.";
    state.signInResolved = true;
    renderAuthState();
    return;
  }

  onAuthStateChanged(state.auth, (user) => {
    state.signInResolved = true;
    state.currentUser = LOCAL_PREVIEW_MODE ? null : user;
    state.permissionDenied = false;
    state.lastWriteError = "";

    if (user && !LOCAL_PREVIEW_MODE) {
      renderSheet();
      attachCharactersListener();
      flushQueuedWrites();
    } else {
      detachCharactersListener();
      flushPendingWrites();
      state.remoteReady = false;
    }

    renderAuthState();
  });
}

initializeStaticUi();
bindEvents();
initializeFirebase();
