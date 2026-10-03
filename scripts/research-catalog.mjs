import { Innertube } from 'youtubei.js'
import { writeFile } from 'node:fs/promises'
const yt = await Innertube.create()
// Discovery only: inspect candidates before curating; never changes the app.
const queries = ['SOOBIN', 'YEONJUN', 'BEOMGYU', 'TAEHYUN', 'HUENINGKAI'].flatMap(member => [`TXT ${member} vlog`, `TXT ${member} vlive`, `TXT ${member} Weverse live full`])
const results = []
for (const query of queries) {
  let page = await yt.search(query, { type: 'video' })
  for (let i = 0; i < 3; i++) {
    for (const v of page.videos) results.push({ query, id: v.id, title: v.title?.text, duration: v.duration, author: v.author?.name, channelId: v.author?.id })
    if (!page.has_continuation) break
    page = await page.getContinuation()
  }
  console.log(query, results.filter(v => v.query === query).length)
}
for (const channelId of ['UC2JQbysBeEG5KmbEuxrSWDw', 'UC2fPZ1O4sXfOVVzdVvN_v5g']) {
  let page = await (await yt.getChannel(channelId)).getVideos()
  for (let i = 0; i < 20; i++) {
    for (const v of page.videos) {
      const id = v.id ?? v.content_id
      const title = v.title?.text ?? v.metadata?.title?.text
      const badge = v.content_image?.overlays?.find(o => o.type === 'ThumbnailBottomOverlayView')?.badges?.[0]?.text
      results.push({ query: 'archive channel', id, title, duration: v.duration ?? { text: badge, seconds: badge?.split(':').reduce((n, p) => n * 60 + Number(p), 0) }, channelId, author: channelId === 'UC2JQbysBeEG5KmbEuxrSWDw' ? "Moa's Diary" : 'V Live' })
    }
    if (!page.has_continuation) break
    page = await page.getContinuation()
  }
  console.log(channelId, results.filter(v => v.channelId === channelId).length)
}
await writeFile('scripts/research-results.json', JSON.stringify(results, null, 2) + '\n')
