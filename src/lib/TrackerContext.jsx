import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import {
  FS_SUPPORTED,
  emptyState,
  loadFromLocalStorage,
  saveToLocalStorage,
  migrateState,
  idbGetHandle,
  idbSetHandle,
  writeStateToFile,
  readStateFromFile,
} from "./storage.js";

const TrackerCtx = createContext(null);

export function TrackerProvider({ children }) {
  const [state, setState] = useState(() => (typeof window !== "undefined" ? loadFromLocalStorage() : emptyState()));
  const [fileHandle, setFileHandle] = useState(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [rememberedHandle, setRememberedHandle] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const fileHandleRef = useRef(null);
  fileHandleRef.current = fileHandle;

  // Try to silently reconnect a previously-approved save file on first mount.
  useEffect(() => {
    if (!FS_SUPPORTED) return;
    (async () => {
      const handle = await idbGetHandle();
      if (!handle) return;
      setRememberedHandle(handle);
      try {
        const perm = await handle.queryPermission({ mode: "readwrite" });
        if (perm === "granted") {
          setFileHandle(handle);
          const loaded = await readStateFromFile(handle);
          if (loaded) setState(loaded);
        } else {
          setNeedsReconnect(true);
        }
      } catch (e) {
        setNeedsReconnect(true);
      }
    })();
  }, []);

  const persist = useCallback((next) => {
    saveToLocalStorage(next);
    const handle = fileHandleRef.current;
    if (handle) {
      writeStateToFile(handle, next).then((ok) => {
        if (ok) setLastSavedAt(new Date());
      });
    }
  }, []);

  const updateState = useCallback(
    (updater) => {
      setState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const markToday = (draft) => {
    const today = new Date().toISOString().slice(0, 10);
    draft.activityDays[today] = true;
  };

  const toggleItem = useCallback(
    (id) => {
      updateState((prev) => {
        const cur = prev.progress[id];
        const nowDone = !(cur && cur.done);
        const next = {
          ...prev,
          progress: {
            ...prev.progress,
            [id]: nowDone ? { done: true, doneAt: new Date().toISOString() } : { done: false, doneAt: null },
          },
          activityDays: { ...prev.activityDays },
        };
        if (nowDone) markToday(next);
        return next;
      });
    },
    [updateState]
  );

  const setNote = useCallback(
    (id, val) => {
      updateState((prev) => ({ ...prev, notes: { ...prev.notes, [id]: val } }));
    },
    [updateState]
  );

  const resetAll = useCallback(() => {
    updateState(() => emptyState());
  }, [updateState]);

  const importState = useCallback(
    (parsed) => {
      updateState(() => migrateState(parsed));
    },
    [updateState]
  );

  const createSaveFile = useCallback(async () => {
    if (!FS_SUPPORTED) return;
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "deepak-prep-progress.json",
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      });
      setFileHandle(handle);
      setNeedsReconnect(false);
      await idbSetHandle(handle);
      const ok = await writeStateToFile(handle, state);
      if (ok) setLastSavedAt(new Date());
    } catch (e) {
      /* user cancelled */
    }
  }, [state]);

  const loadSaveFile = useCallback(async () => {
    if (!FS_SUPPORTED) return;
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      });
      const loaded = await readStateFromFile(handle);
      setFileHandle(handle);
      setNeedsReconnect(false);
      await idbSetHandle(handle);
      if (loaded) {
        setState(loaded);
        saveToLocalStorage(loaded);
      }
    } catch (e) {
      /* user cancelled */
    }
  }, []);

  const reconnectSaveFile = useCallback(async () => {
    if (!rememberedHandle) return;
    try {
      const perm = await rememberedHandle.requestPermission({ mode: "readwrite" });
      if (perm === "granted") {
        setFileHandle(rememberedHandle);
        setNeedsReconnect(false);
        const loaded = await readStateFromFile(rememberedHandle);
        if (loaded) {
          setState(loaded);
          saveToLocalStorage(loaded);
        }
      }
    } catch (e) {
      /* ignore */
    }
  }, [rememberedHandle]);

  const value = {
    state,
    toggleItem,
    setNote,
    resetAll,
    importState,
    fileHandle,
    needsReconnect,
    rememberedHandle,
    lastSavedAt,
    createSaveFile,
    loadSaveFile,
    reconnectSaveFile,
    FS_SUPPORTED,
  };

  return <TrackerCtx.Provider value={value}>{children}</TrackerCtx.Provider>;
}

export function useTracker() {
  const ctx = useContext(TrackerCtx);
  if (!ctx) throw new Error("useTracker must be used inside TrackerProvider");
  return ctx;
}
