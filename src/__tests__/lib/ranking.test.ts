import {
  binarySearchInsert,
  getNextComparisonHouse,
  calculateFinalRank,
  updateRanksAfterInsertion,
} from '@/lib/ranking'
import { House } from '@/types/house'

// Helper function to create test houses
const createHouse = (id: string, title: string, rank: number): House => ({
  id,
  title,
  rank,
  is_ranked: true,
  user_id: 'test',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
})

describe('Ranking Algorithm', () => {
  describe('binarySearchInsert', () => {
    it('should insert into empty array', () => {
      const rankedHouses: House[] = []
      const newHouse = createHouse('new', 'New House', -1)
      
      const compareFunc = (a: House, b: House) => a.title.localeCompare(b.title)
      const position = binarySearchInsert(rankedHouses, newHouse, compareFunc)
      
      expect(position).toBe(0)
    })

    it('should insert at correct position in sorted array', () => {
      const rankedHouses = [
        createHouse('1', 'A House', 0),
        createHouse('2', 'C House', 1),
        createHouse('3', 'E House', 2),
      ]
      const newHouse = createHouse('new', 'D House', -1)
      
      const compareFunc = (a: House, b: House) => a.title.localeCompare(b.title)
      const position = binarySearchInsert(rankedHouses, newHouse, compareFunc)
      
      expect(position).toBe(2) // Should be inserted between C and E
    })

    it('should handle insertion at beginning', () => {
      const rankedHouses = [
        createHouse('1', 'B House', 0),
        createHouse('2', 'C House', 1),
      ]
      const newHouse = createHouse('new', 'A House', -1)
      
      const compareFunc = (a: House, b: House) => a.title.localeCompare(b.title)
      const position = binarySearchInsert(rankedHouses, newHouse, compareFunc)
      
      expect(position).toBe(0)
    })

    it('should handle insertion at end', () => {
      const rankedHouses = [
        createHouse('1', 'A House', 0),
        createHouse('2', 'B House', 1),
      ]
      const newHouse = createHouse('new', 'Z House', -1)
      
      const compareFunc = (a: House, b: House) => a.title.localeCompare(b.title)
      const position = binarySearchInsert(rankedHouses, newHouse, compareFunc)
      
      expect(position).toBe(2)
    })
  })

  describe('getNextComparisonHouse', () => {
    const rankedHouses = [
      createHouse('1', 'Worst House', 0),
      createHouse('2', 'Bad House', 1),
      createHouse('3', 'OK House', 2),
      createHouse('4', 'Good House', 3),
      createHouse('5', 'Best House', 4),
    ]

    it('should return middle house for first comparison', () => {
      const comparisons: any[] = []
      const nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      
      expect(nextHouse?.id).toBe('3') // Middle house (index 2)
    })

    it('should narrow down range based on comparisons', () => {
      // User said new house is better than middle house (rank 2)
      const comparisons = [{ houseId: '3', rank: 2, isHigher: true }]
      const nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      
      // Should now compare with house at rank 1 (between 0 and 2)
      expect(nextHouse?.id).toBe('2')
    })

    it('should return null when range is narrowed to single position', () => {
      const comparisons = [
        { houseId: '3', rank: 2, isHigher: true }, // Better than rank 2
        { houseId: '2', rank: 1, isHigher: false }, // Worse than rank 1
      ]
      const nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      
      expect(nextHouse).toBeNull() // Range narrowed to rank 2
    })

    it('should handle empty ranked houses', () => {
      const nextHouse = getNextComparisonHouse([], [])
      expect(nextHouse).toBeNull()
    })
  })

  describe('calculateFinalRank', () => {
    const rankedHouses = [
      createHouse('1', 'House 1', 0),
      createHouse('2', 'House 2', 1),
      createHouse('3', 'House 3', 2),
      createHouse('4', 'House 4', 3),
      createHouse('5', 'House 5', 4),
    ]

    it('should calculate rank 0 for best house', () => {
      // New house is better than all existing houses
      const comparisons = [
        { houseId: '3', rank: 2, isHigher: true }, // Better than middle
        { houseId: '2', rank: 1, isHigher: true }, // Better than rank 1
        { houseId: '1', rank: 0, isHigher: true }, // Better than rank 0
      ]
      
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(finalRank).toBe(0)
    })

    it('should calculate correct middle rank', () => {
      const comparisons = [
        { houseId: '3', rank: 2, isHigher: true }, // Better than rank 2
        { houseId: '2', rank: 1, isHigher: false }, // Worse than rank 1
      ]
      
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(finalRank).toBe(2) // Should be inserted at rank 2
    })

    it('should calculate last rank for worst house', () => {
      const comparisons = [
        { houseId: '3', rank: 2, isHigher: false }, // Worse than middle
        { houseId: '4', rank: 3, isHigher: false }, // Worse than rank 3
        { houseId: '5', rank: 4, isHigher: false }, // Worse than rank 4
      ]
      
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(finalRank).toBe(5) // Should be last
    })

    it('should handle empty comparisons', () => {
      const finalRank = calculateFinalRank(rankedHouses, [])
      expect(finalRank).toBe(0) // Default to first position
    })
  })

  describe('updateRanksAfterInsertion', () => {
    it('should update ranks of affected houses', () => {
      const houses = [
        createHouse('1', 'House 1', 0),
        createHouse('2', 'House 2', 1),
        createHouse('3', 'House 3', 2),
        createHouse('4', 'House 4', 3),
      ]
      
      // Insert at rank 1
      const updatedHouses = updateRanksAfterInsertion(houses, 1)
      
      expect(updatedHouses[0].rank).toBe(0) // Unchanged
      expect(updatedHouses[1].rank).toBe(2) // Was 1, now 2
      expect(updatedHouses[2].rank).toBe(3) // Was 2, now 3
      expect(updatedHouses[3].rank).toBe(4) // Was 3, now 4
    })

    it('should not update ranks of houses before insertion point', () => {
      const houses = [
        createHouse('1', 'House 1', 0),
        createHouse('2', 'House 2', 1),
        createHouse('3', 'House 3', 2),
      ]
      
      // Insert at rank 2
      const updatedHouses = updateRanksAfterInsertion(houses, 2)
      
      expect(updatedHouses[0].rank).toBe(0) // Unchanged
      expect(updatedHouses[1].rank).toBe(1) // Unchanged
      expect(updatedHouses[2].rank).toBe(3) // Was 2, now 3
    })

    it('should handle houses with null ranks', () => {
      const houses = [
        createHouse('1', 'House 1', 0),
        { ...createHouse('2', 'House 2', 1), rank: null },
        createHouse('3', 'House 3', 2),
      ]
      
      const updatedHouses = updateRanksAfterInsertion(houses, 1)
      
      expect(updatedHouses[0].rank).toBe(0)
      expect(updatedHouses[1].rank).toBeNull() // Should remain null
      expect(updatedHouses[2].rank).toBe(3) // Should be updated
    })

    it('should handle insertion at rank 0', () => {
      const houses = [
        createHouse('1', 'House 1', 0),
        createHouse('2', 'House 2', 1),
      ]
      
      const updatedHouses = updateRanksAfterInsertion(houses, 0)
      
      expect(updatedHouses[0].rank).toBe(1) // All ranks should increase
      expect(updatedHouses[1].rank).toBe(2)
    })
  })

  describe('Integration: Complete ranking workflow', () => {
    it('should correctly rank a house through binary search process', () => {
      // Start with 3 ranked houses
      const rankedHouses = [
        createHouse('best', 'Best House', 0),
        createHouse('middle', 'Middle House', 1),
        createHouse('worst', 'Worst House', 2),
      ]
      
      // Simulate ranking a house that should go between best and middle
      const comparisons: any[] = []
      
      // Step 1: Compare with middle house
      let nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse?.id).toBe('middle')
      
      // User says new house is better than middle house
      comparisons.push({ houseId: 'middle', rank: 1, isHigher: true })
      
      // Step 2: Compare with best house
      nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse?.id).toBe('best')
      
      // User says new house is worse than best house
      comparisons.push({ houseId: 'best', rank: 0, isHigher: false })
      
      // Step 3: Should be no more comparisons needed
      nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse).toBeNull()
      
      // Step 4: Calculate final rank
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(finalRank).toBe(1) // Should be inserted at rank 1
      
      // Step 5: Update existing ranks
      const updatedHouses = updateRanksAfterInsertion(rankedHouses, finalRank)
      expect(updatedHouses[0].rank).toBe(0) // Best unchanged
      expect(updatedHouses[1].rank).toBe(2) // Middle moved to 2
      expect(updatedHouses[2].rank).toBe(3) // Worst moved to 3
    })
  })
})