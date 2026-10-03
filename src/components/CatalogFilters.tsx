import type { Video } from '../types/playlist'
import { EMPTY_FILTERS, MEMBERS, type CatalogFilters as Filters } from '../lib/catalog'

interface Props {
  videos: Video[]
  value: Filters
  onChange: (value: Filters) => void
}

export function CatalogFilters({ videos, value, onChange }: Props) {
  const years = [...new Set(videos.flatMap(v => v.publishedAt ? [v.publishedAt.slice(0, 4)] : []))].sort().reverse()
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const style = 'min-w-0 w-full rounded-lg border border-cream-300 bg-white px-2 py-1.5 text-xs text-ink-800 dark:border-ink-700 dark:bg-ink-800 dark:text-cream-200'
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-ink-700 dark:text-cream-300">Member
          <select className={style} value={value.member} onChange={e => onChange({ ...value, member: e.target.value as Filters['member'] })}>
            <option value="">All members</option>
            {MEMBERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-ink-700 dark:text-cream-300">Release year
          <select className={style} value={value.year} onChange={e => onChange({ ...value, year: e.target.value })}>
            <option value="">All years</option>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </label>
        <label className="text-xs text-ink-700 dark:text-cream-300">Release month
          <select className={style} value={value.month} onChange={e => onChange({ ...value, month: e.target.value })}>
            <option value="">All months</option>
            {months.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-700 dark:text-cream-300">
        <span>Dates refer to the YouTube release.</span>
        {(value.member || value.year || value.month) && <button className="text-clay-600 hover:underline dark:text-clay-400" onClick={() => onChange(EMPTY_FILTERS)}>Clear filters</button>}
      </div>
    </div>
  )
}
