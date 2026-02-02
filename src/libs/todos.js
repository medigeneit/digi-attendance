export function todoStatusClass(status) {
  if (status === 'COMPLETED') return 'bg-green-500 text-green-100 border border-green-200'
  if (status === 'WORKING') return 'bg-amber-100 text-amber-700 border border-amber-200'
  if (status === 'BACK_LOG') return 'bg-slate-100 text-slate-500 border border-slate-400'
  if (status === 'DEPENDANT') return 'bg-neutral-50 text-neutral-700 border border-neutral-400'
  if (status === 'PENDING') return 'bg-yellow-50 text-yellow-700 border border-yellow-400'
  return 'bg-gray-100 text-gray-700 border border-gray-200'
}
