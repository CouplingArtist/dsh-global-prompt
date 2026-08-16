/**
 * Minimal structural contracts for the client half. Deliberately NOT imported
 * from @deepseek-ai/* — the client bundle purity gate forbids cross-plugin
 * value imports, and the shell provides these services through ctx at runtime.
 */

/** The subset of the slots service the settings-section registration needs. */
export interface SlotsService {
  inject(slot: string, register: () => unknown): unknown
  register(registration: SlotRegistration, component: unknown): unknown
}

export interface SlotRegistration {
  name: string
  id?: string
  order?: number
  label?: string | (() => string)
}

/** The client plugin context shape this plugin consumes. */
export interface GlobalPromptClientContext {
  slots: SlotsService
}
