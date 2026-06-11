type Entry<T> = { data: T; etag: string; expiresAt: number };

const store = new Map<string, Entry<any>>();

function makeEtag(): string {
  return `"${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}"`;
}

export const cache = {
  get<T>(key: string): Entry<T> | null {
    const e = store.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) { store.delete(key); return null; }
    return e as Entry<T>;
  },

  set<T>(key: string, data: T, ttlMs: number): Entry<T> {
    const entry: Entry<T> = { data, etag: makeEtag(), expiresAt: Date.now() + ttlMs };
    store.set(key, entry);
    return entry;
  },

  del(key: string): void {
    store.delete(key);
  },

  delPrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },
};

export const TTL = {
  LEADS:   60_000,
  RULES:  300_000,
  USERS:  300_000,
  SHIFTS:  30_000,
  CHECKIN: 120_000,
};
