import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type UserCredential,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { dateKey, getMonthKey } from "./lib/tracker";

export type Score = 1 | 2 | 3 | 4 | 5;

export type Habit = {
  id: string;
  name: string;
  area: string;
  color: string;
  parentId?: string;
  archived?: boolean;
};

export type HabitEntry = {
  habitId: string;
  date: string;
  score: Score;
};

export type DayNotes = Record<string, string>;
export type EntryNotes = Record<string, string>;

export type UserProfile = {
  nickname?: string;
};

export type UserPreferences = {
  expandedProjectIds?: string[];
  expandedMobileExerciseIds?: string[];
  mobileDateExpanded?: boolean;
  calendarAnchorMigrationVersion?: number;
  calendarAnchorDate?: string;
  calendarPeriodDays?: number;
};

export type TrackerState = {
  habits: Habit[];
  entries: Record<string, HabitEntry>;
  dayNotes: DayNotes;
  entryNotes: EntryNotes;
  profile?: UserProfile;
  preferences?: UserPreferences;
  updatedAt: string;
};

export type CloudTrackerMeta = Omit<TrackerState, "entries" | "dayNotes" | "entryNotes"> & {
  schemaVersion: 3;
  firstMonth: string | null;
  lastMonth: string | null;
};

export type CloudTrackerMonth = {
  monthKey: string;
  entries: Record<string, HabitEntry>;
  dayNotes: DayNotes;
  entryNotes: EntryNotes;
  updatedAt: string;
};

const STORAGE_KEY = "beat-by-bit-tracker-state-v1";
const CALENDAR_ANCHOR_MIGRATION_VERSION = 1;

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyDGICUQn7FvdmDD2lt_tTsbLtGY6WqUBLs",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "beat-by-bit-iveivs.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "beat-by-bit-iveivs",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "beat-by-bit-iveivs.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "616152847971",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:616152847971:web:70060de842f6b7e1810a56",
};

export const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId,
);

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function ensureFirebase() {
  if (!hasFirebaseConfig) return null;
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  }
  return { auth: auth!, db: db! };
}

export function makeEntryKey(habitId: string, date: string) {
  return `${date}__${habitId}`;
}

export function getDateFromEntryKey(entryKey: string) {
  return entryKey.slice(0, 10);
}

