/**
 * dsh-global-prompt client half: registers the 全局指令 settings section.
 * Loaded by the shell's __ModuleLoader__ (bundle wrapped by tsdown); the
 * settings.section slot declaration is owned by the shipped ui-settings plugin,
 * and `slots.inject` defers registration until that declaration exists.
 */
import { createHttpApi } from './api'
import type { GlobalPromptClientContext } from './contract'
import { GlobalPromptEditor } from './GlobalPromptEditor'

export const name = 'global-prompt'

export const inject = ['slots']

const httpApi = createHttpApi()

function GlobalPromptSection() {
  return <GlobalPromptEditor api={httpApi} />
}

export function apply(ctx: GlobalPromptClientContext): void {
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'global-prompt',
    order: 10,
    label: () => '全局指令',
  }, GlobalPromptSection))
}
