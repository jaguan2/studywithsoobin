import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { assessCandidate } from './catalog-curation.mjs'
import { renderCatalogLinks } from './catalog-output.mjs'

const official = 'UCtiObj3CsEAdNU6ZPWDsddQ'
const archive = 'UC7m6u7W7QM1zv1hlPXbSPQA'
const vlog = { id: 'newvlog0001', title: '[TXT-LOG] SOOBIN vlog', channelId: official, duration: { seconds: 600 } }
const live = { id: 'newlive0001', title: 'SOOBIN YEONJUN Weverse live 10/18/2026', channelId: archive, duration: { seconds: 1800 } }

describe('manual catalog curation', () => {
  it('preserves explicitly named members and the archive date convention', () => {
    expect(assessCandidate(vlog, []).candidate).toMatchObject({ members: ['soobin'], kind: 'vlog', durationSeconds: 600 })
    expect(assessCandidate(live, []).candidate).toMatchObject({ members: ['soobin', 'yeonjun'], kind: 'live', broadcastDate: '2026-10-18' })
    expect(assessCandidate({ ...live, title: 'SOOBIN Weverse live', publishedAt: '2026-10-19' }, []).candidate.broadcastDate).toBeNull()
  })
  it('rejects short, multipart, ambiguous and untrusted candidates', () => {
    expect(assessCandidate({ ...vlog, duration: { seconds: 599 } }, []).reason).toBe('Below minimum duration')
    expect(assessCandidate({ ...live, title: live.title + ' PART 1' }, []).reason).toBe('Multipart clip')
    expect(assessCandidate({ ...live, title: 'Weverse live' }, []).reason).toBe('Review: no explicitly named member')
    expect(assessCandidate({ ...vlog, channelId: 'unknown' }, []).reason).toBe('Channel is not on the trusted source list')
    expect(assessCandidate(vlog, []).candidate.id).toBe('newvlog0001')
  })
  it('rejects alternate uploads while preserving distinct broadcast lengths', () => {
    const existing = { id: 'oldlive0001', kind: 'live', members: ['yeonjun', 'soobin'], broadcastDate: '2026-10-18', durationSeconds: 1805 }
    expect(assessCandidate(live, [existing]).reason).toBe('Alternate upload of oldlive0001')
    expect(assessCandidate({ ...live, duration: { seconds: 2400 } }, [existing]).candidate.id).toBe('newlive0001')
  })
  it('keeps shared generated catalog rows compatible with the published snapshot', async () => {
    const catalog = JSON.parse(await readFile(new URL('../src/data/playlist.json', import.meta.url), 'utf8'))
    // Exclude the manually localized timestamp header and normalize Windows newlines.
    const body = text => text.replaceAll('\r\n', '\n').split('\n').slice(4).join('\n')
    expect(body(renderCatalogLinks(catalog))).toBe(body(await readFile(new URL('../docs/video-catalog.md', import.meta.url), 'utf8')))
  })
})
