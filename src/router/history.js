import { ref } from "vue"
export function useRouteHistory(){

  // router/history.js
  const routeHistory = ref([])
  
  function addToHistory(route) {
    routeHistory.value.push(route)
    if (routeHistory.value.length > 10) routeHistory.value.shift() // limit size
  }
  
  function getPreviousRoute() {
    console.log({routeHistory: routeHistory.value})
    return routeHistory.value.length >= 2 ? routeHistory[routeHistory.value.length - 2] : null
  }

  return {
    addToHistory, getPreviousRoute
  }
}