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

const SPELL_COLUMN_GROUPS = [
  ["cantrips", "level1", "level2"],
  ["level3", "level4", "level5"],
  ["level6", "level7", "level8", "level9"]
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
    settings: {
      manualCalculations: false
    },
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
    if (skillEntry.expertise) {
      skillEntry.proficient = true;
    }
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
  merged.sheet.settings.manualCalculations = Boolean(merged.sheet.settings.manualCalculations);

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

function abilityModifierFromScore(score) {
  return Math.floor((Number(score) - 10) / 2);
}

function currentUserStamp() {
  if (!state.currentUser) {
    return "unknown-user";
  }

  return state.currentUser.email || state.currentUser.uid;
}

function isManualCalculationsEnabled(character) {
  return Boolean(getNestedValue(character, "sheet.settings.manualCalculations"));
}

function getCombatProficiencyBonus(character) {
  return clampNumber(getNestedValue(character, "sheet.combat.proficiencyBonus"), 0, 20, 0);
}

function getResolvedAbilityModifier(character, abilityKey) {
  const overridePath = `sheet.calculatedOverrides.abilityModifiers.${abilityKey}`;
  const overrideValue = getNestedValue(character, overridePath);

  if (overrideValue !== null && overrideValue !== undefined && overrideValue !== "") {
    return Number(overrideValue);
  }

  const score = getNestedValue(character, `sheet.abilities.${abilityKey}.score`);
  return abilityModifierFromScore(clampNumber(score, 1, 30, 10));
}

function getResolvedSavingThrow(character, abilityKey) {
  const overrideValue = getNestedValue(character, `sheet.calculatedOverrides.savingThrows.${abilityKey}`);

  if (overrideValue !== null && overrideValue !== undefined && overrideValue !== "") {
    return Number(overrideValue);
  }

  const proficiencyBonus = getCombatProficiencyBonus(character);
  const proficient = Boolean(getNestedValue(character, `sheet.savingThrows.${abilityKey}.proficient`));
  return getResolvedAbilityModifier(character, abilityKey) + (proficient ? proficiencyBonus : 0);
}

function getResolvedSkillModifier(character, skillKey) {
  const overrideValue = getNestedValue(character, `sheet.calculatedOverrides.skills.${skillKey}`);

  if (overrideValue !== null && overrideValue !== undefined && overrideValue !== "") {
    return Number(overrideValue);
  }

  const skill = SKILL_CONFIG.find((entry) => entry.key === skillKey);
  const proficiencyBonus = getCombatProficiencyBonus(character);
  const skillState = getNestedValue(character, `sheet.skills.${skillKey}`) || {};
  const baseModifier = getResolvedAbilityModifier(character, skill.ability);

  if (skillState.expertise) {
    return baseModifier + proficiencyBonus * 2;
  }

  if (skillState.proficient) {
    return baseModifier + proficiencyBonus;
  }

  return baseModifier;
}

function getResolvedPassivePerception(character) {
  const overrideValue = getNestedValue(character, "sheet.calculatedOverrides.passivePerception");

  if (overrideValue !== null && overrideValue !== undefined && overrideValue !== "") {
    return Number(overrideValue);
  }

  return 10 + getResolvedSkillModifier(character, "perception");
}

function formatSaveStatus() {
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
      return "That email and password combination was not recognized.";
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
  clearHistoryButton: document.getElementById("clear-history-button"),
  configBanner: document.getElementById("config-banner"),
  dashboard: document.getElementById("dashboard"),
  diceBreakdown: document.getElementById("dice-breakdown"),
  diceButton: document.getElementById("dice-button"),
  diceCloseButton: document.getElementById("dice-close-button"),
  diceCount: document.getElementById("dice-count"),
  diceFormula: document.getElementById("dice-formula"),
  diceHistory: document.getElementById("dice-history"),
  diceLive: document.getElementById("dice-live"),
  diceModal: document.getElementById("dice-modal"),
  diceModifier: document.getElementById("dice-modifier"),
  diceResultCard: document.getElementById("dice-result-card"),
  diceTotal: document.getElementById("dice-total"),
  diceTypeGroup: document.getElementById("dice-type-group"),
  emailInput: document.getElementById("email-input"),
  exportAllButton: document.getElementById("export-all-button"),
  exportCurrentButton: document.getElementById("export-current-button"),
  importCharacterButton: document.getElementById("import-character-button"),
  importFileInput: document.getElementById("import-file-input"),
  lastUpdatedLabel: document.getElementById("last-updated-label"),
  loginButton: document.getElementById("login-button"),
  loginError: document.getElementById("login-error"),
  loginForm: document.getElementById("login-form"),
  manualCalculationsToggle: document.getElementById("manual-calculations-toggle"),
  offlineBanner: document.getElementById("offline-banner"),
  pagePanels: Array.from(document.querySelectorAll("[data-page-panel]")),
  pageTablist: document.getElementById("page-tablist"),
  passwordInput: document.getElementById("password-input"),
  permissionBanner: document.getElementById("permission-banner"),
  printSheetButton: document.getElementById("print-sheet-button"),
  remoteUpdateLive: document.getElementById("remote-update-live"),
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
  db: null,
  diceHistory: readLocalStorage(STORAGE_KEYS.diceHistory, []).slice(0, 10),
  dicePrefs: {
    die: "d20",
    count: 1,
    modifier: 0,
    ...readLocalStorage(STORAGE_KEYS.dicePrefs, {})
  },
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
  permissionDenied: false,
  queuedWrites: readLocalStorage(STORAGE_KEYS.pendingWrites, {}),
  remoteReady: false,
  saveNoteTimer: null,
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
  writeLocalStorage(STORAGE_KEYS.dicePrefs, state.dicePrefs);
  writeLocalStorage(STORAGE_KEYS.diceHistory, state.diceHistory);
}

function currentCharacter() {
  return state.characters[state.selectedCharacterId] || state.characters[CHARACTER_IDS[0]];
}

function renderTransientNote(message, timeout = 3000) {
  dom.remoteUpdateNote.hidden = false;
  dom.remoteUpdateNote.textContent = message;
  dom.remoteUpdateLive.textContent = message;

  window.clearTimeout(state.saveNoteTimer);
  state.saveNoteTimer = window.setTimeout(() => {
    dom.remoteUpdateNote.hidden = true;
    dom.remoteUpdateNote.textContent = "";
  }, timeout);
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
}

function renderCampaignDisplay() {
  dom.campaignDisplay.textContent = state.localCampaignName || "Main Campaign";
}

function renderAuthState() {
  const canShowDashboard = state.signInResolved && Boolean(state.currentUser) && !state.configError;
  const shouldShowAuth = state.signInResolved && !state.currentUser;

  dom.authLoadingScreen.hidden = canShowDashboard || state.signInResolved;
  dom.authScreen.hidden = canShowDashboard || !shouldShowAuth;
  dom.dashboard.hidden = !canShowDashboard;
  dom.authLoadingScreen.setAttribute("aria-hidden", String(dom.authLoadingScreen.hidden));
  dom.authScreen.setAttribute("aria-hidden", String(dom.authScreen.hidden));
  dom.dashboard.setAttribute("aria-hidden", String(dom.dashboard.hidden));
  dom.userLabel.textContent = state.currentUser ? currentUserStamp() : "Not signed in";
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

    const titleRow = createElement("div", { className: "character-tab-name-row" });
    const title = createElement("span", { className: "character-tab-title", text: character.meta.name });
    const playerName = createElement("span", {
      className: "character-tab-player",
      text: getNestedValue(character, "sheet.identity.playerName") || "No player name"
    });
    const titleBlock = createElement("div", { className: "character-tab-title-block" });
    titleBlock.append(title, playerName);
    const editButton = createElement("button", {
      className: "btn btn-ghost btn-small tab-edit-button",
      type: "button",
      text: "Rename",
      attributes: {
        "data-character-edit": characterId
      }
    });

    titleRow.append(titleBlock, editButton);
    tabButton.appendChild(titleRow);

    const metaText =
      state.savingTabNameId === characterId
        ? "Saving..."
        : `Record ${index + 1} | ${describeTimestamp(character.meta.updatedAt)}`;

    tabButton.appendChild(createElement("span", { className: "character-tab-meta", text: metaText }));

    wrapper.appendChild(tabButton);
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

  if (control.dataset.calculatedKind === "abilityModifier") {
    return getResolvedAbilityModifier(character, control.dataset.ability);
  }

  if (control.dataset.calculatedKind === "savingThrow") {
    return getResolvedSavingThrow(character, control.dataset.ability);
  }

  if (control.dataset.calculatedKind === "skillModifier") {
    return getResolvedSkillModifier(character, control.dataset.skill);
  }

  if (control.dataset.calculatedKind === "passivePerception") {
    return getResolvedPassivePerception(character);
  }

  return getNestedValue(character.sheet, fieldPath);
}

function formatSignedValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  if (numericValue > 0) {
    return `+${numericValue}`;
  }

  return String(numericValue);
}

