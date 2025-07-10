'use client'

import { useState, useEffect } from 'react'
import { House } from '@/types/house'
import { getNextComparisonHouse } from '@/lib/ranking'
import Link from 'next/link'
import Image from 'next/image'
import { getCurrentCollection, getCurrentRanking, setCurrentRanking, getRankingsForCollection, addRanking } from '@/lib/localStorage'

interface Comparison {
  houseId: string
  rank: number
  isHigher: boolean
}

export default function RankPage() {
  const [unrankedHouses, setUnrankedHouses] = useState<House[]>([])
  const [rankedHouses, setRankedHouses] = useState<House[]>([])
  const [currentHouse, setCurrentHouse] = useState<House | null>(null)
  const [compareHouse, setCompareHouse] = useState<House | null>(null)
  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ranking, setRanking] = useState(false)
  const [currentCollection, setCurrentCollection] = useState('')
  const [currentRankingName, setCurrentRankingName] = useState('')
  const [rankings, setRankings] = useState<string[]>([])
  const [allRankings, setAllRankings] = useState<string[]>([])
  const [showNewRankingForm, setShowNewRankingForm] = useState(false)
  const [newRankingName, setNewRankingName] = useState('')

  useEffect(() => {
    // Initialize collection and ranking state
    const collection = getCurrentCollection()
    const ranking = getCurrentRanking()
    
    setCurrentCollection(collection)
    setCurrentRankingName(ranking)
    
    // Fetch available rankings from database
    fetchRankings()
    fetchHouses(collection, ranking)
  }, [])

  const fetchRankings = async () => {
    try {
      const apiKey = localStorage.getItem('apiKey')
      if (!apiKey) {
        // Use localStorage only
        const localRankings = getRankingsForCollection(currentCollection)
        setRankings(localRankings)
        return
      }

      const response = await fetch('/api/collections', {
        headers: {
          'x-api-key': apiKey,
          'x-user-id': 'default'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAllRankings(data.rankings)
        // ALWAYS merge with localStorage rankings for current collection
        const localRankings = getRankingsForCollection(currentCollection)
        const mergedRankings = Array.from(new Set([...localRankings, ...data.rankings]))
        setRankings(mergedRankings)
      } else {
        throw new Error('Failed to fetch rankings')
      }
    } catch (err) {
      console.error('Failed to fetch rankings:', err)
      // Fallback to localStorage
      const localRankings = getRankingsForCollection(currentCollection)
      setRankings(localRankings)
    }
  }

  const fetchHouses = async (collectionName?: string, rankingName?: string) => {
    try {
      const apiKey = localStorage.getItem('apiKey')
      if (!apiKey) {
        setError('API key not found. Please set it in localStorage.')
        setLoading(false)
        return
      }

      const collection = collectionName || currentCollection
      const ranking = rankingName || currentRankingName
      
      const buildUrl = (ranked: boolean) => {
        const params = new URLSearchParams()
        params.set('ranked', ranked.toString())
        if (collection) params.set('collection_name', collection)
        if (ranking) params.set('ranking_name', ranking)
        return `/api/houses?${params.toString()}`
      }

      const [unrankedResponse, rankedResponse] = await Promise.all([
        fetch(buildUrl(false), {
          headers: {
            'x-api-key': apiKey,
            'x-user-id': 'default'
          }
        }),
        fetch(buildUrl(true), {
          headers: {
            'x-api-key': apiKey,
            'x-user-id': 'default'
          }
        })
      ])

      if (!unrankedResponse.ok || !rankedResponse.ok) {
        throw new Error('Failed to fetch houses')
      }

      const unrankedData = await unrankedResponse.json()
      const rankedData = await rankedResponse.json()

      setUnrankedHouses(unrankedData)
      setRankedHouses(rankedData)
      
      if (unrankedData.length > 0) {
        setCurrentHouse(unrankedData[0])
        if (rankedData.length > 0) {
          const nextCompare = getNextComparisonHouse(rankedData, [])
          setCompareHouse(nextCompare)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleComparison = (isCurrentHouseBetter: boolean) => {
    if (!currentHouse || !compareHouse) return

    const newComparison: Comparison = {
      houseId: compareHouse.id,
      rank: compareHouse.rank!,
      isHigher: isCurrentHouseBetter
    }

    const newComparisons = [...comparisons, newComparison]
    setComparisons(newComparisons)

    const nextCompare = getNextComparisonHouse(rankedHouses, newComparisons)
    
    if (nextCompare) {
      setCompareHouse(nextCompare)
    } else {
      finalizeRanking(newComparisons)
    }
  }

  const handleRankingChange = (rankingName: string) => {
    setCurrentRankingName(rankingName)
    setCurrentRanking(rankingName)
    // Reset current house and comparisons when switching rankings
    setCurrentHouse(null)
    setCompareHouse(null)
    setComparisons([])
    fetchHouses(currentCollection, rankingName)
  }

  const handleCreateRanking = () => {
    if (!newRankingName.trim()) {
      setError('Ranking name is required')
      return
    }
    
    if (rankings.includes(newRankingName)) {
      setError('Ranking already exists')
      return
    }
    
    // Add to localStorage and immediately to local state
    addRanking(currentCollection, newRankingName)
    const updatedRankings = [...rankings, newRankingName]
    setRankings(updatedRankings)
    setCurrentRankingName(newRankingName)
    setCurrentRanking(newRankingName)
    setNewRankingName('')
    setShowNewRankingForm(false)
    setError(null)
    fetchHouses(currentCollection, newRankingName)
  }

  const finalizeRanking = async (finalComparisons: Comparison[]) => {
    if (!currentHouse) return

    setRanking(true)
    
    try {
      const apiKey = localStorage.getItem('apiKey')
      const response = await fetch('/api/ranking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey!,
          'x-user-id': 'default'
        },
        body: JSON.stringify({
          houseId: currentHouse.id,
          comparisons: finalComparisons,
          rankingName: currentRankingName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to rank house')
      }

      await response.json()
      
      setComparisons([])
      setCompareHouse(null)
      
      const remainingUnranked = unrankedHouses.filter(h => h.id !== currentHouse.id)
      setUnrankedHouses(remainingUnranked)
      
      if (remainingUnranked.length > 0) {
        setCurrentHouse(remainingUnranked[0])
        if (rankedHouses.length > 0) {
          const nextCompare = getNextComparisonHouse(rankedHouses, [])
          setCompareHouse(nextCompare)
        }
      } else {
        setCurrentHouse(null)
      }
      
      await fetchHouses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rank house')
    } finally {
      setRanking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (!currentHouse) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Rank Houses
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Collection: {currentCollection} • Ranking: {currentRankingName}
              </p>
            </div>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Home
            </Link>
          </div>

          {/* Ranking Management */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ranking:
                </label>
                <select
                  value={currentRankingName}
                  onChange={(e) => handleRankingChange(e.target.value)}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {rankings.map(ranking => (
                    <option key={ranking} value={ranking}>
                      {ranking}
                    </option>
                  ))}
                </select>
              </div>

              {!showNewRankingForm ? (
                <button
                  onClick={() => setShowNewRankingForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  New Ranking
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newRankingName}
                    onChange={(e) => setNewRankingName(e.target.value)}
                    placeholder="Ranking name"
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateRanking()}
                  />
                  <button
                    onClick={handleCreateRanking}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewRankingForm(false)
                      setNewRankingName('')
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <Link
                href="/manage"
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
              >
                Manage Houses
              </Link>
            </div>
          </div>
          
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              No unranked houses available. Add some houses to start ranking!
            </p>
            <Link
              href="/manage"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Manage Houses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (rankedHouses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Rank Houses
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Collection: {currentCollection} • Ranking: {currentRankingName}
              </p>
            </div>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Home
            </Link>
          </div>

          {/* Ranking Management */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ranking:
                </label>
                <select
                  value={currentRankingName}
                  onChange={(e) => handleRankingChange(e.target.value)}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {rankings.map(ranking => (
                    <option key={ranking} value={ranking}>
                      {ranking}
                    </option>
                  ))}
                </select>
              </div>

              {!showNewRankingForm ? (
                <button
                  onClick={() => setShowNewRankingForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  New Ranking
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newRankingName}
                    onChange={(e) => setNewRankingName(e.target.value)}
                    placeholder="Ranking name"
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateRanking()}
                  />
                  <button
                    onClick={handleCreateRanking}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewRankingForm(false)
                      setNewRankingName('')
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <Link
                href="/manage"
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
              >
                Manage Houses
              </Link>
            </div>
          </div>
          
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This will be your first ranked house!
            </p>
            <button
              onClick={() => finalizeRanking([])}
              disabled={ranking}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {ranking ? 'Ranking...' : 'Rank as #1'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Rank Houses
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Collection: {currentCollection} • Ranking: {currentRankingName}
            </p>
          </div>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Home
          </Link>
        </div>

        {/* Ranking Management */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ranking:
              </label>
              <select
                value={currentRankingName}
                onChange={(e) => handleRankingChange(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {rankings.map(ranking => (
                  <option key={ranking} value={ranking}>
                    {ranking}
                  </option>
                ))}
              </select>
            </div>

            {!showNewRankingForm ? (
              <button
                onClick={() => setShowNewRankingForm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
              >
                New Ranking
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRankingName}
                  onChange={(e) => setNewRankingName(e.target.value)}
                  placeholder="Ranking name"
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateRanking()}
                />
                <button
                  onClick={handleCreateRanking}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewRankingForm(false)
                    setNewRankingName('')
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            <Link
              href="/manage"
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
            >
              Manage Houses
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-center text-gray-600 dark:text-gray-300">
            Compare: Which house do you prefer?
          </p>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            Comparison {comparisons.length + 1} • {unrankedHouses.length} houses remaining
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              New House
            </h2>
            
            {currentHouse.image_url && (
              <div className="mb-4">
                <Image
                  src={currentHouse.image_url}
                  alt={currentHouse.title}
                  width={300}
                  height={200}
                  className="rounded-lg object-cover w-full"
                />
              </div>
            )}
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {currentHouse.title}
            </h3>
            {currentHouse.description && (
              <p className="text-gray-600 dark:text-gray-300 mb-4 break-words max-w-full overflow-wrap-anywhere">
                {currentHouse.description}
              </p>
            )}
            
            {currentHouse.listing_url && (
              <div className="mb-4">
                <a
                  href={currentHouse.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  View Full Listing →
                </a>
              </div>
            )}
            
            <button
              onClick={() => handleComparison(true)}
              disabled={ranking}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              I prefer this house
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Ranked House #{(compareHouse?.rank ?? 0) + 1}
            </h2>
            
            {compareHouse?.image_url && (
              <div className="mb-4">
                <Image
                  src={compareHouse.image_url}
                  alt={compareHouse.title}
                  width={300}
                  height={200}
                  className="rounded-lg object-cover w-full"
                />
              </div>
            )}
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {compareHouse?.title}
            </h3>
            {compareHouse?.description && (
              <p className="text-gray-600 dark:text-gray-300 mb-4 break-words max-w-full overflow-wrap-anywhere">
                {compareHouse.description}
              </p>
            )}
            
            {compareHouse?.listing_url && (
              <div className="mb-4">
                <a
                  href={compareHouse.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  View Full Listing →
                </a>
              </div>
            )}
            
            <button
              onClick={() => handleComparison(false)}
              disabled={ranking}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              I prefer this house
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}