import { House } from '@/types/house'

export const createTestHouse = (
  id: string,
  title: string,
  rank?: number | null,
  options: Partial<House> = {}
): House => ({
  id,
  title,
  description: options.description || `Description for ${title}`,
  image_url: options.image_url || `https://example.com/${id}.jpg`,
  rank: rank ?? null,
  is_ranked: rank !== null && rank !== undefined,
  user_id: options.user_id || 'test-user',
  created_at: options.created_at || new Date().toISOString(),
  updated_at: options.updated_at || new Date().toISOString(),
  ...options
})

export const createRankedHouseList = (count: number, startRank = 0): House[] => {
  return Array.from({ length: count }, (_, i) =>
    createTestHouse(
      `house-${startRank + i}`,
      `House ${startRank + i + 1}`,
      startRank + i
    )
  )
}

export const createUnrankedHouseList = (count: number, startId = 0): House[] => {
  return Array.from({ length: count }, (_, i) =>
    createTestHouse(
      `unranked-${startId + i}`,
      `Unranked House ${startId + i + 1}`,
      undefined,
      { is_ranked: false }
    )
  )
}

// Common test scenarios
export const testScenarios = {
  emptyList: (): House[] => [],
  
  singleHouse: (): House[] => [
    createTestHouse('single', 'Only House', 0)
  ],
  
  threeHouses: (): House[] => [
    createTestHouse('best', 'Best House', 0),
    createTestHouse('middle', 'Middle House', 1),
    createTestHouse('worst', 'Worst House', 2),
  ],
  
  fiveHouses: (): House[] => [
    createTestHouse('excellent', 'Excellent House', 0),
    createTestHouse('good', 'Good House', 1),
    createTestHouse('average', 'Average House', 2),
    createTestHouse('poor', 'Poor House', 3),
    createTestHouse('terrible', 'Terrible House', 4),
  ],
  
  mixedRankedAndUnranked: (): { ranked: House[], unranked: House[] } => ({
    ranked: testScenarios.threeHouses(),
    unranked: createUnrankedHouseList(2)
  })
}

// Mock API responses
export const mockApiResponses = {
  successfulGet: (data: House[]) => ({
    json: jest.fn().mockResolvedValue(data),
    status: 200,
    ok: true
  }),
  
  successfulPost: (house: House) => ({
    json: jest.fn().mockResolvedValue(house),
    status: 201,
    ok: true
  }),
  
  unauthorized: () => ({
    json: jest.fn().mockResolvedValue({ error: 'Unauthorized' }),
    status: 401,
    ok: false
  }),
  
  badRequest: (message = 'Bad Request') => ({
    json: jest.fn().mockResolvedValue({ error: message }),
    status: 400,
    ok: false
  }),
  
  serverError: (message = 'Internal Server Error') => ({
    json: jest.fn().mockResolvedValue({ error: message }),
    status: 500,
    ok: false
  })
}

// Comparison helpers for testing
export const simulateUserComparisons = {
  // Always prefers the new house (will rank it first)
  alwaysPreferNew: (existingHouse: House) => true,
  
  // Never prefers the new house (will rank it last)
  neverPreferNew: (existingHouse: House) => false,
  
  // Prefers new house over houses with rank >= threshold
  preferNewOverRank: (threshold: number) => (existingHouse: House) =>
    (existingHouse.rank ?? 0) >= threshold,
  
  // Random preference (for testing edge cases)
  random: (existingHouse: House) => Math.random() > 0.5,
  
  // Deterministic preference based on title comparison
  alphabetical: (newHouseTitle: string) => (existingHouse: House) =>
    newHouseTitle < existingHouse.title
}

// Database state helpers
export const createDatabaseState = {
  empty: () => ({
    houses: []
  }),
  
  withRankedHouses: (count: number) => ({
    houses: createRankedHouseList(count)
  }),
  
  withUnrankedHouses: (count: number) => ({
    houses: createUnrankedHouseList(count)
  }),
  
  mixed: (rankedCount: number, unrankedCount: number) => ({
    houses: [
      ...createRankedHouseList(rankedCount),
      ...createUnrankedHouseList(unrankedCount)
    ]
  })
}

// Validation helpers
export const validators = {
  isValidHouse: (house: any): house is House => {
    return (
      typeof house.id === 'string' &&
      typeof house.title === 'string' &&
      typeof house.is_ranked === 'boolean' &&
      typeof house.user_id === 'string' &&
      typeof house.created_at === 'string' &&
      typeof house.updated_at === 'string' &&
      (house.rank === null || typeof house.rank === 'number')
    )
  },
  
  isValidRankedHouse: (house: any): boolean => {
    return validators.isValidHouse(house) && 
           house.is_ranked === true && 
           typeof house.rank === 'number'
  },
  
  isValidUnrankedHouse: (house: any): boolean => {
    return validators.isValidHouse(house) && 
           house.is_ranked === false && 
           house.rank === null
  },
  
  isRankingConsistent: (houses: House[]): boolean => {
    const rankedHouses = houses
      .filter(h => h.is_ranked && h.rank !== null)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    
    return rankedHouses.every((house, index) => house.rank === index)
  }
}