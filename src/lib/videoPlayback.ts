/** Content restrictions should remove a video; player/browser failures should not. */
export function isUnavailableVideo(errorCode: number): boolean {
  return [2, 100, 101, 150].includes(errorCode)
}

export function playerErrorMessage(errorCode: number): string {
  return errorCode === 153
    ? 'YouTube could not verify this player. Try opening the app in your browser or watch this video on YouTube.'
    : 'YouTube could not start playback. Try choosing this video again or watch it on YouTube.'
}
