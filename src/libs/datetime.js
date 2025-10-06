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

  const shortWeekDays = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ]

  const longWeekDays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]



  export const getWeekDay = (dateTime, weekDay = 'short') => {
    const date = new Date(dateTime)
    if (isNaN(date)) return ''
    const wDay = date.getDay()

    return  weekDay == 'short' ? shortWeekDays[wDay]:(weekDay == 'long' ? longWeekDays[wDay]:'');
  }

  export const getDisplayDate = (dateTime, {weekDay = null} = {}) => {
  if (!dateTime) {
    return ''
  }
  try {
    const date = new Date(dateTime)
    if (isNaN(date)) return ''

    const day = String(date.getDate()).padStart(2, '0')

    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()

    const wd = getWeekDay(date, weekDay);
    return `${wd} ${day}-${month}-${year}`
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

  const selectedDate = givenDate instanceof Date ? givenDate: new Date( givenDate )

  // Also remove time from given date
  selectedDate.setHours(0, 0, 0, 0);

  return  selectedDate.getTime() === today.getTime();

}


export function getLastDateOfMonth(year, month) {
  // month is 0-based (0 = January, 11 = December)
  return new Date(year, month + 1, 0);
}

/**
 *
 * @param {Number} month month zero based month
 * @returns {String} 3 digit month name
 */
export function getMonthName(month){
  return monthNames[month]
}

export function getCalendarRange(year, month) {
  // month = 0 ভিত্তিক (Jan=0, Feb=1)
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  // সপ্তাহ শুরু শনিবার (6), শেষ শুক্রবার (5)
  const weekStart = 6
  const weekEnd = 5

  // প্রথম দিনের weekday
  let startDay = firstDayOfMonth.getDay()
  // যদি মাস শনিবারে শুরু না হয়, আগের শনিবারে নিয়ে যাওয়া
  let diffStart = (7 + startDay - weekStart) % 7

  // শেষ দিনের weekday
  let endDay = lastDayOfMonth.getDay()
  // যদি মাস শুক্রবারে শেষ না হয়, পরের শুক্রবারে নিয়ে যাওয়া
  let diffEnd = (7 + weekEnd - endDay) % 7

  // leading day সহ শুরু
  const calendarStart = new Date(firstDayOfMonth)
  calendarStart.setDate(firstDayOfMonth.getDate() - diffStart)

  // trailing day সহ শেষ
  const calendarEnd = new Date(lastDayOfMonth)
  calendarEnd.setDate(lastDayOfMonth.getDate() + diffEnd)

  return [ getYearMonthDayFormat(calendarStart), getYearMonthDayFormat(calendarEnd) ]
}

