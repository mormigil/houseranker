// Utility functions for managing localStorage data

export const STORAGE_KEYS = {
  API_KEY: 'apiKey',
  CURRENT_COLLECTION: 'currentCollection',
  CURRENT_RANKING: 'currentRanking',
  COLLECTIONS: 'collections',
  RANKINGS: 'rankings'
} as const

// API Key management
export const getApiKey = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEYS.API_KEY)
}

export const setApiKey = (apiKey: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey)
}

// Collection management
export const getCurrentCollection = (): string => {
  if (typeof window === 'undefined') return 'Default Collection'
  return localStorage.getItem(STORAGE_KEYS.CURRENT_COLLECTION) || 'Default Collection'
}

export const setCurrentCollection = (collectionName: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.CURRENT_COLLECTION, collectionName)
}

export const getCollections = (): string[] => {
  if (typeof window === 'undefined') return ['Default Collection']
  const stored = localStorage.getItem(STORAGE_KEYS.COLLECTIONS)
  const collections = stored ? JSON.parse(stored) : ['Default Collection']
  return Array.from(new Set(collections)) // Remove duplicates
}

export const addCollection = (collectionName: string): void => {
  if (typeof window === 'undefined') return
  const collections = getCollections()
  if (!collections.includes(collectionName)) {
    collections.push(collectionName)
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections))
  }
}

// Ranking management
export const getCurrentRanking = (): string => {
  if (typeof window === 'undefined') return 'Main Ranking'
  return localStorage.getItem(STORAGE_KEYS.CURRENT_RANKING) || 'Main Ranking'
}

export const setCurrentRanking = (rankingName: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.CURRENT_RANKING, rankingName)
}

export const getRankingsForCollection = (collectionName: string): string[] => {
  if (typeof window === 'undefined') return ['Main Ranking']
  const stored = localStorage.getItem(STORAGE_KEYS.RANKINGS)
  const allRankings = stored ? JSON.parse(stored) : {}
  const rankings = allRankings[collectionName] || ['Main Ranking']
  return Array.from(new Set(rankings)) // Remove duplicates
}

export const addRanking = (collectionName: string, rankingName: string): void => {
  if (typeof window === 'undefined') return
  const stored = localStorage.getItem(STORAGE_KEYS.RANKINGS)
  const allRankings = stored ? JSON.parse(stored) : {}
  
  if (!allRankings[collectionName]) {
    allRankings[collectionName] = ['Main Ranking']
  }
  
  if (!allRankings[collectionName].includes(rankingName)) {
    allRankings[collectionName].push(rankingName)
    localStorage.setItem(STORAGE_KEYS.RANKINGS, JSON.stringify(allRankings))
  }
}