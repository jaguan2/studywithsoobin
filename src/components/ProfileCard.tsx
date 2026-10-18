import { memo, useEffect, useMemo, useState } from 'react'
import {
  currentCheckInStreak, PROFILE_AVATARS, progressionLevel, progressionMilestones,
  totalFocusMinutes, XP_RULES, type ProfileAvatar, type Progression,
} from '../lib/progression'
import { UIIcon } from './UIIcon'

interface ProfileCardProps {
  progression: Progression
  onUpdateProfile: (name: string, avatar: ProfileAvatar) => Promise<boolean>
}
const AVATAR_LABELS: Record<ProfileAvatar, string> = { leaf: 'Little leaf', book: 'Open book', moon: 'Night owl', coffee: 'Coffee break' }

function ProfileCardInner({ progression, onUpdateProfile }: ProfileCardProps) {
  const level = useMemo(() => progressionLevel(progression), [progression])
  const milestones = useMemo(() => progressionMilestones(progression), [progression])
  const [nameDraft, setNameDraft] = useState(progression.name)
  const [avatarDraft, setAvatarDraft] = useState(progression.avatar)
  const [saveMessage, setSaveMessage] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setNameDraft(progression.name); setAvatarDraft(progression.avatar) }, [progression.name, progression.avatar])
  const minutes = totalFocusMinutes(progression)
  const studiedHours = Math.floor(minutes / 60)
  const studiedMinutes = minutes % 60
  const streak = currentCheckInStreak(progression)
  const earnedCount = milestones.filter(item => item.earned).length

  return (
    <section className="profile-panel" aria-label="Your study profile">
      <header className="profile-heading">
        <span className="profile-avatar"><UIIcon name={progression.avatar} size={28} /></span>
        <div><p className="surface-label">Your study profile</p><h2>{progression.name || 'Study friend'}</h2></div>
      </header>
      <div className="profile-level-card">
        <div className="profile-level-heading"><h3><UIIcon name="sparkles" size={20} />Level {level.level}</h3><span>{level.totalXP.toLocaleString()} XP total</span></div>
        <div className="profile-xp-caption"><span>{level.earned} / {level.required} XP</span><span>{level.remaining} to level {level.level + 1}</span></div>
        <div className="profile-xp-track" role="progressbar" aria-label="Experience toward the next level"
          aria-valuemin={0} aria-valuemax={level.required} aria-valuenow={level.earned}
          aria-valuetext={`${level.earned} of ${level.required} XP toward level ${level.level + 1}`}>
          <span style={{ width: `${level.earned / level.required * 100}%` }} />
        </div>
        <p className="profile-encouragement">Every small session is a step forward.</p>
      </div>
      <div className="profile-totals">
        <div className="profile-study-total">
          <span className="profile-study-heading"><UIIcon name="timer" size={17} />Total hours studied</span>
          <strong>{studiedHours.toLocaleString()}<span className="study-time-unit">{studiedHours === 1 ? 'hour' : 'hours'}</span>{studiedMinutes}<span className="study-time-unit">min</span></strong>
          <span>Lifetime total across completed focus sessions</span>
        </div>
        <div><UIIcon name="check" size={17} /><strong>{progression.taskClaims.length}</strong><span>Tasks completed</span></div>
        <div><UIIcon name="flame" size={17} /><strong>{streak} {streak === 1 ? 'day' : 'days'}</strong><span>Check-in streak · best {progression.bestStreak}</span></div>
      </div>
      <div className="profile-milestone-heading"><h3 className="section-heading"><UIIcon name="award" size={17} />Milestones</h3><span>{earnedCount} / {milestones.length}</span></div>
      <ul className="profile-milestones" aria-label="Study milestones">
        {milestones.map(item => <li key={item.id} className={item.earned ? 'earned' : ''}>
          <span className="milestone-icon"><UIIcon name={item.earned ? 'award' : 'leaf'} size={19} /></span>
          <div><h4>{item.title}</h4><p>{item.description}</p><span className="milestone-progress">{item.earned ? 'Earned' : `${Math.min(item.current, item.target)} / ${item.target}`}</span></div>
        </li>)}
      </ul>
      <details className="profile-disclosure">
        <summary><span>How to earn XP</span><UIIcon name="chevron" size={16} /></summary>
        <dl className="profile-xp-rules">
          <div><dt>Focus sessions</dt><dd>{XP_RULES.studyMinute} XP per saved focus minute. Your available study history counts too.</dd></div>
          <div><dt>Finish a task</dt><dd>{XP_RULES.task} XP the first time you check it off. Reopening or restoring the same task keeps its original credit.</dd></div>
          <div><dt>Daily check-in</dt><dd>{XP_RULES.checkIn} XP, plus 1 for each extra consecutive day, up to {XP_RULES.checkIn + XP_RULES.streakMaxBonus} XP per day.</dd></div>
        </dl>
        <p className="profile-note">The first level-up takes 100 XP. Each later level takes 50 more. Breaks and reset timers give no XP. Your earned levels and milestones stay with you when a streak ends.</p>
      </details>
      <details className="profile-disclosure">
        <summary><span>Edit profile</span><UIIcon name="chevron" size={16} /></summary>
        <form onSubmit={async event => {
          event.preventDefault()
          setSaving(true)
          setSaveMessage('')
          const trimmedName = nameDraft.trim()
          try {
            const saved = await onUpdateProfile(trimmedName, avatarDraft)
            setSaveMessage(saved ? 'Profile saved.' : 'Profile updated for this session.')
          } finally { setSaving(false) }
        }} className="profile-editor">
          <label className="task-field"><span>Display name (optional)</span><input aria-label="Profile display name" disabled={saving} maxLength={32} value={nameDraft} placeholder="Study friend"
            onChange={event => { setNameDraft(event.target.value); setSaveMessage('') }} /></label>
          <fieldset disabled={saving} className="profile-avatar-choices"><legend>Choose an avatar</legend><div>
            {PROFILE_AVATARS.map(avatar => <button type="button" key={avatar} aria-label={AVATAR_LABELS[avatar]} aria-pressed={avatarDraft === avatar}
              onClick={() => { setAvatarDraft(avatar); setSaveMessage('') }}><UIIcon name={avatar} size={23} /></button>)}
          </div></fieldset>
          <button type="submit" disabled={saving} className="primary-button">{saving ? 'Saving…' : 'Save profile'}</button>
          {saveMessage && <p role="status" className="profile-note">{saveMessage}</p>}
        </form>
      </details>
      <p className="profile-note profile-local-note">Saved on this device. Build your own rhythm.</p>
    </section>
  )
}

export const ProfileCard = memo(ProfileCardInner)
