const paths = {
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
  moon: 'M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z',
  coffee: 'M4 7h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 8h2a3 3 0 0 1 0 6h-2M3 22h15M7 2v2m5-2v2',
  palette: 'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.6-3.2 1.5 1.5 0 0 1 1.2-2.4H17a4 4 0 0 0 4-4c0-4.4-4-8.4-9-8.4ZM7.5 9h.01M11 6.5h.01M15.5 7.5h.01M6.5 13h.01',
  video: 'M4 4h16v16H4ZM9 4v16m6-16v16M4 9h5m-5 6h5m6-6h5m-5 6h5',
  headphones: 'M3 14v-2a9 9 0 0 1 18 0v2M3 13h4v8H5a2 2 0 0 1-2-2Zm18 0h-4v8h2a2 2 0 0 0 2-2Z',
  timer: 'M9 2h6M12 6v2m7-3-2 2M12 10v5l3 2M12 6a8 8 0 1 0 0 16 8 8 0 0 0 0-16',
  tasks: 'M9 4H5v17h14V4h-4M9 2h6v4H9ZM8 11l1 1 2-2m2 1h3M8 16l1 1 2-2m2 1h3',
  fullscreen: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  leaf: 'M20 3C10 3 3 7 3 14a7 7 0 0 0 7 7c7 0 10-8 10-18ZM4 20l10-10',
  volume: 'M3 9v6h4l5 4V5L7 9ZM16 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12',
  panel: 'M3 4h18v16H3Zm12 0v16',
  shuffle: 'M3 7h3c5 0 7 10 12 10h3m-4-4 4 4-4 4M3 17h3c2 0 3-2 4-4m4-2c1-2 2-4 4-4h3m-4-4 4 4-4 4',
  chevron: 'm6 9 6 6 6-6',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M5 21v-2a7 7 0 0 1 14 0v2',
  social: 'M9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M2 21v-3a7 7 0 0 1 14 0v3M17 3a3 3 0 0 1 0 6m1 5a5 5 0 0 1 4 5v2',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M17.5 6.5h.01',
  socialX: 'M4 3h4l12 18h-4ZM20 3l-6.5 7.5M4 21l6.5-7.5',
  external: 'M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',
  sparkles: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4',
  award: 'M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12M8 14l-1 8 5-3 5 3-1-8',
  edit: 'm16 3 5 5-12 12-6 1 1-6ZM14 5l5 5',
  plus: 'M12 5v14M5 12h14',
  up: 'm6 14 6-6 6 6',
  down: 'm6 10 6 6 6-6',
  rain: 'M5 14a4 4 0 0 1-1-7 6 6 0 0 1 11-2 5 5 0 0 1 4 9M7 17l-1 3m6-3-1 3m6-3-1 3',
  storm: 'M5 14a4 4 0 0 1-1-7 6 6 0 0 1 11-2 5 5 0 0 1 4 9M13 12l-4 6h4l-2 5',
  snow: 'M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 3l3 3 3-3M9 21l3-3 3 3M3 10l4-1-1-4M21 14l-4 1 1 4M3 14l4 1-1 4M21 10l-4-1 1-4',
  wind: 'M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3',
  flame: 'M12 2c0 6-7 6-7 13a7 7 0 0 0 14 0c0-3-2-5-3-6 0 3-2 4-3 4 2-5 0-8-1-11ZM10 21c-3-3-1-5 1-7 0 3 3 3 3 5a3 3 0 0 1-4 2',
  book: 'M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v15',
} as const

export type UIIconName = keyof typeof paths

export function UIIcon({ name, size = 18 }: { name: UIIconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}
