/**
 * 用户全局指令文件存储 (seam 1): 对 `$DSH_HOME/AGENTS.md` 的读写语义。
 * 该文件本身是唯一真源; 设置页与外部编辑读写同一份文件。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, sep } from 'node:path'

/** One read of the user-global instructions file. */
export interface GlobalInstructionsSnapshot {
  /** Whether the file existed at read time. */
  exists: boolean
  /** File content; empty string when the file does not exist. */
  content: string
  /** Absolute path that was read (or that a write would create). */
  path: string
  /** Human-friendly path for the UI. */
  displayPath: string
}

/** The instructions file is always `<dshHome>/AGENTS.md`. */
export function globalInstructionsPath(dshHome: string): string {
  return join(dshHome, 'AGENTS.md')
}

/** Resolve the harness home: explicit value, then DSH_HOME, then ~/.dsh. */
export function resolveDshHome(explicit: string | undefined): string {
  const raw = explicit || process.env.DSH_HOME || '~/.dsh'
  const home = homedir()
  if (raw === '~') return home
  if (raw.startsWith('~/')) return join(home, raw.slice(2))
  if (raw.startsWith('~\\')) return join(home, raw.slice(2))
  return raw
}

/** Read the user-global instructions file; a missing file is a confirmed absence. */
export async function readGlobalInstructions(dshHome: string): Promise<GlobalInstructionsSnapshot> {
  const path = globalInstructionsPath(dshHome)
  try {
    const content = await readFile(path, 'utf8')
    return { exists: true, content, path, displayPath: displayPathOf(path) }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return { exists: false, content: '', path, displayPath: displayPathOf(path) }
  }
}

/** `~`-prefixed, `/`-separated form of a path under the OS home; the absolute path otherwise. */
function displayPathOf(path: string): string {
  const home = homedir()
  const normalized = path.split(sep).join('/')
  const homeNormalized = home.split(sep).join('/')
  const lower = path.toLowerCase()
  const homeLower = home.toLowerCase()
  if (lower === homeLower || lower.startsWith(homeLower + sep.toLowerCase())) {
    return '~' + normalized.slice(homeNormalized.length)
  }
  return path
}

/** Write the user-global instructions file, creating missing directories and the file. */
export async function writeGlobalInstructions(dshHome: string, content: string): Promise<void> {
  const path = globalInstructionsPath(dshHome)
  await mkdir(dshHome, { recursive: true })
  await writeFile(path, content, 'utf8')
}
