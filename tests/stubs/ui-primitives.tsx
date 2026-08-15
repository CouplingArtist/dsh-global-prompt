/**
 * Test stub for the @deepseek-ai/dsh-client-ui-primitives platform module.
 * The real package's node half imports katex CSS, which vitest cannot load;
 * the Button atom's behavior is upstream-owned and outside this plugin's test
 * seams, so tests stub it at the package boundary (see vitest.config.ts alias).
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Button({ icon, className, children, ...rest }: {
  variant?: 'primary' | 'ghost' | 'outline' | 'toolbar'
  size?: 'md' | 'sm'
  icon?: ReactNode
  className?: string
  children?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={className} {...rest}>
      {icon != null ? icon : null}
      {children}
    </button>
  )
}
