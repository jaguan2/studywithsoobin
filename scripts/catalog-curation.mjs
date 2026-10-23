import sources from './catalog-sources.json' with { type: 'json' }
import { membersFromTitle, broadcastDateFromTitle, kindFromTitle, sameBroadcast } from './catalog-metadata.mjs'

/** Eligibility policy for reviewed manual research results. */
export function assessCandidate(row, seen) {
  const source = sources.find(source => source.id === row.channelId)
  if (!source) return { reason: 'Channel is not on the trusted source list' }
  const members = membersFromTitle(row.title)
  const kind = kindFromTitle(row.title)
  if (!members.length) return { reason: 'Review: no explicitly named member' }
  if (kind !== source.kind) return { reason: 'Review: title does not identify an eligible vlog/live' }
  if (/\(\d+\/\d+\)|\bPART\s*\d+/i.test(row.title)) return { reason: 'Multipart clip' }
  const durationSeconds = row.durationSeconds ?? row.duration?.seconds ?? 0
  if (durationSeconds < (kind === 'vlog' ? 600 : 1200)) return { reason: 'Below minimum duration' }
  const candidate = {
    ...row, members, kind, durationSeconds,
    broadcastDate: broadcastDateFromTitle(row.title, source.dateOrder),
  }
  const duplicate = seen.find(video => sameBroadcast(video, candidate))
  if (duplicate) return { reason: `Alternate upload of ${duplicate.id}` }
  return { candidate }
}
