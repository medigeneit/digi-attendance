export function scrollToID(querySelector, topOffset = 0) {
  const el = document.querySelector(querySelector)
  // if (el) {
  //   el.scrollIntoView({ behavior: 'smooth' })
  // }
  if (el) {
    const rect = el.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const top = rect.top + scrollTop - topOffset;

    window.scrollTo({
      top,
      behavior: "smooth",
    });
  }

}


export function createMutationObserver(target, callback, options = { childList: true, subtree: true }) {
  if (!target) {
    console.warn('MutationObserver target is missing.')
    return null
  }

  const observer = new MutationObserver(callback)
  observer.observe(target, options)

  return {
    observer,
    disconnect() {
      observer.disconnect()
    },
    reconnect(newTarget = target) {
      observer.disconnect()
      observer.observe(newTarget, options)
    }
  }
}
