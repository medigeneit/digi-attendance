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

  export const getDisplayDate = (dateTime) => {
  if (!dateTime) {
    return ''
  }
  try {
    const date = new Date(dateTime)
    if (isNaN(date)) return ''

    const day = String(date.getDate()).padStart(2, '0')

    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()

    return `${day}-${month}-${year}`
  } catch (e) {
    return ''
  }
}

export const getDisplayMonth = (dateTime) => {
  if (!dateTime) {
    return ''
  }
  try {
    const date = new Date(dateTime)
    if (isNaN(date)) return ''

    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()

    return `${month}-${year}`
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

export const getYearMonthFormat = (dateTime) => {
  if (!dateTime) {
    return ''
  }

  try {
    const date = new Date(dateTime)
    if (isNaN(date)) return ''

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0') // Months are 0-based

    return `${year}-${month}`
  } catch (e) {
    return ''
  }
}


export const onlyDate = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export const  getMonthLastDate = (date) => {
  return  new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export const  getMonthFirstDate = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getDateRangeArray(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dates = [];

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split('T')[0]); // YYYY-MM-DD
    currentDate.setDate(currentDate.getDate() + 1); // Move to next day
  }

  return dates;
}


export function dateIsToday(givenDate){

if (!givenDate || !givenDate instanceof Date) {
    return false
  }

  // Get today's date without time
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Also remove time from given date
  givenDate.setHours(0, 0, 0, 0);

  return  givenDate.getTime() === today.getTime();

}
