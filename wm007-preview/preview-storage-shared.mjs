/** Shared isolated localStorage for preview packaging.
 *  Each preview/wm00N/preview-storage.mjs binds a unique PREFIX.
 */
export function createPreviewStorage(PREFIX) {
  if (!/^webmaster\.wm\d{3}-preview\.v1:$/.test(PREFIX)) {
    throw new Error(`Invalid preview PREFIX: ${PREFIX}`);
  }

  function isolatedStorage(native) {
    const get = native.getItem.bind(native);
    const set = native.setItem.bind(native);
    const remove = native.removeItem.bind(native);
    const key = native.key.bind(native);
    const keys = () => {
      const result = [];
      for (let i = 0; i < native.length; i++) {
        const name = key(i);
        if (name?.startsWith(PREFIX)) result.push(name.slice(PREFIX.length));
      }
      return result;
    };
    return Object.freeze({
      getItem(name) {
        return get(PREFIX + String(name));
      },
      setItem(name, value) {
        set(PREFIX + String(name), String(value));
      },
      removeItem(name) {
        remove(PREFIX + String(name));
      },
      clear() {
        for (const name of keys()) remove(PREFIX + name);
      },
      key(index) {
        return keys()[Number(index) >>> 0] ?? null;
      },
      get length() {
        return keys().length;
      },
    });
  }

  function installIsolatedStorage(target) {
    const scoped = isolatedStorage(target.localStorage);
    // Fail closed: if replacement is unavailable, never import the game entry.
    Object.defineProperty(target, "localStorage", {
      configurable: false,
      enumerable: true,
      get: () => scoped,
    });
    if (target.localStorage !== scoped) {
      throw new Error("Preview save isolation unavailable");
    }
    return scoped;
  }

  return { PREFIX, isolatedStorage, installIsolatedStorage };
}
