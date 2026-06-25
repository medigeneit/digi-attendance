export const formatDecimalHours = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return '-'

  const hours = Math.floor(amount)
  const minutes = Math.round((amount - hours) * 60)

  if (minutes >= 60) {
    return `${hours + 1}h`
  }

  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}
