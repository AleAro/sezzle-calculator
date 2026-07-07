import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type CalculatorKeyVariant = 'digit' | 'function' | 'operator' | 'equals' | 'danger'

interface CalculatorKeyProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CalculatorKeyVariant
  children: ReactNode
}

const VARIANT_CLASSES: Record<CalculatorKeyVariant, string> = {
  digit:
    'bg-white text-slate-900 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600',
  function:
    'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
  operator:
    'bg-violet-50 text-violet-700 hover:bg-violet-100 active:bg-violet-200 dark:bg-slate-700 dark:text-violet-300 dark:hover:bg-slate-600',
  equals: 'bg-violet-600 text-white shadow-violet-600/30 hover:bg-violet-500 active:bg-violet-700',
  danger:
    'bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-slate-700',
}

/** A single physical calculator button. Presentational only - callers own all behavior. */
export default function CalculatorKey({
  variant = 'digit',
  className = '',
  children,
  ...buttonProps
}: CalculatorKeyProps) {
  return (
    <button
      type="button"
      className={`flex h-14 items-center justify-center rounded-2xl text-xl font-medium shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 sm:h-16 sm:text-2xl ${VARIANT_CLASSES[variant]} ${className}`}
      {...buttonProps}
    >
      {children}
    </button>
  )
}
