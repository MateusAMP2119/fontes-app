export type Step = 'start' | 'email' | 'code' | 'password' | 'join' | 'workspace' | 'profile' | 'invites' | 'updates'
export type Draft = { step: Step; returning: boolean; provider: 'email' | 'google'; email: string; name: string; slug: string; profile: string; image: string; invitations: string; changelog: boolean; daily: boolean }
export const steps: Step[] = ['start', 'email', 'code', 'password', 'join', 'workspace', 'profile', 'invites', 'updates']
export const fresh: Draft = { step: 'start', returning: false, provider: 'email', email: '', name: '', slug: '', profile: '', image: '', invitations: '', changelog: false, daily: false }
// A draft stored before a field existed still opens: the saved values sit on top of the
// defaults, so only the keys it does carry have to match.
export function saved(value: unknown): Draft | null {
  const draft = value as Partial<Draft> | null
  if (!draft || !steps.includes(draft.step as Step)) return null
  if (!Object.keys(fresh).every(k => draft[k as keyof Draft] === undefined || typeof draft[k as keyof Draft] === typeof fresh[k as keyof Draft])) return null
  if (draft.provider !== undefined && !['email', 'google'].includes(draft.provider)) return null
  return Object.fromEntries(Object.entries(fresh).map(([key, value]) => [key, draft[key as keyof Draft] ?? value])) as Draft
}
