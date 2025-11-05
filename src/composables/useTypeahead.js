import { ref } from 'vue'

export function useTypeahead(fetcher, delay = 220, minLen = 0) {
  const q = ref('')
  const list = ref([])
  const loading = ref(false)
  let t = null, ticket = 0

  const run = async () => {
    const query = (q.value || '').trim()
    if (query.length < minLen) {
      // popular fallback (empty q) → fetcher('') allow
      // যদি না চান: list.value = []; return;
    }
    loading.value = true
    const my = ++ticket
    try {
      const rows = await fetcher(query)
      if (my === ticket) list.value = rows || []
    } finally {
      if (my === ticket) loading.value = false
    }
  }

  const onInput = () => { clearTimeout(t); t = setTimeout(run, delay) }
  const onFocus = () => { clearTimeout(t); t = setTimeout(run, 0) } // show popular
  const clear = () => { q.value=''; list.value=[]; clearTimeout(t); ticket++ }

  return { q, list, loading, onInput, onFocus, run, clear }
}
