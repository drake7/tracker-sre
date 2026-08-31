// Persistence layer: localStorage (always on) + optional File System Access API save file.
// Same STORAGE_KEY/shape as the original single-file tracker, so progress carries over.

export const STORAGE_KEY = "deepakPrepTrackerV1";
export const IDB_NAME = "deepakPrepTrackerDB";
export const FS_SUPPORTED =
  typeof window !== "undefined" &&
  typeof window.showSaveFilePicker === "function" &&
  typeof window.showOpenFilePicker === "function";

export function emptyState() {
  return { progress: {}, notes: {}, activityDays: {} };
}

export function migrateState(parsed) {
  const base = Object.assign(emptyState(), parsed || {});
  const migratedProgress = {};
  Object.entries(base.progress || {}).forEach(([id, val]) => {
    if (typeof val === "boolean") {
      migratedProgress[id] = { done: val, doneAt: null };
    } else if (val && typeof val === "object") {
      migratedProgress[id] = { done: !!val.done, doneAt: val.doneAt || null };
    }
  });
  base.progress = migratedProgress;
  base.notes = base.notes || {};
  base.activityDays = base.activityDays || {};
  return base;
}

export function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateState(JSON.parse(raw));
  } catch (e) {
    /* ignore */
  }
  return emptyState();
}

export function saveToLocalStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* ignore quota errors etc */
  }
}

/* ---- IndexedDB: remember the connected file handle across reloads ---- */
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("handles");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function idbSetHandle(handle) {
  try {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("handles", "readwrite");
      tx.objectStore("handles").put(handle, "fileHandle");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    /* ignore */
  }
}
export async function idbGetHandle() {
  try {
    const db = await idbOpen();
    return new Promise((resolve) => {
      const tx = db.transaction("handles", "readonly");
      const req = tx.objectStore("handles").get("fileHandle");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

/* ---- File System Access API helpers ---- */
export async function writeStateToFile(handle, state) {
  if (!handle) return false;
  try {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(state, null, 2));
    await writable.close();
    return true;
  } catch (e) {
    return false;
  }
}
export async function readStateFromFile(handle) {
  const file = await handle.getFile();
  const text = await file.text();
  if (text && text.trim()) return migrateState(JSON.parse(text));
  return null;
}

/* ---- Derived stats ---- */
export function isDone(state, id) {
  const p = state.progress[id];
  return !!(p && p.done);
}
export function allItemsOf(cat) {
  return cat.sections.flatMap((s) => s.items);
}
export function catStats(state, cat) {
  const items = allItemsOf(cat);
  const done = items.filter((i) => isDone(state, i.id)).length;
  return { done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}
export function roadmapStats(state, roadmap) {
  const items = Object.values(roadmap).flat();
  const done = items.filter((i) => isDone(state, i.id)).length;
  return { done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}
export function overallStats(state, categories, roadmap) {
  let done = 0, total = 0;
  categories.forEach((c) => {
    const s = catStats(state, c);
    done += s.done; total += s.total;
  });
  const rm = roadmapStats(state, roadmap);
  done += rm.done; total += rm.total;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
export function currentStreak(state) {
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (state.activityDays[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}
export function monthlyCounts(state) {
  const counts = {};
  Object.values(state.progress).forEach((p) => {
    if (p && p.done && p.doneAt) {
      const ym = p.doneAt.slice(0, 7);
      counts[ym] = (counts[ym] || 0) + 1;
    }
  });
  return counts;
}
