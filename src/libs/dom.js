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
