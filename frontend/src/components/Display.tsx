import { formatNumber, prettify } from '../lib/format'

interface DisplayProps {
  expression: string
  result: number | null
  error: string | null
}

/** The two-line screen: the in-progress expression on top, the result/error below. */
export default function Display({ expression, result, error }: DisplayProps) {
  const hasError = error !== null
  const expressionText = prettify(expression)

  return (
    <div className="rounded-3xl bg-slate-100 px-5 py-6 dark:bg-slate-800/60 sm:px-6 sm:py-8">
      <div
        data-testid="expression-display"
        className="min-h-[1.75rem] truncate text-right text-lg text-slate-500 dark:text-slate-400 sm:text-xl"
      >
        {expressionText || '\u00A0'}
      </div>
      <div
        data-testid="result-display"
        role="status"
        aria-live="polite"
        className={
          hasError
            ? 'mt-1 break-words text-right text-xl font-semibold text-red-600 dark:text-red-400 sm:text-2xl'
            : 'mt-1 truncate text-right text-4xl font-semibold text-slate-900 dark:text-white sm:text-5xl'
        }
      >
        {hasError ? error : formatNumber(result ?? 0)}
      </div>
    </div>
  )
}
