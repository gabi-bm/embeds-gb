interface CountryCardProps {
  name: string
  population?: number
  onClick?: () => void
  disabled?: boolean
  result?: 'correct' | 'incorrect'
}

const formatter = new Intl.NumberFormat('en-US')

export function CountryCard({
  name,
  population,
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
        <span className="country-population">{formatter.format(population)}</span>
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
