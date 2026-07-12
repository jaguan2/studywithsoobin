import { useMemo, useState } from 'react'
import playlistData from './data/playlist.json'
import type { Playlist } from './types/playlist'
import { usePomodoro } from './hooks/usePomodoro'
import { VideoBackground } from './components/VideoBackground'
import { Sidebar } from './components/Sidebar'

const playlist = playlistData as Playlist

function randomVideoId(excludeId?: string) {
  const pool = excludeId
    ? playlist.videos.filter((v) => v.id !== excludeId)
    : playlist.videos
  return pool[Math.floor(Math.random() * pool.length)].id
}

export default function App() {
  const [videoId, setVideoId] = useState(() => randomVideoId())
  const [volume, setVolume] = useState(40)
  const [collapsed, setCollapsed] = useState(false)
  const { mode, switchMode, isRunning, toggleRunning, reset, label } = usePomodoro()

  const currentVideo = useMemo(
    () => playlist.videos.find((v) => v.id === videoId) ?? playlist.videos[0],
    [videoId],
  )

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <VideoBackground
        videoId={videoId}
        volume={volume}
        isPlaying
        onEnded={() => setVideoId(randomVideoId(videoId))}
      />

      <div className="relative z-10 h-full p-4">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          timerLabel={label}
          mode={mode}
          isRunning={isRunning}
          onSwitchMode={switchMode}
          onToggleRunning={toggleRunning}
          onResetTimer={reset}
          videos={playlist.videos}
          currentVideo={currentVideo}
          onSelectVideo={setVideoId}
          volume={volume}
          onVolumeChange={setVolume}
          playlistUrl={playlist.sourceUrl}
        />
      </div>
    </div>
  )
}
