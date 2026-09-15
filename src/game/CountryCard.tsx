import { formatValue } from './format.ts'

interface CountryCardProps {
  name: string
  value?: number
  unit?: string
  onClick?: () => void
  disabled?: boolean
  result?: 'correct' | 'incorrect'
}

export function CountryCard({
  name,
  value,
  unit,
  onClick,
  disabled,
  result,
}: CountryCardProps) {
  const stateClass = result ? `is-${result}` : ''

  const content = (
    <>
      {result && (
        <span className={`result-badge ${stateClass}`} aria-hidden="true">
          {result === 'correct' ? '✓' : '✗'}
        </span>
      )}
      <span className="country-name">{name}</span>
      {value !== undefined && (
        <span className="country-population">{formatValue(value, unit)}</span>
      )}
    </>
  )

  if (!onClick) {
    return <div className={`country-card ${stateClass}`}>{content}</div>
  }

  return (
    <button
      type="button"
      className={`country-card ${stateClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </button>
  )
}
