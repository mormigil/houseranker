import { House } from '@/types/house'

export function binarySearchInsert(
  rankedHouses: House[],
  newHouse: House,
  compareFunction: (house1: House, house2: House) => number
): number {
  let left = 0
  let right = rankedHouses.length

  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    const comparison = compareFunction(newHouse, rankedHouses[mid])
    
    if (comparison < 0) {
      right = mid
    } else {
      left = mid + 1
    }
  }

  return left
}

export function getNextComparisonHouse(
  rankedHouses: House[],
  currentComparisons: { houseId: string; rank: number; isHigher: boolean }[]
): House | null {
  if (rankedHouses.length === 0) return null
  
  let minRank = 0
  let maxRank = rankedHouses.length

  for (const comparison of currentComparisons) {
    if (comparison.isHigher) {
      maxRank = Math.min(maxRank, comparison.rank)
    } else {
      minRank = Math.max(minRank, comparison.rank + 1)
    }
  }

  if (minRank >= maxRank) return null

  const midRank = Math.floor((minRank + maxRank) / 2)
  return rankedHouses[midRank] || null
}

export function calculateFinalRank(
  rankedHouses: House[],
  comparisons: { houseId: string; rank: number; isHigher: boolean }[]
): number {
  let minRank = 0
  let maxRank = rankedHouses.length

  for (const comparison of comparisons) {
    if (comparison.isHigher) {
      maxRank = Math.min(maxRank, comparison.rank)
    } else {
      minRank = Math.max(minRank, comparison.rank + 1)
    }
  }

  return minRank
}

export function updateRanksAfterInsertion(
  houses: House[],
  insertedRank: number
): House[] {
  return houses.map(house => {
    if (house.rank !== null && house.rank !== undefined && house.rank >= insertedRank) {
      return { ...house, rank: house.rank + 1 }
    }
    return house
  })
}