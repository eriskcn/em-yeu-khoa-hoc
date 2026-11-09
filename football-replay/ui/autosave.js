// Scenario autosave over a Storage-like object; storage may be missing, full or blocked.
export function createAutosave(storage, key) {
  return {
    save(data) { try { storage.setItem(key, data); } catch { /* storage unavailable or full */ } },
    load() { try { return storage.getItem(key) || null; } catch { return null; } }
  };
}
