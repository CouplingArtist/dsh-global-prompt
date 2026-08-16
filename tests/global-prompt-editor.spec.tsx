// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GlobalPromptEditor, type GlobalPromptApi } from '../src/client/GlobalPromptEditor'

function makeApi(overrides: Partial<GlobalPromptApi> = {}): GlobalPromptApi {
  return {
    load: vi.fn().mockResolvedValue({
      exists: true,
      content: '规则一',
      displayPath: '~/.dsh/AGENTS.md',
    }),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('全局指令设置页编辑器 (seam 2)', () => {
  it('加载完成后在编辑器中显示文件内容、路径与字符数', async () => {
    const api = makeApi()
    render(<GlobalPromptEditor api={api} />)

    expect(screen.getByRole('status').textContent).toBe('加载中…')

    await waitFor(() => {
      const textarea = screen.getByLabelText('全局指令内容') as HTMLTextAreaElement
      expect(textarea.value).toBe('规则一')
    })
    expect(screen.getByText('~/.dsh/AGENTS.md')).not.toBeNull()
    expect(screen.getByText('字符数: 3')).not.toBeNull()
  })

  it('未修改时保存按钮禁用, 编辑后启用', async () => {
    const api = makeApi()
    render(<GlobalPromptEditor api={api} />)
    await waitFor(() => expect(screen.getByLabelText('全局指令内容')).not.toBeNull())

    const button = screen.getByRole('button', { name: '保存' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)

    const textarea = screen.getByLabelText('全局指令内容') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '规则一\n规则二' } })
    expect(button.disabled).toBe(false)
  })

  it('保存成功后把当前内容交给 api.save, 显示已保存并回到未修改状态', async () => {
    const api = makeApi()
    render(<GlobalPromptEditor api={api} />)
    await waitFor(() => expect(screen.getByLabelText('全局指令内容')).not.toBeNull())

    const textarea = screen.getByLabelText('全局指令内容') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '新内容' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(api.save).toHaveBeenCalledWith('新内容'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('已保存'))
    expect((screen.getByRole('button', { name: '保存' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText('全局指令内容') as HTMLTextAreaElement).value).toBe('新内容')
  })

  it('保存失败时显示错误信息, 草稿保留且仍可再次保存', async () => {
    const api = makeApi({
      save: vi.fn().mockRejectedValue(new Error('磁盘只读')),
    })
    render(<GlobalPromptEditor api={api} />)
    await waitFor(() => expect(screen.getByLabelText('全局指令内容')).not.toBeNull())

    const textarea = screen.getByLabelText('全局指令内容') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '新内容' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert.textContent).toContain('磁盘只读')
    })
    expect((screen.getByLabelText('全局指令内容') as HTMLTextAreaElement).value).toBe('新内容')
    expect((screen.getByRole('button', { name: '保存' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('有未保存修改时注册 beforeunload 守卫, 保存成功后移除', async () => {
    const api = makeApi()
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    render(<GlobalPromptEditor api={api} />)
    await waitFor(() => expect(screen.getByLabelText('全局指令内容')).not.toBeNull())

    const textarea = screen.getByLabelText('全局指令内容') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '改过的内容' } })
    expect(addSpy.mock.calls.some(([type]) => type === 'beforeunload')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('已保存'))
    expect(removeSpy.mock.calls.some(([type]) => type === 'beforeunload')).toBe(true)
  })

  it('加载失败时显示错误与重试按钮, 重试成功后进入编辑状态', async () => {
    const api = makeApi({
      load: vi.fn()
        .mockRejectedValueOnce(new Error('拒绝访问'))
        .mockResolvedValue({ exists: true, content: '恢复的内容', displayPath: '~/.dsh/AGENTS.md' }),
    })
    render(<GlobalPromptEditor api={api} />)

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert.textContent).toContain('拒绝访问')
    })

    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    await waitFor(() => {
      const textarea = screen.getByLabelText('全局指令内容') as HTMLTextAreaElement
      expect(textarea.value).toBe('恢复的内容')
    })
  })

  it('文件不存在时显示创建提示, 保存仍可执行', async () => {
    const api = makeApi({
      load: vi.fn().mockResolvedValue({ exists: false, content: '', displayPath: '~/.dsh/AGENTS.md' }),
    })
    render(<GlobalPromptEditor api={api} />)

    await waitFor(() => expect(screen.getByText('文件不存在, 保存时将创建')).not.toBeNull())
    const textarea = screen.getByLabelText('全局指令内容') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '第一条规则' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(api.save).toHaveBeenCalledWith('第一条规则'))
  })
})