function renderFieldControl(control, character) {
  const desiredValue = controlDesiredValue(control, character);
  const isFocused = document.activeElement === control;

  if (control.type === "checkbox") {
    control.checked = Boolean(desiredValue);
    return;
  }

  if (control.dataset.calculatedKind) {
    control.readOnly = false;
  }

  if (isFocused) {
    const currentValue = control.value;
    const desiredComparable = control.dataset.signedNumber ? formatSignedValue(desiredValue) : desiredValue ?? "";
    if (currentValue !== desiredComparable) {
      state.pendingRemoteFields.add(control.dataset.field);
    }
    return;
  }

  control.value = control.dataset.signedNumber ? formatSignedValue(desiredValue) : desiredValue ?? "";
}

function renderAllFields() {
  const character = currentCharacter();
  if (!character) {
    return;
  }

  Array.from(dom.sheetForm.querySelectorAll("[data-field]")).forEach((control) => {
    renderFieldControl(control, character);
  });
}

function renderAttacks() {
  const tbody = document.getElementById("attacks-body");
  const rows = getNestedValue(currentCharacter(), "sheet.attacks.rows") || {};
  tbody.textContent = "";

  Object.entries(rows).forEach(([rowId]) => {
    const row = createElement("tr");
    const nameCell = createElement("td");
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

    const bonusCell = createElement("td");
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

    const damageCell = createElement("td", { className: "attack-damage-cell" });
    damageCell.appendChild(
      createElement("input", {
        type: "text",
        attributes: {
          "aria-label": `Damage and type for ${rowId}`,
          "data-field": `attacks.rows.${rowId}.damage`,
          "data-attack-combined": rowId,
          placeholder: "1d8 + 3 Piercing"
        }
      })
    );
    row.appendChild(damageCell);

    const actionCell = createElement("td", { className: "attack-action-cell" });
    actionCell.appendChild(
      createElement("button", {
        className: "btn btn-danger btn-small icon-action-button",
        type: "button",
        text: "🗑",
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

  SPELL_COLUMN_GROUPS.forEach((group, columnIndex) => {
    const column = createElement("div", { className: `spell-column spell-column-${columnIndex + 1}` });

    group.forEach((levelKey) => {
      const level = SPELL_LEVELS.find((entry) => entry.key === levelKey);
      const section = createElement("section", { className: `spell-section spell-section-${level.key}` });
      const header = createElement("div", { className: "spell-section-header" });
      const badge = createElement("span", {
        className: "spell-level-badge",
        text: SPELL_LEVEL_BADGES[level.key]
      });
      const title = createElement("h3", {
        className: "spell-level-title",
        text: level.label
      });
      const addButton = createElement("button", {
        className: "btn btn-secondary btn-small spell-add-button",
        type: "button",
        text: "Add",
        attributes: {
          "data-add-spell": level.key
        }
      });

      header.append(badge, title, addButton);
      section.appendChild(header);

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
        section.appendChild(metaGrid);
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
      const rows = getNestedValue(character, `sheet.spellcasting.${level.key}.rows`) || {};
      Object.entries(rows).forEach(([rowId]) => {
        const row = createElement("tr");

        const preparedCell = createElement("td");
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

        const nameCell = createElement("td");
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

        const notesCell = createElement("td");
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

        const actionCell = createElement("td", { className: "spell-action-cell" });
        actionCell.appendChild(
          createElement("button", {
            className: "btn btn-danger btn-small icon-action-button spell-delete-button",
            type: "button",
            text: "X",
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
      section.appendChild(table);
      column.appendChild(section);
    });

    dom.spellSections.appendChild(column);
  });

  renderAllFields();
}

function renderDiceOptions() {
  dom.diceTypeGroup.textContent = "";

  DICE_TYPES.forEach((dieType) => {
    const button = createElement("button", {
      className: "dice-type-button",
      type: "button",
      text: dieType,
      attributes: {
        role: "radio",
        "aria-checked": state.dicePrefs.die === dieType,
        "data-die": dieType
      }
    });
    dom.diceTypeGroup.appendChild(button);
  });
}

function renderDiceInputs() {
  dom.diceCount.value = String(clampNumber(state.dicePrefs.count, 1, 10, 1));
  dom.diceModifier.value = String(clampNumber(state.dicePrefs.modifier, -99, 99, 0));
  renderDiceOptions();
}

function renderDiceHistory() {
  dom.diceHistory.textContent = "";

  if (!state.diceHistory.length) {
    dom.diceHistory.appendChild(createElement("li", { className: "empty-history", text: "No rolls recorded yet." }));
    return;
  }

  state.diceHistory.forEach((entry) => {
    const item = createElement("li");
    item.textContent = `${entry.formula} = ${entry.total} (${entry.results.join(", ")})`;
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
    const trimmedValue = control.value.trim();
    if (trimmedValue === "") {
      return null;
    }
    const numericValue = Number(trimmedValue);
    return Number.isFinite(numericValue) ? numericValue : null;
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
    return rawValue === null || rawValue === "" ? null : Number(rawValue);
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

function handleDerivedFieldDependencies(fieldPath, value) {
  if (fieldPath.startsWith("skills.") && fieldPath.endsWith(".expertise")) {
    const skillKey = fieldPath.split(".")[1];
    if (value) {
      const proficientField = `skills.${skillKey}.proficient`;
      applyRelativeUpdate(state.selectedCharacterId, relativePathFromFieldPath(proficientField), true);
      scheduleWrite(state.selectedCharacterId, relativePathFromFieldPath(proficientField), true, 0);
    }
  }

  if (fieldPath.startsWith("skills.") && fieldPath.endsWith(".proficient")) {
    const skillKey = fieldPath.split(".")[1];
    const expertisePath = `skills.${skillKey}.expertise`;
    const expertiseValue = getNestedValue(currentCharacter(), `sheet.${expertisePath}`);
    if (!value && expertiseValue) {
      applyRelativeUpdate(state.selectedCharacterId, relativePathFromFieldPath(expertisePath), false);
      scheduleWrite(state.selectedCharacterId, relativePathFromFieldPath(expertisePath), false, 0);
    }
  }
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

  const normalizedValue = normalizeFieldValue(fieldPath, parseControlValue(control));
  const relativePath = relativePathFromFieldPath(fieldPath);
  const delay = control.type === "checkbox" || control.tagName === "SELECT" || mode === "change"
    ? 0
    : control.type === "number"
      ? 250
      : 600;

  applyRelativeUpdate(state.selectedCharacterId, relativePath, normalizedValue);
  handleDerivedFieldDependencies(fieldPath, normalizedValue);
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
    dom.manualCalculationsToggle.checked = isManualCalculationsEnabled(currentCharacter());
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
  state.dicePrefs = { die: "d20", count: 1, modifier: 0 };
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

  const manualEnabled = dom.manualCalculationsToggle.checked;
  applyRelativeUpdate(state.selectedCharacterId, "sheet/settings/manualCalculations", manualEnabled);
  renderAllFields();
  renderSaveStatus();
  commitWrite(state.selectedCharacterId, "sheet/settings/manualCalculations", manualEnabled);
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
  dom.diceFormula.textContent = result.formula;
  const modifierText = result.modifier ? ` | Modifier ${result.modifier >= 0 ? "+" : ""}${result.modifier}` : "";
  dom.diceBreakdown.textContent = `Results: ${result.results.join(", ")}${modifierText}`;
  dom.diceTotal.textContent = String(result.total);
  dom.diceResultCard.classList.toggle("is-natural-20", result.isNatural20);
  dom.diceResultCard.classList.toggle("is-natural-1", result.isNatural1);
  dom.diceLive.textContent = `${result.formula} totals ${result.total}.`;
}

function rollDice() {
  const count = clampNumber(dom.diceCount.value, 1, 10, 1);
  const modifier = clampNumber(dom.diceModifier.value, -99, 99, 0);
  const dieType = state.dicePrefs.die;
  const sides = Number(dieType.replace("d", ""));
  const results = [];

  for (let index = 0; index < count; index += 1) {
    results.push(cryptoRoll(sides));
  }

  const total = results.reduce((sum, value) => sum + value, 0) + modifier;
  const result = {
    formula: `${count}${dieType}${modifier ? ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}` : ""}`,
    results,
    modifier,
    total,
    isNatural20: dieType === "d20" && count === 1 && modifier === 0 && results[0] === 20,
    isNatural1: dieType === "d20" && count === 1 && modifier === 0 && results[0] === 1
  };

  state.dicePrefs = { die: dieType, count, modifier };
  state.diceHistory = [result, ...state.diceHistory].slice(0, 10);
  persistDiceState();
  renderDiceInputs();
  renderDiceHistory();
  renderDiceResult(result);
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
          "data-calculated-kind": "abilityModifier",
          "data-ability": ability.key,
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
        "data-calculated-kind": "savingThrow",
        "data-ability": ability.key,
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
        "data-calculated-kind": "skillModifier",
        "data-skill": skill.key,
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
  renderDiceResult({
    formula: "Choose your roll.",
    results: [],
    modifier: 0,
    total: "-",
    isNatural20: false,
    isNatural1: false
  });
  renderSheet();
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
    if (control && state.pendingRemoteFields.has(control.dataset.field)) {
      state.pendingRemoteFields.delete(control.dataset.field);
      renderAllFields();
    }
  });

  dom.sheetForm.addEventListener("click", (event) => {
    const attackDeleteButton = event.target.closest("[data-delete-attack]");
    if (attackDeleteButton) {
      const rowId = attackDeleteButton.dataset.deleteAttack;
      const relativePath = `sheet/attacks/rows/${rowId}`;
      applyRelativeUpdate(state.selectedCharacterId, relativePath, null);
      renderAttacks();
      commitWrite(state.selectedCharacterId, relativePath, null);
      return;
    }

    const spellDeleteButton = event.target.closest("[data-delete-spell]");
    if (spellDeleteButton) {
      const [levelKey, rowId] = spellDeleteButton.dataset.deleteSpell.split(":");
      const relativePath = `sheet/spellcasting/${levelKey}/rows/${rowId}`;
      applyRelativeUpdate(state.selectedCharacterId, relativePath, null);
      renderSpellSections();
      commitWrite(state.selectedCharacterId, relativePath, null);
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
  dom.diceCloseButton.addEventListener("click", closeModal);
  dom.settingsButton.addEventListener("click", () => openModal("settings", dom.settingsButton));
  dom.settingsCloseButton.addEventListener("click", closeModal);
  dom.rollButton.addEventListener("click", rollDice);
  dom.clearHistoryButton.addEventListener("click", () => {
    state.diceHistory = [];
    persistDiceState();
    renderDiceHistory();
    renderDiceResult({
      formula: "Choose your roll.",
      results: [],
      modifier: 0,
      total: "-",
      isNatural20: false,
      isNatural1: false
    });
  });

  dom.diceTypeGroup.addEventListener("click", (event) => {
    const dieButton = event.target.closest("[data-die]");
    if (!dieButton) {
      return;
    }
    state.dicePrefs.die = dieButton.dataset.die;
    persistDiceState();
    renderDiceInputs();
  });

  dom.diceCount.addEventListener("change", () => {
    state.dicePrefs.count = clampNumber(dom.diceCount.value, 1, 10, 1);
    persistDiceState();
    renderDiceInputs();
  });

  dom.diceModifier.addEventListener("change", () => {
    state.dicePrefs.modifier = clampNumber(dom.diceModifier.value, -99, 99, 0);
    persistDiceState();
    renderDiceInputs();
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
    state.currentUser = user;
    state.permissionDenied = false;
    state.lastWriteError = "";

    if (user) {
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
