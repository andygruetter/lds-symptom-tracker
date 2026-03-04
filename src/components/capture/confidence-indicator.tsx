interface ConfidenceIndicatorProps {
  score: number
}

function getConfidenceLevel(score: number) {
  if (score >= 85) {
    return {
      color: '#3A856F',
      label: 'sicher erkannt',
    }
  }
  if (score >= 70) {
    return {
      color: '#B8913A',
      label: 'relativ sicher',
    }
  }
  return {
    color: '#C06A3C',
    label: 'unsicher, bitte überprüfen',
  }
}

export function ConfidenceIndicator({ score }: ConfidenceIndicatorProps) {
  const { color, label } = getConfidenceLevel(score)

  return (
    <div
      className="flex items-center gap-1.5 text-xs"
      role="img"
      aria-label={`Konfidenz: ${score}% — ${label}`}
    >
      <span
        className="inline-block size-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span style={{ color }}>{score}%</span>
      <span className="text-muted-foreground">— {label}</span>
    </div>
  )
}
