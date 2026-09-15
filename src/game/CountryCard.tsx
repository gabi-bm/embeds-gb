import { formatValue } from './format.ts'

interface CountryCardProps {
  name: string
  population?: number
  unit?: string
  onClick?: () => void
  disabled?: boolean
  result?: 'correct' | 'incorrect'
}

export function CountryCard({
  name,
  population,
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
      {population !== undefined && (
        <span className="country-population">{formatValue(population, unit)}</span>
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
