import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, parse } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { globalInstructionsPath, readGlobalInstructions, resolveDshHome, writeGlobalInstructions } from '../src/store'

describe('用户全局指令文件存储 (seam 1)', () => {
  let dir: string
  let home: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'dsh-global-prompt-'))
    home = join(dir, 'nested', 'dsh-home')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('读取不存在的全局指令文件: exists=false, content 为空串, path 指向 AGENTS.md', async () => {
    const snapshot = await readGlobalInstructions(home)
    expect(snapshot.exists).toBe(false)
    expect(snapshot.content).toBe('')
    expect(snapshot.path).toBe(join(home, 'AGENTS.md'))
  })

  it('globalInstructionsPath 返回 <dshHome>/AGENTS.md', () => {
    expect(globalInstructionsPath(home)).toBe(join(home, 'AGENTS.md'))
  })

  it('写入会创建尚未存在的目录与文件, 内容与参数完全一致', async () => {
    await writeGlobalInstructions(home, '第一条规则')
    expect(await readFile(join(home, 'AGENTS.md'), 'utf8')).toBe('第一条规则')
  })

  it('以 UTF-8 无 BOM 编码写入中文内容', async () => {
    await writeGlobalInstructions(home, '规则 1: 中文内容')
    const bytes = await readFile(join(home, 'AGENTS.md'))
    expect(bytes[0]).not.toBe(0xef)
    expect(bytes.toString('utf8')).toBe('规则 1: 中文内容')
  })

  it('第二次写入覆盖旧内容', async () => {
    await writeGlobalInstructions(home, '旧内容')
    await writeGlobalInstructions(home, '新内容')
    expect(await readFile(join(home, 'AGENTS.md'), 'utf8')).toBe('新内容')
  })

  it('写入后读取 round-trip: exists=true 且内容一致', async () => {
    await writeGlobalInstructions(home, 'round-trip 内容')
    const snapshot = await readGlobalInstructions(home)
    expect(snapshot.exists).toBe(true)
    expect(snapshot.content).toBe('round-trip 内容')
  })

  it('位于用户主目录下时 displayPath 用 ~ 前缀并以 / 分隔', async () => {
    const underHome = join(homedir(), '.dsh')
    const snapshot = await readGlobalInstructions(underHome)
    expect(snapshot.displayPath).toBe('~/.dsh/AGENTS.md')
  })

  it('不在主目录下时 displayPath 返回绝对路径', async () => {
    const outside = join(parse(homedir()).root, 'not-under-home', 'dsh-home')
    const snapshot = await readGlobalInstructions(outside)
    expect(snapshot.displayPath).toBe(join(outside, 'AGENTS.md'))
  })
})

describe('resolveDshHome', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('展开 ~ 前缀到操作系统主目录', () => {
    expect(resolveDshHome('~/.dsh')).toBe(join(homedir(), '.dsh'))
  })

  it('展开 Windows 风格 ~\\ 前缀到操作系统主目录', () => {
    expect(resolveDshHome('~\\.dsh')).toBe(join(homedir(), '.dsh'))
  })

  it('不触碰没有 ~ 前缀的路径', () => {
    expect(resolveDshHome('C:\\custom-dsh')).toBe('C:\\custom-dsh')
  })

  it('未显式给出时优先 DSH_HOME 环境变量', () => {
    vi.stubEnv('DSH_HOME', 'C:\\env-dsh')
    expect(resolveDshHome(undefined)).toBe('C:\\env-dsh')
  })

  it('DSH_HOME 未设置时回落到 ~/.dsh', () => {
    vi.stubEnv('DSH_HOME', '')
    expect(resolveDshHome(undefined)).toBe(join(homedir(), '.dsh'))
  })
})
