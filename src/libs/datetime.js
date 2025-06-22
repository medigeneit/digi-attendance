export const getDisplayDate = (dateTime) => {
  if (!dateTime) {
    return ''
  }
  try {
    const date = new Date(dateTime)
    if (isNaN(date)) return ''

    const day = String(date.getDate()).padStart(2, '0')
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()

    return `${day}-${month}-${year}`
  } catch (e) {
    return ''
  }
}