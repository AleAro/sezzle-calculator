import type { ReactNode } from 'react'
import {
  BackspaceIcon,
  DivideIcon,
  EqualsIcon,
  MinusIcon,
  PercentIcon,
  PlusIcon,
  XIcon,
} from '@phosphor-icons/react'
import CalculatorKey, { type CalculatorKeyVariant } from './CalculatorKey'
import type { CalculatorInput } from '../types'

interface KeypadProps {
  canEvaluate: boolean
  isEvaluating: boolean
  onInputKey: (key: CalculatorInput) => void
  onEvaluate: () => void
  onClear: () => void
  onBackspace: () => void
}

interface KeyConfig {
  ariaLabel: string
  variant: CalculatorKeyVariant
  display: ReactNode
  onClick: () => void
  disabled?: boolean
  wide?: boolean
}

const ICON_SIZE = 22

export default function Keypad({
  canEvaluate,
  isEvaluating,
  onInputKey,
  onEvaluate,
  onClear,
  onBackspace,
}: KeypadProps) {
  const digitKey = (digit: CalculatorInput): KeyConfig => ({
    ariaLabel: digit,
    variant: 'digit',
    display: digit,
    onClick: () => onInputKey(digit),
  })

  const rows: KeyConfig[][] = [
    [
      { ariaLabel: 'All clear', variant: 'danger', display: 'AC', onClick: onClear },
      { ariaLabel: 'Open parenthesis', variant: 'function', display: '(', onClick: () => onInputKey('(') },
      { ariaLabel: 'Close parenthesis', variant: 'function', display: ')', onClick: () => onInputKey(')') },
      {
        ariaLabel: 'Backspace',
        variant: 'function',
        display: <BackspaceIcon size={ICON_SIZE} weight="bold" aria-hidden="true" />,
        onClick: onBackspace,
      },
    ],
    [
      { ariaLabel: 'Square root', variant: 'function', display: '√', onClick: () => onInputKey('√') },
      { ariaLabel: 'Power', variant: 'function', display: 'xʸ', onClick: () => onInputKey('^') },
      {
        ariaLabel: 'Percent',
        variant: 'function',
        display: <PercentIcon size={ICON_SIZE} weight="bold" aria-hidden="true" />,
        onClick: () => onInputKey('%'),
      },
      {
        ariaLabel: 'Divide',
        variant: 'operator',
        display: <DivideIcon size={ICON_SIZE} weight="bold" aria-hidden="true" />,
        onClick: () => onInputKey('/'),
      },
    ],
    [
      digitKey('7'),
      digitKey('8'),
      digitKey('9'),
      {
        ariaLabel: 'Multiply',
        variant: 'operator',
        display: <XIcon size={ICON_SIZE} weight="bold" aria-hidden="true" />,
        onClick: () => onInputKey('*'),
      },
    ],
    [
      digitKey('4'),
      digitKey('5'),
      digitKey('6'),
      {
        ariaLabel: 'Subtract',
        variant: 'operator',
        display: <MinusIcon size={ICON_SIZE} weight="bold" aria-hidden="true" />,
        onClick: () => onInputKey('-'),
      },
    ],
    [
      digitKey('1'),
      digitKey('2'),
      digitKey('3'),
      {
        ariaLabel: 'Add',
        variant: 'operator',
        display: <PlusIcon size={ICON_SIZE} weight="bold" aria-hidden="true" />,
        onClick: () => onInputKey('+'),
      },
    ],
    [
      { ...digitKey('0'), wide: true },
      { ariaLabel: 'Decimal point', variant: 'digit', display: '.', onClick: () => onInputKey('.') },
      {
        ariaLabel: 'Equals',
        variant: 'equals',
        display: <EqualsIcon size={ICON_SIZE} weight="bold" aria-hidden="true" />,
        onClick: onEvaluate,
        disabled: !canEvaluate || isEvaluating,
      },
    ],
  ]

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {rows.flat().map((key) => (
        <CalculatorKey
          key={key.ariaLabel}
          aria-label={key.ariaLabel}
          variant={key.variant}
          onClick={key.onClick}
          disabled={key.disabled}
          className={key.wide ? 'col-span-2' : ''}
        >
          {key.display}
        </CalculatorKey>
      ))}
    </div>
  )
}
