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

export const getDisplayDateTime = (dateTime) => {
  if (!dateTime) {
    return ''
  }

  try {
    const date = new Date(dateTime)
    if (isNaN(date)) return ''

    const day = String(date.getDate()).padStart(2, '0')
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()

    let hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12 // convert to 12-hour format

    return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`
  } catch (e) {
    return ''
  }
}

export const getYearMonthDayFormat = (dateTime) => {
  if (!dateTime) {
    return ''
  }

  try {
    const date = new Date(dateTime)
    if (isNaN(date)) return ''

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0') // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  } catch (e) {
    return ''
  }
}


export const onlyDate = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
