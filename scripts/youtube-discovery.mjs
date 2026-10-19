/** Official Data API only. Never expose the API key in URLs or error messages. */
export async function discoverUploads({ apiKey, sources, knownIds, pages = 3, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('Set YOUTUBE_API_KEY (GitHub Actions repository secret or local environment).')
  if (!Number.isInteger(pages) || pages < 1 || pages > 100) throw new Error('pages must be an integer from 1 to 100')
  async function list(resource, params) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`)
    url.search = new URLSearchParams(params).toString()
    let response
    try {
      response = await fetchImpl(url, {
        headers: { 'X-Goog-Api-Key': apiKey }, signal: AbortSignal.timeout(30_000),
      })
    } catch {
      throw new Error(`YouTube ${resource} request failed (network/timeout); catalog unchanged.`)
    }
    if (!response.ok) throw new Error(`YouTube ${resource} returned HTTP ${response.status}; check API enablement, key restrictions and quota.`)
    const data = await response.json()
    if (!Array.isArray(data.items)) throw new Error(`YouTube ${resource} returned an invalid response`)
    return data
  }
  const channels = await list('channels', { part: 'contentDetails', id: sources.map(source => source.id).join(','), maxResults: '50' })
  const scans = await Promise.all(sources.map(async source => {
    const uploads = channels.items.find(channel => channel.id === source.id)?.contentDetails?.relatedPlaylists?.uploads
    if (!uploads) throw new Error(`No uploads playlist found for ${source.name}; catalog unchanged.`)
    const ids = []
    let pageToken = ''
    for (let page = 0; page < pages; page++) {
      const data = await list('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: '50', ...(pageToken ? { pageToken } : {}) })
      for (const item of data.items) {
        const id = item.contentDetails?.videoId
        if (!/^[\w-]{11}$/.test(id ?? '')) throw new Error(`Invalid upload ID for ${source.name}`)
        ids.push(id)
      }
      pageToken = data.nextPageToken
      if (!pageToken) break
    }
    return { source: source.name, ids, truncated: Boolean(pageToken) }
  }))
  const unseen = [...new Set(scans.flatMap(scan => scan.ids))].filter(id => !knownIds.has(id))
  const rows = []
  const unavailable = []
  for (let index = 0; index < unseen.length; index += 50) {
    const ids = unseen.slice(index, index + 50)
    const data = await list('videos', { part: 'snippet,contentDetails,status', id: ids.join(',') })
    const returned = new Set(data.items.map(item => item.id))
    unavailable.push(...ids.filter(id => !returned.has(id)))
    for (const item of data.items) {
      const { snippet, contentDetails, status } = item
      if (!snippet?.title || !snippet?.channelId || !contentDetails?.duration || !status) {
        throw new Error('Incomplete YouTube video metadata; catalog unchanged.')
      }
      const match = contentDetails.duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
      const durationSeconds = match ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0) : 0
      rows.push({
        id: item.id, title: snippet.title, channelId: snippet.channelId, author: snippet.channelTitle,
        publishedAt: snippet.publishedAt, durationSeconds,
        playable: status.privacyStatus === 'public' && status.uploadStatus === 'processed' && status.embeddable === true && snippet.liveBroadcastContent === 'none',
      })
    }
  }
  return { rows, scans, unavailable }
}
