export const MEMBER_NAMES = {
  soobin: /\bsoobin\b|수빈/i,
  yeonjun: /\byeonjun\b|연준/i,
  beomgyu: /\bbeomgyu\b|범규/i,
  taehyun: /\btaehyun\b|태현/i,
  hueningkai: /\bhuening\s*kai\b|\bhuening\b|\bkai\b|휴닝카이|휴닝/i,
}

export function membersFromTitle(title) {
  return Object.entries(MEMBER_NAMES).filter(([, pattern]) => pattern.test(title)).map(([member]) => member)
}

export function validDate(value) {
  if (typeof value !== 'string') return null
  const date = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const parsed = new Date(date + 'T00:00:00Z')
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null
}

/** Original broadcast date explicitly written in an archive title. */
export function broadcastDateFromTitle(title, dateOrder = 'day-first') {
  let match = title.match(/\b(20\d{2})[.\-/](\d{2})[.\-/](\d{2})\b/)
  if (match) return validDate(`${match[1]}-${match[2]}-${match[3]}`)
  match = title.match(/\b(\d{2})[.\-/](\d{2})[.\-/](20\d{2})\b/)
  if (match) return validDate(dateOrder === 'month-first' ? `${match[3]}-${match[1]}-${match[2]}` : `${match[3]}-${match[2]}-${match[1]}`)
  match = title.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)[,]?\s+(20\d{2})\b/i)
  if (match) {
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(match[2].slice(0, 3).toLowerCase()) + 1
    return validDate(`${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`)
  }
  match = title.match(/\b(19|20|21|22|23|24|25|26)(\d{2})(\d{2})\b/)
  return match ? validDate(`20${match[1]}-${match[2]}-${match[3]}`) : null
}

export function kindFromTitle(title) {
  return /vlive|weverse live|브이앱/i.test(title) ? 'live' : /TXT-LOG|vlog|브이로그/i.test(title) ? 'vlog' : 'other'
}

/** Same date + same participants + near-identical length = likely re-upload.
 * Two broadcasts on the same day remain distinct when their lengths differ. */
export function sameBroadcast(a, b) {
  return a.kind === 'live' && b.kind === 'live' && a.broadcastDate && a.broadcastDate === b.broadcastDate &&
    [...a.members].sort().join(',') === [...b.members].sort().join(',') &&
    Math.abs(a.durationSeconds - b.durationSeconds) <= 15
}
