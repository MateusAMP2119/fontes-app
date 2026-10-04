import type { Story } from './Feed'
import { composerStorageKey, readFeedConversation } from './feedComposerMock.ts'

export type FeedRule = { id: string; terms: string[]; scope: 'title' | 'content'; operator: 'and' | 'not' }
export type FeedDraft = { title: string; rules: FeedRule[]; sources: string[]; sourceMode: 'all' | 'custom'; days?: 1 | 7 | 30; kind?: 'all' | 'stories' | 'events' | 'articles' }
export const newRule = (operator: FeedRule['operator'] = 'and'): FeedRule => ({ id: crypto.randomUUID(), terms: [], scope: 'content', operator })
export const emptyFeedDraft = (): FeedDraft => ({ title: '', rules: [newRule()], sources: [], sourceMode: 'all' })
export const feedDraftKey = (userId: string) => `fontes:feed-builder:v2:${userId}`
export const normalizeTerm = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-PT').trim()
const termsValid = (terms: unknown): terms is string[] => Array.isArray(terms) && terms.length <= 20 && terms.every(term => typeof term === 'string' && !!term.trim() && term.length <= 100)
export const hasFeedQuery = (draft: FeedDraft) => draft.rules.some(rule => rule.operator === 'and' && rule.terms.length > 0)
export const feedQueryTerms = (draft: FeedDraft) => [...new Set(draft.rules.filter(rule => rule.operator === 'and').flatMap(rule => rule.terms))]

export function readFeedDraft(userId: string): FeedDraft {
  try {
    const saved = localStorage.getItem(feedDraftKey(userId))
    if (saved) {
      const draft = JSON.parse(saved)
      if (draft && typeof draft.title === 'string' && draft.title.length <= 80 && termsValid(draft.sources)
        && (draft.days === undefined || [1, 7, 30].includes(draft.days)) && (draft.kind === undefined || ['all', 'stories', 'events', 'articles'].includes(draft.kind))
        && ['all', 'custom'].includes(draft.sourceMode) && Array.isArray(draft.rules) && draft.rules.length > 0 && draft.rules.length <= 12
        && draft.rules.every((rule: FeedRule) => rule && typeof rule.id === 'string' && rule.id.length <= 100 && termsValid(rule.terms) && ['title', 'content'].includes(rule.scope) && ['and', 'not'].includes(rule.operator))
        && new Set(draft.rules.map((rule: FeedRule) => rule.id)).size === draft.rules.length) return draft
      return emptyFeedDraft()
    }
    // Retain drafts from the previous editor without rewriting their original storage.
    const old = JSON.parse(localStorage.getItem(`fontes:feed-builder:v1:${userId}`) || 'null')
    if (old && typeof old.title === 'string' && old.title.length <= 80 && termsValid(old.topics) && termsValid(old.excluded) && termsValid(old.sources)) {
      return { title: old.title, rules: [{ ...newRule(), terms: old.topics }, ...(old.excluded.length ? [{ ...newRule('not'), terms: old.excluded }] : [])], sources: old.sources, sourceMode: old.sources.length ? 'custom' : 'all' }
    }
    const legacy = readFeedConversation(composerStorageKey(userId)).feed
    if (legacy) return { ...emptyFeedDraft(), title: legacy.title, rules: [{ ...newRule(), terms: [legacy.subject] }] }
  } catch { /* An unavailable or invalid draft must not prevent opening the editor. */ }
  return emptyFeedDraft()
}

/** Exact keyword rules on the returned headlines and summaries. No AI model classification is implied. */
export function filterPreview<T extends Story>(stories: T[], draft: FeedDraft): T[] {
  return stories.filter(story => draft.rules.every(rule => {
    if (!rule.terms.length) return true
    const text = normalizeTerm(rule.scope === 'title' ? story.title : `${story.title} ${story.description ?? ''}`)
    const matches = rule.terms.some(term => text.includes(normalizeTerm(term)))
    return rule.operator === 'not' ? !matches : matches
  }) && (draft.sourceMode === 'all' || story.sources.some(source => draft.sources.includes(source.name))))
}
