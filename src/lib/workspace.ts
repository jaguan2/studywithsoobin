/** Stable IDs also connect toolbar actions, ARIA labels and mounted tool panels. */
export const STUDY_TOOLS = [
  { id: 'timer', label: 'Timer', icon: 'timer' },
  { id: 'sidebar', label: 'Videos & sound', icon: 'headphones' },
  { id: 'tasks', label: 'Tasks', icon: 'tasks' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'social', label: 'Social', icon: 'social' },
] as const

export type StudyToolId = typeof STUDY_TOOLS[number]['id']
