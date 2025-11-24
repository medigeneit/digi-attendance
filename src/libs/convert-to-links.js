export function convertTaskLinks(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const regex = /#(\d+)/g

  function walk(node) {
    node.childNodes.forEach((child) => {
      // শুধু text node-এ replace হবে
      if (child.nodeType === Node.TEXT_NODE) {
        const replaced = child.textContent.replace(regex, (match, id) => {
          return `<a href="/requirement-tasks/${id}" class="text-pink-600 hover:underline font-bold">${match}</a>`
        })

        // শুধু তখনই replace করা লাগলে
        if (replaced !== child.textContent) {
          const span = document.createElement('span')
          span.innerHTML = replaced
          child.replaceWith(...span.childNodes)
        }
      } else {
        // recursive — nested tag support
        walk(child)
      }
    })
  }

  walk(doc.body)

  return doc.body.innerHTML
}

export function convertHttpLinks(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // URL Regex
  const urlRegex = /(https?:\/\/[^\s]+)/g

  function walk(node) {
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const replaced = child.textContent.replace(urlRegex, url => {
          return `<a href="${url}" target="_blank" class="text-blue-600 hover:underline">
            ${url}
            <i class="fas fa-external-link text-xs text-blue-600"></i>
          </a>`
        })

        if (replaced !== child.textContent) {
          const wrapper = document.createElement('span')
          wrapper.innerHTML = replaced
          child.replaceWith(...wrapper.childNodes)
        }
      } else {
        walk(child)
      }
    })
  }

  walk(doc.body)

  return doc.body.innerHTML
}
