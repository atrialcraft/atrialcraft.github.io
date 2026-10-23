// Publishes the article straight to the repository through the GitHub API:
// one commit with page.mdx and the photos, after which GitHub Actions
// rebuilds the site. The token lives only in this browser.

const owner = 'atrialcraft'
const repo = 'atrialcraft.github.io'
const branch = 'main'
const api = `https://api.github.com/repos/${owner}/${repo}`
const tokenKey = 'atrial-editor-github-token'

export const repoUrl = `https://github.com/${owner}/${repo}`

export function loadToken() {
  try {
    return window.localStorage.getItem(tokenKey) ?? ''
  } catch {
    return ''
  }
}

export function saveToken(token: string) {
  try {
    if (token) window.localStorage.setItem(tokenKey, token)
    else window.localStorage.removeItem(tokenKey)
  } catch {
    // Private mode: the token will have to be pasted again next time
  }
}

class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function request<T>(
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response = await fetch(`${api}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  if (!response.ok) {
    let details = ''
    try {
      details = ((await response.json()) as { message?: string }).message ?? ''
    } catch {
      // No JSON body
    }
    throw new GitHubError(explain(response.status, details), response.status)
  }
  return (await response.json()) as T
}

function explain(status: number, message: string) {
  if (status === 401) {
    return 'GitHub не принял токен: он неверный или истёк. Создайте новый.'
  }
  if (status === 403) {
    return `У токена нет права на запись. Нужен доступ Contents: Read and write к ${repo}. (${message})`
  }
  if (status === 404) {
    return `Репозиторий не найден. В токене должен быть выбран ${repo}, а владельцем — ${owner}.`
  }
  if (status === 409 || status === 422) {
    return `Пока вы публиковали, в репозитории появились другие изменения. Нажмите «Опубликовать» ещё раз. (${message})`
  }
  return `GitHub ответил ошибкой ${status}: ${message}`
}

/** Checks the token before saving it */
export async function checkToken(token: string) {
  await request(token, '')
}

function toBase64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

export type PublishFile = { name: string; bytes: Uint8Array }

/** Names of files already in the folder, or null when it doesn't exist */
export async function existingFiles(token: string, folder: string) {
  try {
    let entries = await request<Array<{ name: string; type: string }>>(
      token,
      `/contents/${folder}?ref=${branch}`,
    )
    return entries
      .filter((entry) => entry.type === 'file')
      .map((entry) => entry.name)
  } catch (error) {
    // 404 for the folder: a new article (the repo itself was checked with the token)
    if (error instanceof GitHubError && error.status === 404) {
      return null
    }
    throw error
  }
}

export type TreeEntry = { path: string; type: 'blob' | 'tree'; sha: string }

/** Every file of the repository on the main branch, with its blob sha */
export async function getTree(token: string) {
  let ref = await request<{ object: { sha: string } }>(
    token,
    `/git/ref/heads/${branch}`,
  )
  let tree = await request<{ tree: TreeEntry[] }>(
    token,
    `/git/trees/${ref.object.sha}?recursive=1`,
  )
  return tree.tree
}

function fromBase64(text: string) {
  let binary = atob(text.replace(/\s/g, ''))
  let bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Contents of a file by its blob sha (works for files of any size) */
export async function readBlob(token: string, sha: string) {
  let blob = await request<{ content: string }>(token, `/git/blobs/${sha}`)
  return fromBase64(blob.content)
}

export async function readText(token: string, sha: string) {
  return new TextDecoder().decode(await readBlob(token, sha))
}

/** Reads a file by its path; null when there is no such file */
export async function readFile(token: string, tree: TreeEntry[], path: string) {
  let entry = tree.find((e) => e.path === path && e.type === 'blob')
  return entry ? readBlob(token, entry.sha) : null
}

/** A file to write (bytes) or to delete (null), path from the repository root */
export type Change = { path: string; bytes: Uint8Array | null }

/** One commit with all the changes; GitHub Actions then rebuilds the site */
export async function commitChanges(
  token: string,
  changes: Change[],
  message: string,
) {
  let ref = await request<{ object: { sha: string } }>(
    token,
    `/git/ref/heads/${branch}`,
  )
  let parent = ref.object.sha
  let commit = await request<{ tree: { sha: string } }>(
    token,
    `/git/commits/${parent}`,
  )

  let entries = []
  for (let change of changes) {
    if (change.bytes === null) {
      entries.push({
        path: change.path,
        mode: '100644',
        type: 'blob',
        sha: null,
      })
      continue
    }
    let blob = await request<{ sha: string }>(token, '/git/blobs', {
      method: 'POST',
      body: { content: toBase64(change.bytes), encoding: 'base64' },
    })
    entries.push({
      path: change.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    })
  }

  let tree = await request<{ sha: string }>(token, '/git/trees', {
    method: 'POST',
    body: { base_tree: commit.tree.sha, tree: entries },
  })
  let created = await request<{ sha: string; html_url: string }>(
    token,
    '/git/commits',
    {
      method: 'POST',
      body: { message, tree: tree.sha, parents: [parent] },
    },
  )
  await request(token, `/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: { sha: created.sha },
  })
  return { commitUrl: created.html_url, actionsUrl: `${repoUrl}/actions` }
}

/** Writes the files into a folder and deletes the listed old ones */
export async function publish({
  token,
  folder,
  files,
  remove,
  message,
}: {
  token: string
  folder: string
  files: Array<PublishFile>
  /** Paths (from the repository root) of old files that are no longer needed */
  remove: Array<string>
  message: string
}) {
  return commitChanges(
    token,
    [
      ...files.map((file) => ({
        path: `${folder}/${file.name}`,
        bytes: file.bytes,
      })),
      ...remove.map((path) => ({ path, bytes: null })),
    ],
    message,
  )
}
