/**
 * 全局指令设置页编辑器 (seam 2): 一个自包含的编辑器组件。
 * 通过注入的 `api` 读写用户全局指令文件; 不依赖任何 @deepseek-ai 运行时模块
 * (client bundle 纯度门禁), 仅使用 React。
 */
import { useCallback, useEffect, useState } from 'react'

/** One load of the user-global instructions file. */
export interface GlobalPromptLoadResult {
  exists: boolean
  content: string
  displayPath: string
}

/** Editor-facing IO boundary: the HTTP implementation lives in ./api.ts. */
export interface GlobalPromptApi {
  load(): Promise<GlobalPromptLoadResult>
  save(content: string): Promise<void>
}

export interface GlobalPromptEditorProps {
  api: GlobalPromptApi
}

type Phase = 'loading' | 'ready' | 'failed'

export function GlobalPromptEditor({ api }: GlobalPromptEditorProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [displayPath, setDisplayPath] = useState('')
  const [fileExists, setFileExists] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  const dirty = draft !== savedContent

  const load = useCallback(async () => {
    setPhase('loading')
    setLoadError('')
    setSaveError('')
    setSaved(false)
    try {
      const result = await api.load()
      setDraft(result.content)
      setSavedContent(result.content)
      setDisplayPath(result.displayPath)
      setFileExists(result.exists)
      setPhase('ready')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
      setPhase('failed')
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!dirty) return
    const listener = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', listener)
    return () => window.removeEventListener('beforeunload', listener)
  }, [dirty])

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      await api.save(draft)
      setSavedContent(draft)
      setSaved(true)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  if (phase === 'loading') {
    return <div role="status">加载中…</div>
  }

  if (phase === 'failed') {
    return (
      <div role="alert">
        <p>加载失败: {loadError}</p>
        <button type="button" onClick={() => { void load() }}>重试</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      <p style={{ margin: 0 }}>{displayPath}</p>
      {!fileExists && <p style={{ margin: 0 }}>文件不存在, 保存时将创建</p>}
      <textarea
        aria-label="全局指令内容"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          setSaved(false)
        }}
        rows={16}
        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
      />
      <p style={{ margin: 0 }}>字符数: {draft.length}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" disabled={!dirty || saving} onClick={() => { void handleSave() }}>
          {saving ? '保存中…' : '保存'}
        </button>
        {saved && <span role="status">已保存</span>}
        {saveError !== '' && <span role="alert">保存失败: {saveError}</span>}
      </div>
    </div>
  )
}
