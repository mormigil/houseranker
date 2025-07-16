'use client'

import { useState, useEffect } from 'react'
import { House } from '@/types/house'
import Link from 'next/link'
import Image from 'next/image'
import { getCurrentCollection, getCurrentRanking, setCurrentCollection, setCurrentRanking, getCollections, addCollection, getRankingsForCollection, addRanking } from '@/lib/localStorage'

export default function ListPage() {
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentCollection, setCurrentCollectionState] = useState('')
  const [currentRankingName, setCurrentRankingName] = useState('')
  const [collections, setCollections] = useState<string[]>([])
  const [rankings, setRankings] = useState<string[]>([])
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [showNewRankingForm, setShowNewRankingForm] = useState(false)
  const [newRankingName, setNewRankingName] = useState('')
  const [rerankingHouseId, setRerankingHouseId] = useState<string | null>(null)

  useEffect(() => {
    // Initialize collection and ranking state
    const collection = getCurrentCollection()
    const ranking = getCurrentRanking()
    
    setCurrentCollectionState(collection)
    setCurrentRankingName(ranking)
    
    // Fetch collections and rankings from database
    fetchCollectionsAndRankings()
    fetchRankedHouses(collection, ranking)
  }, [])

  const fetchCollectionsAndRankings = async () => {
    try {
      const apiKey = localStorage.getItem('apiKey')
      if (!apiKey) return

      const response = await fetch('/api/collections', {
        headers: {
          'x-api-key': apiKey,
          'x-user-id': 'default'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Merge with localStorage collections to keep user's personal collections
        const localCollections = getCollections()
        const mergedCollections = Array.from(new Set([...localCollections, ...data.collections]))
        setCollections(mergedCollections)
        
        // Update rankings for current collection
        const localRankings = getRankingsForCollection(currentCollection)
        const mergedRankings = Array.from(new Set([...localRankings, ...data.rankings]))
        setRankings(mergedRankings)
      }
    } catch (err) {
      console.error('Failed to fetch collections and rankings:', err)
      // Fallback to localStorage
      const localCollections = getCollections()
      const localRankings = getRankingsForCollection(currentCollection)
      setCollections(localCollections)
      setRankings(localRankings)
    }
  }

  const fetchRankedHouses = async (collectionName?: string, rankingName?: string) => {
    try {
      const apiKey = localStorage.getItem('apiKey')
      if (!apiKey) {
        setError('API key not found. Please set it in localStorage.')
        setLoading(false)
        return
      }

      const collection = collectionName || currentCollection
      const ranking = rankingName || currentRankingName
      
      const buildUrl = () => {
        const params = new URLSearchParams()
        params.set('ranked', 'true')
        if (collection) params.set('collection_name', collection)
        if (ranking) params.set('ranking_name', ranking)
        return `/api/houses?${params.toString()}`
      }

      const response = await fetch(buildUrl(), {
        headers: {
          'x-api-key': apiKey,
          'x-user-id': 'default'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch houses')
      }

      const data = await response.json()
      setHouses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCollectionChange = (collectionName: string) => {
    setCurrentCollectionState(collectionName)
    setCurrentCollection(collectionName)
    const newRankings = getRankingsForCollection(collectionName)
    setRankings(newRankings)
    // Reset to first ranking in new collection
    const firstRanking = newRankings[0] || 'Main Ranking'
    setCurrentRankingName(firstRanking)
    setCurrentRanking(firstRanking)
    fetchRankedHouses(collectionName, firstRanking)
  }

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) {
      setError('Collection name is required')
      return
    }
    
    if (collections.includes(newCollectionName)) {
      setError('Collection already exists')
      return
    }
    
    addCollection(newCollectionName)
    setCollections([...collections, newCollectionName])
    setCurrentCollectionState(newCollectionName)
    setCurrentCollection(newCollectionName)
    const newRankings = getRankingsForCollection(newCollectionName)
    setRankings(newRankings)
    setCurrentRankingName('Main Ranking')
    setCurrentRanking('Main Ranking')
    setNewCollectionName('')
    setShowNewCollectionForm(false)
    fetchRankedHouses(newCollectionName, 'Main Ranking')
  }

  const handleRankingChange = (rankingName: string) => {
    setCurrentRankingName(rankingName)
    setCurrentRanking(rankingName)
    fetchRankedHouses(currentCollection, rankingName)
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
    fetchRankedHouses(currentCollection, newRankingName)
  }

  const handleRerank = async (houseId: string) => {
    try {
      setRerankingHouseId(houseId)
      setError(null)
      
      const apiKey = localStorage.getItem('apiKey')
      if (!apiKey) {
        setError('API key not found. Please set it in localStorage.')
        return
      }

      const response = await fetch('/api/rerank', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-user-id': 'default'
        },
        body: JSON.stringify({
          houseId,
          rankingName: currentRankingName
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove house from ranking')
      }

      // Refresh the ranked houses list
      await fetchRankedHouses(currentCollection, currentRankingName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while reranking')
    } finally {
      setRerankingHouseId(null)
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Ranked Houses
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

        {/* Collection and Ranking Management */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Collection:
              </label>
              <select
                value={currentCollection}
                onChange={(e) => handleCollectionChange(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {collections.map(collection => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </select>
            </div>

            {!showNewCollectionForm ? (
              <button
                onClick={() => setShowNewCollectionForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
              >
                New Collection
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Collection name"
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateCollection()}
                />
                <button
                  onClick={handleCreateCollection}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewCollectionForm(false)
                    setNewCollectionName('')
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

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
              href="/rank"
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
            >
              Rank Houses
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {houses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              No ranked houses yet. Start by ranking some houses!
            </p>
            <Link
              href="/rank"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Start Ranking
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {houses.map((house, index) => (
              <div
                key={house.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
              >
                <div className="relative">
                  <div className="absolute top-2 left-2 z-10">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-300">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                  {house.image_url ? (
                    <Image
                      src={house.image_url}
                      alt={house.title}
                      width={400}
                      height={200}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400">No Image</span>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {house.title}
                  </h3>
                  {house.description && (
                    <p className="text-gray-600 dark:text-gray-300 mb-3 text-sm">
                      {house.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    {house.listing_url ? (
                      <a
                        href={house.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Listing →
                      </a>
                    ) : (
                      <div></div>
                    )}
                    
                    <button
                      onClick={() => handleRerank(house.id)}
                      disabled={rerankingHouseId === house.id}
                      className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
                    >
                      {rerankingHouseId === house.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Removing...
                        </>
                      ) : (
                        'Rerank'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}