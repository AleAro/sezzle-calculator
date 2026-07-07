import { useEffect } from 'react'
import Display from './components/Display'
import Keypad from './components/Keypad'
import { useCalculator } from './hooks/useCalculator'
import type { CalculatorInput } from './types'

const DIRECT_INPUT_KEYS = /^[0-9.()+\-*/^%]$/

export default function App() {
  const { expression, result, error, isEvaluating, inputKey, evaluate, clear, backspace } = useCalculator()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (DIRECT_INPUT_KEYS.test(event.key)) {
        event.preventDefault()
        inputKey(event.key as CalculatorInput)
        return
      }

      if (event.key === 'Enter' || event.key === '=') {
        event.preventDefault()
        evaluate()
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        backspace()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        clear()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inputKey, evaluate, backspace, clear])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 px-4 py-8 dark:from-slate-950 dark:to-slate-900">
      <main className="w-full max-w-sm rounded-[2rem] bg-white p-4 shadow-xl shadow-slate-900/10 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10 sm:p-6">
        <h1 className="sr-only">Calculator</h1>
        <Display expression={expression} result={result} error={error} />
        <div className="mt-4 sm:mt-6">
          <Keypad
            canEvaluate={expression.length > 0}
            isEvaluating={isEvaluating}
            onInputKey={inputKey}
            onEvaluate={evaluate}
            onClear={clear}
            onBackspace={backspace}
          />
        </div>
      </main>
    </div>
  )
}
