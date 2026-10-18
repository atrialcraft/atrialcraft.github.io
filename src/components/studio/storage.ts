// The studio draft lives in this browser only: text in localStorage,
// photos (too big for localStorage) in IndexedDB.

import { emptyDraft, type Draft, type PhotoMeta } from '@/components/studio/mdx'

const draftKey = 'atrial-studio-draft'
const dbName = 'atrial-studio'
const storeName = 'photos'

export type Saved = { draft: Draft; photos: Array<PhotoMeta> }

export function loadDraft(): Saved {
  try {
    let raw = window.localStorage.getItem(draftKey)
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
  } catch {
    // Private mode or full storage: the draft just won't survive a reload
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open(dbName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  let db = await openDb()
  return new Promise((resolve, reject) => {
    let request = action(db.transaction(storeName, mode).objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function putPhoto(name: string, blob: Blob) {
  return withStore('readwrite', (store) => store.put(blob, name))
}

export function getPhoto(name: string) {
  return withStore<Blob | undefined>('readonly', (store) => store.get(name))
}

export function deletePhoto(name: string) {
  return withStore('readwrite', (store) => store.delete(name))
}

export function clearPhotos() {
  return withStore('readwrite', (store) => store.clear())
}
