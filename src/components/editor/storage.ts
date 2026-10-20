// The Верстак draft lives in this browser only: text in localStorage,
// photos (too big for localStorage) in IndexedDB.

import { emptyDraft, type Draft, type PhotoMeta } from '@/components/editor/mdx'

const draftKey = 'atrial-editor-draft'
const dbName = 'atrial-editor'
// TEMPORARY, remove after the first visit to the editor following the rename:
// the draft and photos saved under the old names are moved to the new ones
const oldDraftKey = 'atrial-studio-draft'
const oldDbName = 'atrial-studio'
const storeName = 'photos'

export type Saved = { draft: Draft; photos: Array<PhotoMeta> }

export function loadDraft(): Saved {
  try {
    let raw =
      window.localStorage.getItem(draftKey) ??
      window.localStorage.getItem(oldDraftKey)
    if (raw) {
      let saved = JSON.parse(raw) as Partial<Saved>
      return {
        draft: { ...emptyDraft(), ...saved.draft },
        photos: saved.photos ?? [],
      }
    }
  } catch {
    // Broken or unavailable storage: start clean
  }
  return { draft: emptyDraft(), photos: [] }
}

export function saveDraft(saved: Saved) {
  try {
    window.localStorage.setItem(draftKey, JSON.stringify(saved))
    window.localStorage.removeItem(oldDraftKey)
  } catch {
    // Private mode or full storage: the draft just won't survive a reload
  }
}

function openDb(name = dbName): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => {
      // The old database is only read: don't create an empty one
      if (name === oldDbName) request.transaction?.abort()
      else request.result.createObjectStore(storeName)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
  name = dbName,
): Promise<T> {
  let db = await openDb(name)
  return new Promise((resolve, reject) => {
    let request = action(db.transaction(storeName, mode).objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Runs on the old database if it exists; nothing happens otherwise */
async function withOldStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  try {
    return await withStore(mode, action, oldDbName)
  } catch {
    return undefined
  }
}

export function putPhoto(name: string, blob: Blob) {
  return withStore('readwrite', (store) => store.put(blob, name))
}

export async function getPhoto(name: string) {
  let blob = await withStore<Blob | undefined>('readonly', (store) =>
    store.get(name),
  )
  if (blob) return blob
  // A photo added before the rename: move it to the new database
  let old = await withOldStore<Blob | undefined>('readonly', (store) =>
    store.get(name),
  )
  if (old) {
    await putPhoto(name, old)
    await withOldStore('readwrite', (store) => store.delete(name))
  }
  return old
}

export async function deletePhoto(name: string) {
  await withOldStore('readwrite', (store) => store.delete(name))
  return withStore('readwrite', (store) => store.delete(name))
}

export async function clearPhotos() {
  await withOldStore('readwrite', (store) => store.clear())
  return withStore('readwrite', (store) => store.clear())
}