export function createDefaultState(): TrackerState {
  const today = dateKey(new Date());
  const techniqueId = crypto.randomUUID();
  const timingId = crypto.randomUUID();
  const coordinationId = crypto.randomUUID();
  const repertoireId = crypto.randomUUID();
  const habits: Habit[] = [
    { id: techniqueId, name: "Техника рук", area: "основа", color: "#2f80ed" },
    {
      id: crypto.randomUUID(),
      name: "Одиночные удары",
      area: "упражнение",
      color: "#2f80ed",
      parentId: techniqueId,
    },
    {
      id: crypto.randomUUID(),
      name: "Двойные удары",
      area: "упражнение",
      color: "#2f80ed",
      parentId: techniqueId,
    },
    {
      id: crypto.randomUUID(),
      name: "Парадиддлы",
      area: "упражнение",
      color: "#2f80ed",
      parentId: techniqueId,
    },
    { id: timingId, name: "Тайминг", area: "ритм", color: "#e8cf52" },
    {
      id: crypto.randomUUID(),
      name: "Игра с метрономом",
      area: "упражнение",
      color: "#e8cf52",
      parentId: timingId,
    },
    {
      id: crypto.randomUUID(),
      name: "Восьмые и шестнадцатые",
      area: "упражнение",
      color: "#e8cf52",
      parentId: timingId,
    },
    {
      id: crypto.randomUUID(),
      name: "Темповая лестница",
      area: "упражнение",
      color: "#e8cf52",
      parentId: timingId,
    },
    {
      id: coordinationId,
      name: "Координация",
      area: "независимость",
      color: "#70b86f",
    },
    {
      id: crypto.randomUUID(),
      name: "Руки и ноги",
      area: "упражнение",
      color: "#70b86f",
      parentId: coordinationId,
    },
    {
      id: crypto.randomUUID(),
      name: "Независимость конечностей",
      area: "упражнение",
      color: "#70b86f",
      parentId: coordinationId,
    },
    { id: repertoireId, name: "Репертуар", area: "музыка", color: "#e66767" },
    {
      id: crypto.randomUUID(),
      name: "Текущая композиция",
      area: "упражнение",
      color: "#e66767",
      parentId: repertoireId,
    },
    {
      id: crypto.randomUUID(),
      name: "Игра под минус",
      area: "упражнение",
      color: "#e66767",
      parentId: repertoireId,
    },
  ];

  return {
    habits,
    entries: {},
    dayNotes: {},
    entryNotes: {},
    preferences: {
      expandedProjectIds: [techniqueId, timingId, coordinationId, repertoireId],
      expandedMobileExerciseIds: [],
      mobileDateExpanded: false,
      calendarAnchorMigrationVersion: CALENDAR_ANCHOR_MIGRATION_VERSION,
      calendarAnchorDate: today,
      calendarPeriodDays: 10,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyState(): TrackerState {
  const today = dateKey(new Date());

  return {
    habits: [],
    entries: {},
    dayNotes: {},
    entryNotes: {},
    profile: {},
    preferences: {
      expandedProjectIds: [],
      expandedMobileExerciseIds: [],
      mobileDateExpanded: false,
      calendarAnchorMigrationVersion: CALENDAR_ANCHOR_MIGRATION_VERSION,
      calendarAnchorDate: today,
      calendarPeriodDays: 10,
    },
    updatedAt: new Date().toISOString(),
  };
}

function normalizeState(state: TrackerState): TrackerState {
  const today = dateKey(new Date());
  const calendarPeriodCandidate = state.preferences?.calendarPeriodDays;
  const savedCalendarAnchorDate = state.preferences?.calendarAnchorDate;
  const hasValidSavedCalendarAnchor =
    typeof savedCalendarAnchorDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(savedCalendarAnchorDate) &&
    !Number.isNaN(new Date(`${savedCalendarAnchorDate}T12:00:00`).getTime());
  const normalizedCalendarAnchorDate =
    state.preferences?.calendarAnchorMigrationVersion ===
      CALENDAR_ANCHOR_MIGRATION_VERSION && hasValidSavedCalendarAnchor
      ? savedCalendarAnchorDate
      : today;
  const normalizedPeriod =
    typeof calendarPeriodCandidate === "number" &&
    [7, 10, 14, 30].includes(calendarPeriodCandidate)
      ? calendarPeriodCandidate
      : 10;

  return {
    ...state,
    habits: Array.isArray(state.habits) ? state.habits.filter(Boolean) : [],
    entries: Object.fromEntries(
      Object.entries(state.entries ?? {}).flatMap(([key, entry]) => {
        if (!entry || typeof entry !== "object") return [];
        if (typeof entry.habitId !== "string" || typeof entry.date !== "string") {
          return [];
        }
        if (![1, 2, 3, 4, 5].includes(entry.score)) return [];
        if (entry.date > today) return [];
        return [[key, entry]];
      }),
    ),
    dayNotes: Object.fromEntries(
      Object.entries(state.dayNotes ?? {}).flatMap(([date, note]) => {
        if (typeof note !== "string") return [];
        const normalized = note.trim().slice(0, 500);
        return normalized ? [[date, normalized]] : [];
      }),
    ),
    entryNotes: Object.fromEntries(
      Object.entries(state.entryNotes ?? {}).flatMap(([entryKey, note]) => {
        if (typeof entryKey !== "string" || typeof note !== "string") return [];
        const normalized = note.trim().slice(0, 500);
        return normalized ? [[entryKey, normalized]] : [];
      }),
    ),
    profile: state.profile ?? {},
    preferences: {
      expandedProjectIds: (state.preferences?.expandedProjectIds ?? []).filter(
        (projectId): projectId is string => typeof projectId === "string",
      ),
      expandedMobileExerciseIds: (
        state.preferences?.expandedMobileExerciseIds ?? []
      ).filter((habitId): habitId is string => typeof habitId === "string"),
      mobileDateExpanded: state.preferences?.mobileDateExpanded === true,
      calendarAnchorMigrationVersion: CALENDAR_ANCHOR_MIGRATION_VERSION,
      calendarAnchorDate: normalizedCalendarAnchorDate,
      calendarPeriodDays: normalizedPeriod,
    },
  };
}

function createMetaRef(database: Firestore, userId: string) {
  return doc(database, "users", userId, "tracker", "meta");
}

function createLegacyRef(database: Firestore, userId: string) {
  return doc(database, "users", userId, "tracker", "state");
}

function createMonthRef(database: Firestore, userId: string, monthKey: string) {
  return doc(database, "users", userId, "months", monthKey);
}

function getSortedStateMonthKeys(state: TrackerState) {
  const monthKeys = new Set<string>();

  Object.values(state.entries).forEach((entry) => {
    monthKeys.add(getMonthKey(entry.date));
  });

  Object.keys(state.dayNotes).forEach((date) => {
    monthKeys.add(getMonthKey(date));
  });

  Object.keys(state.entryNotes).forEach((entryKey) => {
    monthKeys.add(getMonthKey(getDateFromEntryKey(entryKey)));
  });

  return [...monthKeys].sort();
}

function createCloudMeta(state: TrackerState): CloudTrackerMeta {
  const monthKeys = getSortedStateMonthKeys(state);

  return {
    habits: state.habits,
    profile: state.profile ?? {},
    preferences: state.preferences ?? {},
    updatedAt: state.updatedAt,
    schemaVersion: 3,
    firstMonth: monthKeys[0] ?? null,
    lastMonth: monthKeys[monthKeys.length - 1] ?? null,
  };
}

function buildStateFromMeta(meta: CloudTrackerMeta): TrackerState {
  return normalizeState({
    habits: meta.habits ?? [],
    entries: {},
    dayNotes: {},
    entryNotes: {},
    profile: meta.profile ?? {},
    preferences: meta.preferences ?? {},
    updatedAt: meta.updatedAt ?? new Date().toISOString(),
  });
}

function splitStateByMonth(state: TrackerState) {
  const months = new Map<string, CloudTrackerMonth>();

  function ensureMonth(monthKey: string) {
    const existing = months.get(monthKey);
    if (existing) return existing;

    const created: CloudTrackerMonth = {
      monthKey,
      entries: {},
      dayNotes: {},
      entryNotes: {},
      updatedAt: state.updatedAt,
    };
    months.set(monthKey, created);
    return created;
  }

  Object.entries(state.entries).forEach(([entryKey, entry]) => {
    const month = ensureMonth(getMonthKey(entry.date));
    month.entries[entryKey] = entry;
  });

  Object.entries(state.dayNotes).forEach(([date, note]) => {
    const month = ensureMonth(getMonthKey(date));
    month.dayNotes[date] = note;
  });

  Object.entries(state.entryNotes).forEach(([entryKey, note]) => {
    const month = ensureMonth(getMonthKey(getDateFromEntryKey(entryKey)));
    month.entryNotes[entryKey] = note;
  });

  return months;
}

function normalizeCloudMeta(meta: CloudTrackerMeta) {
  const baseState = normalizeState({
    habits: meta.habits ?? [],
    entries: {},
    dayNotes: {},
    entryNotes: {},
    profile: meta.profile ?? {},
    preferences: meta.preferences ?? {},
    updatedAt: meta.updatedAt ?? new Date().toISOString(),
  });

  return {
    ...baseState,
    schemaVersion: 3 as const,
    firstMonth: typeof meta.firstMonth === "string" ? meta.firstMonth : null,
    lastMonth: typeof meta.lastMonth === "string" ? meta.lastMonth : null,
  };
}

export function getStateMonthKeys(state: TrackerState) {
  return getSortedStateMonthKeys(state);
}

export function getCloudMetaFromState(state: TrackerState) {
  return createCloudMeta(normalizeState(state));
}

export function mergeMonthState(
  state: TrackerState,
  monthState: Pick<TrackerState, "entries" | "dayNotes" | "entryNotes">,
  monthKeysToReplace: string[],
) {
  const monthKeySet = new Set(monthKeysToReplace);

  const preservedEntries = Object.fromEntries(
    Object.entries(state.entries).filter(
      ([, entry]) => !monthKeySet.has(getMonthKey(entry.date)),
    ),
  );

  const preservedNotes = Object.fromEntries(
    Object.entries(state.dayNotes).filter(([date]) => !monthKeySet.has(getMonthKey(date))),
  );

  const preservedEntryNotes = Object.fromEntries(
    Object.entries(state.entryNotes).filter(
      ([entryKey]) => !monthKeySet.has(getMonthKey(getDateFromEntryKey(entryKey))),
    ),
  );

  return normalizeState({
    ...state,
    entries: { ...preservedEntries, ...monthState.entries },
    dayNotes: { ...preservedNotes, ...monthState.dayNotes },
    entryNotes: { ...preservedEntryNotes, ...monthState.entryNotes },
  });
}

export function loadLocalState(): TrackerState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultState();

  try {
    return normalizeState(JSON.parse(raw) as TrackerState);
  } catch {
    return createDefaultState();
  }
}

export function saveLocalState(state: TrackerState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function watchAuth(callback: (user: User | null) => void) {
  const firebase = ensureFirebase();
  if (!firebase) return () => undefined;
  return onAuthStateChanged(firebase.auth, callback);
}

export async function completeRedirectSignIn() {
  const firebase = ensureFirebase();
  if (!firebase) return null;
  return getRedirectResult(firebase.auth);
}

export async function signInWithGoogle() {
  const firebase = ensureFirebase();
  if (!firebase) return;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    await signInWithPopup(firebase.auth, provider);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

    if (
      code === "auth/popup-blocked" ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      await signInWithRedirect(firebase.auth, provider);
      return;
    }

    throw error;
  }
}

export async function signInWithEmail(email: string, password: string) {
  const firebase = ensureFirebase();
  if (!firebase) return;
  await signInWithEmailAndPassword(firebase.auth, email, password);
}

export async function registerWithEmail(
  email: string,
  password: string,
): Promise<UserCredential | undefined> {
  const firebase = ensureFirebase();
  if (!firebase) return;
  return createUserWithEmailAndPassword(firebase.auth, email, password);
}

export async function sendVerificationEmail(user: User) {
  const firebase = ensureFirebase();
  if (!firebase) return;

  firebase.auth.languageCode = "ru";
  await sendEmailVerification(user, {
    url: window.location.href,
    handleCodeInApp: false,
  });
}

export async function resetEmailPassword(email: string) {
  const firebase = ensureFirebase();
  if (!firebase) return;
  await sendPasswordResetEmail(firebase.auth, email);
}

export async function signOutOfGoogle() {
  const firebase = ensureFirebase();
  if (!firebase) return;
  await signOut(firebase.auth);
}

export function subscribeCloudState(
  userId: string,
  callback: (meta: CloudTrackerMeta | null) => void,
  onError?: (error: Error) => void,
) {
  const firebase = ensureFirebase();
  if (!firebase) return () => undefined;
  return onSnapshot(
    createMetaRef(firebase.db, userId),
    (snapshot) => {
      callback(
        snapshot.exists()
          ? normalizeCloudMeta(snapshot.data() as CloudTrackerMeta)
          : null,
      );
    },
    (error) => onError?.(error),
  );
}

export function subscribeCloudMonths(
  userId: string,
  monthKeys: string[],
  callback: (month: CloudTrackerMonth) => void,
  onError?: (error: Error) => void,
) {
  const firebase = ensureFirebase();
  if (!firebase) return () => undefined;

  const unsubscribers = [...new Set(monthKeys)].map((monthKey) =>
    onSnapshot(
      createMonthRef(firebase.db, userId, monthKey),
      (snapshot) => {
        const data = snapshot.exists()
          ? (snapshot.data() as CloudTrackerMonth)
          : {
              monthKey,
              entries: {},
              dayNotes: {},
              entryNotes: {},
              updatedAt: new Date(0).toISOString(),
            };
        callback(data);
      },
      (error) => onError?.(error),
    ),
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function loadCloudMeta(userId: string) {
  const firebase = ensureFirebase();
  if (!firebase) return null;
  const metaSnapshot = await getDoc(createMetaRef(firebase.db, userId));
  if (metaSnapshot.exists()) {
    return normalizeCloudMeta(metaSnapshot.data() as CloudTrackerMeta);
  }

  const legacySnapshot = await getDoc(createLegacyRef(firebase.db, userId));
  if (!legacySnapshot.exists()) return null;

  return createCloudMeta(normalizeState(legacySnapshot.data() as TrackerState));
}

export async function migrateLegacyCloudState(userId: string) {
  const firebase = ensureFirebase();
  if (!firebase) return false;

  const metaSnapshot = await getDoc(createMetaRef(firebase.db, userId));
  if (metaSnapshot.exists()) return false;

  const legacySnapshot = await getDoc(createLegacyRef(firebase.db, userId));
  if (!legacySnapshot.exists()) return false;

  const legacyState = normalizeState(legacySnapshot.data() as TrackerState);
  await saveCloudState(userId, legacyState, getSortedStateMonthKeys(legacyState));
  return true;
}

export async function loadCloudMonths(userId: string, monthKeys: string[]) {
  const firebase = ensureFirebase();
  if (!firebase) return { entries: {}, dayNotes: {}, entryNotes: {} };

  const uniqueMonths = [...new Set(monthKeys)].sort();
  const snapshots = await Promise.all(
    uniqueMonths.map((monthKey) => getDoc(createMonthRef(firebase.db, userId, monthKey))),
  );

  return snapshots.reduce<Pick<TrackerState, "entries" | "dayNotes" | "entryNotes">>(
    (accumulator, snapshot) => {
      if (!snapshot.exists()) return accumulator;
      const data = snapshot.data() as CloudTrackerMonth;
      return {
        entries: { ...accumulator.entries, ...(data.entries ?? {}) },
        dayNotes: { ...accumulator.dayNotes, ...(data.dayNotes ?? {}) },
        entryNotes: { ...accumulator.entryNotes, ...(data.entryNotes ?? {}) },
      };
    },
    { entries: {}, dayNotes: {}, entryNotes: {} },
  );
}

export async function loadCloudState(userId: string, monthKeys: string[]) {
  const meta = await loadCloudMeta(userId);
  if (!meta) return null;

  const firebase = ensureFirebase();
  if (!firebase) return null;

  const metaSnapshot = await getDoc(createMetaRef(firebase.db, userId));
  if (!metaSnapshot.exists()) {
    const legacySnapshot = await getDoc(createLegacyRef(firebase.db, userId));
    return legacySnapshot.exists()
      ? normalizeState(legacySnapshot.data() as TrackerState)
      : null;
  }

  const monthState = await loadCloudMonths(userId, monthKeys);
  return mergeMonthState(buildStateFromMeta(meta), monthState, monthKeys);
}

export async function saveCloudState(
  userId: string,
  state: TrackerState,
  dirtyMonthKeys: string[] = [],
) {
  const firebase = ensureFirebase();
  if (!firebase) return;

  const normalizedState = normalizeState(state);
  const batch = writeBatch(firebase.db);
  const monthBuckets = splitStateByMonth(normalizedState);
  const monthsToWrite = [...new Set(dirtyMonthKeys)].sort();

  batch.set(createMetaRef(firebase.db, userId), createCloudMeta(normalizedState));

  monthsToWrite.forEach((monthKey) => {
    const monthDoc = monthBuckets.get(monthKey) ?? {
      monthKey,
      entries: {},
      dayNotes: {},
      entryNotes: {},
      updatedAt: normalizedState.updatedAt,
    };
    batch.set(createMonthRef(firebase.db, userId, monthKey), monthDoc);
  });

  await batch.commit();
}

export async function resetCloudState(userId: string, state: TrackerState) {
  const firebase = ensureFirebase();
  if (!firebase) return;

  const normalizedState = normalizeState(state);
  const monthsSnapshot = await getDocs(
    collection(firebase.db, "users", userId, "months"),
  );

  if (monthsSnapshot.size > 498) {
    throw new Error("Too many month documents to reset in one batch");
  }

  const resetBatch = writeBatch(firebase.db);
  resetBatch.set(createMetaRef(firebase.db, userId), {
    ...createCloudMeta(normalizedState),
    serverUpdatedAt: serverTimestamp(),
  });
  resetBatch.delete(createLegacyRef(firebase.db, userId));
  monthsSnapshot.docs.forEach((month) => resetBatch.delete(month.ref));
  await resetBatch.commit();
}

type CloudMonthField = "entries" | "dayNotes" | "entryNotes";

async function saveCloudMonthField(
  userId: string,
  state: TrackerState,
  monthKey: string,
  field: CloudMonthField,
  key: string,
  value: HabitEntry | string | null,
) {
  const firebase = ensureFirebase();
  if (!firebase) return;

  const normalizedState = normalizeState(state);
  const updatedAt = normalizedState.updatedAt;
  const monthKeys = getSortedStateMonthKeys(normalizedState);
  const batch = writeBatch(firebase.db);

  batch.set(
    createMonthRef(firebase.db, userId, monthKey),
    {
      monthKey,
      [field]: { [key]: value ?? deleteField() },
      updatedAt,
      serverUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(
    createMetaRef(firebase.db, userId),
    {
      updatedAt,
      firstMonth: monthKeys[0] ?? null,
      lastMonth: monthKeys[monthKeys.length - 1] ?? null,
      serverUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}

export function saveCloudEntry(
  userId: string,
  state: TrackerState,
  date: string,
  entryKey: string,
  entry: HabitEntry | null,
) {
  return saveCloudMonthField(
    userId,
    state,
    getMonthKey(date),
    "entries",
    entryKey,
    entry,
  );
}

export function saveCloudDayNote(
  userId: string,
  state: TrackerState,
  date: string,
  note: string | null,
) {
  return saveCloudMonthField(
    userId,
    state,
    getMonthKey(date),
    "dayNotes",
    date,
    note,
  );
}

export function saveCloudEntryNote(
  userId: string,
  state: TrackerState,
  date: string,
  entryKey: string,
  note: string | null,
) {
  return saveCloudMonthField(
    userId,
    state,
    getMonthKey(date),
    "entryNotes",
    entryKey,
    note,
  );
}
