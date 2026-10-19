export function secondsToDuration(total) {
  const h = Math.floor(total / 3600)
  const m = Math.floor(total % 3600 / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

export function renderCatalogLinks(data) {
  const videos = data.videos
  const escape = text => text.replaceAll('|', '\\|').replaceAll('\n', ' ')
  let links = '# TXT video catalog\n\n'
  links += `Catalog generated at ${data.fetchedAt} (UTC). ${videos.length} videos. Refresh with \`npm run fetch-playlist\`.\n\n`
  links += 'Sources: [Study w/ Soobin playlist](' + data.sourceUrl + '), [TXT official](https://www.youtube.com/@TXT_bighit), [Moa\'s Diary](https://www.youtube.com/channel/UC2JQbysBeEG5KmbEuxrSWDw), [V Live archive](https://www.youtube.com/channel/UC2fPZ1O4sXfOVVzdVvN_v5g), [TomorrowByEdits](https://www.youtube.com/channel/UC7m6u7W7QM1zv1hlPXbSPQA).\n\n'
  links += 'Release is the YouTube publication date; original live dates are listed separately when explicitly supplied by the archive title. Shared lives appear under each participant. Metadata verification cannot guarantee runtime embedding; the app skips blocked embeds. This is a curated collection, not a complete archive.\n'
  for (const member of ['soobin', 'yeonjun', 'beomgyu', 'taehyun', 'hueningkai']) {
    const entries = videos.filter(v => v.members.includes(member))
    links += `\n## ${member[0].toUpperCase() + member.slice(1)} (${entries.length})\n\n| Video | Type | Duration | Release | Original live | Channel |\n| --- | --- | --- | --- | --- | --- |\n`
    for (const v of entries) links += `| [${escape(v.title)}](https://www.youtube.com/watch?v=${v.id}) | ${v.kind} | ${v.duration} | ${v.publishedAt ?? 'Unknown'} | ${v.broadcastDate ?? '—'} | ${escape(v.channel)} |\n`
  }
  return links
}
