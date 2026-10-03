import { useId, useRef, useState } from 'react'
import type { Video } from '../types/playlist'
import { catalogDate, EMPTY_FILTERS, MEMBERS, type CatalogFilters as Filters } from '../lib/catalog'

interface Props {
  videos: Video[]
  value: Filters
  onChange: (value: Filters) => void
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const TYPES = [{ value: '', label: 'All videos' }, { value: 'vlog', label: 'Vlogs' }, { value: 'live', label: 'Lives' }, { value: 'other', label: 'Other' }] as const

function SearchIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" strokeLinecap="round" /></svg>
}

function CloseIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" strokeLinecap="round" /></svg>
}

export function CatalogFilters({ videos, value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const filterButton = useRef<HTMLButtonElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const memberRail = useRef<HTMLDivElement>(null)
  const years = [...new Set(videos.flatMap(v => {
    const date = catalogDate(v, value.dateSource)
    return date ? [date.slice(0, 4)] : []
  }))].sort().reverse()
  if (value.year && !years.includes(value.year)) years.push(value.year)

  const refinements: { label: string; clear: () => void }[] = []
  if (value.year) refinements.push({ label: value.year, clear: () => onChange({ ...value, year: '' }) })
  if (value.month) refinements.push({ label: MONTHS[Number(value.month) - 1], clear: () => onChange({ ...value, month: '' }) })
  if (value.dateSource === 'original') refinements.push({ label: 'Original live dates', clear: () => onChange({ ...value, dateSource: 'release', year: '', month: '' }) })
  if (value.soloOnly) refinements.push({ label: 'Solo only', clear: () => onChange({ ...value, soloOnly: false }) })
  if (value.favoritesOnly) refinements.push({ label: 'Favorites only', clear: () => onChange({ ...value, favoritesOnly: false }) })
  const active = value.member || value.kind || value.query || refinements.length > 0 || (value.sort && value.sort !== 'playlist')

  return (
    <section className="catalog-discovery" aria-label="Find study videos" onKeyDown={e => {
      if (e.key === 'Escape' && expanded) {
        e.stopPropagation()
        setExpanded(false)
        filterButton.current?.focus()
      }
    }}>
      <div className="catalog-search">
        <SearchIcon />
        <input ref={searchInput} type="search" aria-label="Search videos" placeholder="Search videos, members or channels" value={value.query ?? ''} onChange={e => onChange({ ...value, query: e.target.value })} />
        {value.query && <button className="catalog-search-clear" aria-label="Clear search" onClick={() => { onChange({ ...value, query: '' }); searchInput.current?.focus() }}><CloseIcon /></button>}
      </div>
      <div className="catalog-member-row">
      <div ref={memberRail} className="catalog-chip-rail" role="group" aria-label="Filter by member">
        {[{ value: '', label: 'All members' }, ...MEMBERS].map(member =>
          <button key={member.value} aria-pressed={value.member === member.value} className="catalog-chip" onClick={() => onChange({ ...value, member: member.value as Filters['member'] })}>{member.label}</button>
        )}
      </div>
      <button className="catalog-member-more" aria-label="More members" title="Scroll member filters" onClick={() => {
        const rail = memberRail.current
        if (rail) rail.scrollTo({ left: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2 ? 0 : rail.scrollLeft + 200, behavior: 'smooth' })
      }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      </div>
      <div className="catalog-filter-toolbar">
        <div className="catalog-type-chips" role="group" aria-label="Filter by video type">
          {TYPES.map(type => <button key={type.value} aria-pressed={(value.kind ?? '') === type.value} className="catalog-type" onClick={() => onChange({ ...value, kind: type.value })}>{type.label}</button>)}
        </div>
        <button ref={filterButton} className="catalog-filter-button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(v => !v)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /><path d="M8 3v6M16 9v6M8 15v6" strokeWidth="3" /></svg>
          Filters {refinements.length > 0 && <span className="catalog-filter-count">{refinements.length}</span>}
        </button>
      </div>
      {expanded && <div id={panelId} className="catalog-filter-panel">
        <fieldset>
          <legend>Date</legend>
          <label>Date source
            <select aria-label="Date source" value={value.dateSource ?? 'release'} onChange={e => onChange({ ...value, dateSource: e.target.value as Filters['dateSource'], year: '', month: '' })}>
              <option value="release">YouTube release</option><option value="original">Original live</option>
            </select>
          </label>
          <div className="catalog-date-fields">
            <label>Year<select aria-label="Video year" value={value.year} onChange={e => onChange({ ...value, year: e.target.value })}><option value="">Any year</option>{years.map(year => <option key={year}>{year}</option>)}</select></label>
            <label>Month<select aria-label="Video month" value={value.month} onChange={e => onChange({ ...value, month: e.target.value })}><option value="">Any month</option>{MONTHS.map((month, i) => <option key={month} value={String(i + 1).padStart(2, '0')}>{month}</option>)}</select></label>
          </div>
          <p>{value.dateSource === 'original' ? 'Broadcast dates for lives; release dates for vlogs. Date filters exclude undated lives.' : 'Upload dates on YouTube, including reuploaded live archives.'}</p>
        </fieldset>
        <fieldset>
          <legend>Show</legend>
          <label className="catalog-check"><input type="checkbox" checked={!!value.soloOnly} onChange={e => onChange({ ...value, soloOnly: e.target.checked })} /><span>Solo videos<span className="catalog-option-help">One member, one study companion</span></span></label>
          <label className="catalog-check"><input type="checkbox" checked={!!value.favoritesOnly} onChange={e => onChange({ ...value, favoritesOnly: e.target.checked })} /><span>Favorites<span className="catalog-option-help">Videos you saved</span></span></label>
        </fieldset>
      </div>}
      <div className="catalog-results-tools">
        <div className="catalog-active-filters" aria-label="Selected filters">
          {refinements.map(filter => <button key={filter.label} className="catalog-removable-chip" aria-label={'Remove ' + filter.label + ' filter'} onClick={filter.clear}>{filter.label}<CloseIcon /></button>)}
          {active && <button className="catalog-reset" onClick={() => onChange(EMPTY_FILTERS)}>Clear filters</button>}
        </div>
        <label className="catalog-sort"><span>Sort</span><select aria-label="Video order" value={value.sort ?? 'playlist'} onChange={e => onChange({ ...value, sort: e.target.value as Filters['sort'] })}><option value="playlist">Playlist order</option><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="longest">Longest</option><option value="shortest">Shortest</option></select></label>
      </div>
    </section>
  )
}
