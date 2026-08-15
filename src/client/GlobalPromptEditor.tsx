/**
 * 全局指令设置页编辑器 (seam 2): 一个自包含的编辑器组件。
 * 通过注入的 `api` 读写用户全局指令文件。视觉遵循设置面板设计语言:
 * 14/22 正文、12/18 说明文字、胶囊按钮、`border-l2` 细线, 颜色只经
 * `--dsw-alias-*` token (随明暗主题)。
 */
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './GlobalPromptEditor.module.css'

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
    return (
      <div className={css.section}>
        <p role="status" className={css.intro}>加载中…</p>
      </div>
    )
  }

  if (phase === 'failed') {
    return (
      <div className={css.section}>
        <div role="alert">
          <p className={css.error}>加载失败: {loadError}</p>
        </div>
        <div className={css.actions}>
          <Button variant="outline" onClick={() => { void load() }}>重试</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={css.section}>
      <div>
        <h1 className={css.title}>全局指令</h1>
        <p className={css.intro}>编辑所有会话共享的全局指令文件。新会话立即生效; 已打开会话在其下一次文件操作时刷新。</p>
      </div>
      <div className={css.card}>
        <div className={css.editorHead}>
          <span className={css.editorName}>AGENTS.md</span>
          <span className={css.editorPath}>{displayPath}</span>
        </div>
        {!fileExists && <p className={css.notice}>文件不存在, 保存时将创建</p>}
        <textarea
          className={css.editor}
          aria-label="全局指令内容"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setSaved(false)
          }}
          placeholder="输入适用于所有会话的全局指令, 例如编码规范、回复语言要求…"
        />
        <div className={css.meta}>
          <span>字符数: {draft.length}</span>
          {dirty && <span className={css.dirtyHint}>有未保存修改</span>}
        </div>
        <div className={css.actions}>
          <Button variant="primary" disabled={!dirty || saving} onClick={() => { void handleSave() }}>
            {saving ? '保存中…' : '保存'}
          </Button>
          {saved && <span role="status" className={css.saved}>已保存</span>}
          {saveError !== '' && <span role="alert" className={css.error}>保存失败: {saveError}</span>}
        </div>
      </div>
    </div>
  )
}
