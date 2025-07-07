import {
  getNextComparisonHouse,
  calculateFinalRank,
  updateRanksAfterInsertion,
} from '@/lib/ranking'
import { House } from '@/types/house'
import { createTestHouse } from '@/test-utils/test-data'

// Additional test helper for this file
const createLocalTestHouse = (id: string, title: string, rank: number): House => ({
  id,
  title,
  description: `Description for ${title}`,
  image_url: `https://example.com/${id}.jpg`,
  rank,
  is_ranked: true,
  user_id: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

describe('Ranking Workflow Integration Tests', () => {
  describe('Complete ranking scenarios', () => {
    it('should handle ranking first house (empty list)', () => {
      const rankedHouses: House[] = []
      const comparisons: any[] = []
      
      // Should have no comparisons needed
      const nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse).toBeNull()
      
      // Should get rank 0
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(finalRank).toBe(0)
    })

    it('should handle ranking against single existing house', () => {
      const rankedHouses = [
        createLocalTestHouse('existing', 'Existing House', 0)
      ]
      
      // First comparison should be with the only house
      let comparisons: any[] = []
      let nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse?.id).toBe('existing')
      
      // New house is better
      comparisons.push({ houseId: 'existing', rank: 0, isHigher: true })
      nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse).toBeNull() // No more comparisons needed
      
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(finalRank).toBe(0) // Should be new best house
      
      const updatedHouses = updateRanksAfterInsertion(rankedHouses, finalRank)
      expect(updatedHouses[0].rank).toBe(1) // Existing house moved to rank 1
    })

    it('should handle complex ranking scenario with 5 houses', () => {
      const rankedHouses = [
        createLocalTestHouse('best', 'Best House', 0),
        createLocalTestHouse('good', 'Good House', 1),
        createLocalTestHouse('average', 'Average House', 2),
        createLocalTestHouse('poor', 'Poor House', 3),
        createLocalTestHouse('worst', 'Worst House', 4),
      ]
      
      // Simulate ranking a house that should end up at rank 2
      let comparisons: any[] = []
      
      // Step 1: Compare with middle house (rank 2)
      let nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse?.id).toBe('average')
      expect(nextHouse?.rank).toBe(2)
      
      // New house is better than average
      comparisons.push({ houseId: 'average', rank: 2, isHigher: true })
      
      // Step 2: Should now compare with house at rank 1
      nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse?.id).toBe('good')
      expect(nextHouse?.rank).toBe(1)
      
      // New house is worse than good house
      comparisons.push({ houseId: 'good', rank: 1, isHigher: false })
      
      // Step 3: Range should be narrowed, no more comparisons needed
      nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse).toBeNull()
      
      // Final rank should be 2
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(finalRank).toBe(2)
      
      // Update existing ranks
      const updatedHouses = updateRanksAfterInsertion(rankedHouses, finalRank)
      expect(updatedHouses[0].rank).toBe(0) // Best unchanged
      expect(updatedHouses[1].rank).toBe(1) // Good unchanged
      expect(updatedHouses[2].rank).toBe(3) // Average moved to 3
      expect(updatedHouses[3].rank).toBe(4) // Poor moved to 4
      expect(updatedHouses[4].rank).toBe(5) // Worst moved to 5
    })

    it('should handle ranking worst house', () => {
      const rankedHouses = [
        createLocalTestHouse('best', 'Best House', 0),
        createLocalTestHouse('middle', 'Middle House', 1),
        createLocalTestHouse('worst', 'Worst House', 2),
      ]
      
      let comparisons: any[] = []
      
      // Compare with middle house
      let nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse?.rank).toBe(1)
      
      // New house is worse than middle
      comparisons.push({ houseId: nextHouse!.id, rank: 1, isHigher: false })
      
      // Compare with worst house
      nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse?.rank).toBe(2)
      
      // New house is worse than current worst
      comparisons.push({ houseId: nextHouse!.id, rank: 2, isHigher: false })
      
      // No more comparisons needed
      nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse).toBeNull()
      
      // Should be ranked last
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(finalRank).toBe(3)
    })

    it('should handle ranking best house', () => {
      const rankedHouses = [
        createLocalTestHouse('current-best', 'Current Best', 0),
        createLocalTestHouse('middle', 'Middle House', 1),
        createLocalTestHouse('worst', 'Worst House', 2),
      ]
      
      let comparisons: any[] = []
      
      // Compare with middle house
      let nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse?.rank).toBe(1)
      
      // New house is better than middle
      comparisons.push({ houseId: nextHouse!.id, rank: 1, isHigher: true })
      
      // Compare with current best
      nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse?.rank).toBe(0)
      
      // New house is better than current best
      comparisons.push({ houseId: nextHouse!.id, rank: 0, isHigher: true })
      
      // No more comparisons needed
      nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
      expect(nextHouse).toBeNull()
      
      // Should be new best house
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(finalRank).toBe(0)
      
      // All existing houses should move down
      const updatedHouses = updateRanksAfterInsertion(rankedHouses, finalRank)
      expect(updatedHouses[0].rank).toBe(1) // Was 0, now 1
      expect(updatedHouses[1].rank).toBe(2) // Was 1, now 2
      expect(updatedHouses[2].rank).toBe(3) // Was 2, now 3
    })
  })

  describe('Edge cases', () => {
    it('should handle identical comparisons gracefully', () => {
      const rankedHouses = [
        createLocalTestHouse('house1', 'House 1', 0),
        createLocalTestHouse('house2', 'House 2', 1),
      ]
      
      // Duplicate comparisons (shouldn't break anything)
      const comparisons = [
        { houseId: 'house2', rank: 1, isHigher: true },
        { houseId: 'house2', rank: 1, isHigher: true }, // Duplicate
        { houseId: 'house1', rank: 0, isHigher: false },
      ]
      
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(finalRank).toBe(1)
    })

    it('should handle inconsistent comparisons gracefully', () => {
      const rankedHouses = [
        createLocalTestHouse('house1', 'House 1', 0),
        createLocalTestHouse('house2', 'House 2', 1),
        createLocalTestHouse('house3', 'House 3', 2),
      ]
      
      // Inconsistent comparisons
      const comparisons = [
        { houseId: 'house2', rank: 1, isHigher: true }, // Better than rank 1
        { houseId: 'house1', rank: 0, isHigher: false }, // Worse than rank 0
        // This creates an impossible constraint, but algorithm should handle it
      ]
      
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(typeof finalRank).toBe('number')
      expect(finalRank).toBeGreaterThanOrEqual(0)
      expect(finalRank).toBeLessThanOrEqual(rankedHouses.length)
    })
  })

  describe('Performance with large datasets', () => {
    it('should efficiently handle ranking with many existing houses', () => {
      // Create 100 ranked houses
      const rankedHouses = Array.from({ length: 100 }, (_, i) =>
        createLocalTestHouse(`house-${i}`, `House ${i}`, i)
      )
      
      let comparisons: any[] = []
      let comparisonCount = 0
      
      // Simulate finding the middle position
      while (comparisonCount < 20) { // Safety limit
        const nextHouse = getNextComparisonHouse(rankedHouses, comparisons)
        if (!nextHouse) break
        
        // Simulate user always choosing the new house as better
        // This should find a position around the middle
        const isNewHouseBetter = (nextHouse.rank ?? 0) >= 50
        comparisons.push({
          houseId: nextHouse.id,
          rank: nextHouse.rank,
          isHigher: isNewHouseBetter
        })
        
        comparisonCount++
      }
      
      // Should converge in log2(100) ≈ 7 comparisons
      expect(comparisonCount).toBeLessThan(10)
      
      const finalRank = calculateFinalRank(rankedHouses, comparisons)
      expect(finalRank).toBeGreaterThanOrEqual(0)
      expect(finalRank).toBeLessThanOrEqual(100)
    })
  })
})