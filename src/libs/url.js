
export function objectToQuery( object ){
  return Object.entries( object )
    .map((item)=> `${item[0]}=${item[1]}`)
    .join('&')
}