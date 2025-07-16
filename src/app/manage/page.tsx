'use client'

import { useState, useEffect } from 'react'
import { House } from '@/types/house'
import Link from 'next/link'
import Image from 'next/image'
import ImportModal from '@/components/ImportModal'
import { getCurrentCollection, setCurrentCollection, getCollections, addCollection, getCurrentRanking, setCurrentRanking, getRankingsForCollection, addRanking } from '@/lib/localStorage'

export default function ManagePage() {
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [currentCollection, setCurrentCollectionState] = useState('')
  const [currentRanking, setCurrentRanking] = useState('')
  const [collections, setCollections] = useState<string[]>([])
  const [rankings, setRankings] = useState<string[]>([])
  const [allRankings, setAllRankings] = useState<string[]>([])
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [showNewRankingForm, setShowNewRankingForm] = useState(false)
  const [newRankingName, setNewRankingName] = useState('')
  const [newHouse, setNewHouse] = useState({
    title: '',
    description: '',
    image_url: '',
    listing_url: ''
  })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    // Initialize collection and ranking state
    const collection = getCurrentCollection()
    const ranking = getCurrentRanking()
    setCurrentCollectionState(collection)
    setCurrentRanking(ranking)
    
    // Fetch collections and rankings from database
    fetchCollectionsAndRankings()
    fetchHouses(collection, ranking)
    
    // Check for shared data from URL params
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('from_share') === 'true') {
      const sharedData = {
        title: urlParams.get('title') || '',
        description: urlParams.get('description') || '',
        image_url: '',
        address: urlParams.get('address') || '',
        price: urlParams.get('price') || '',
        listing_url: urlParams.get('listing_url') || ''
      }
      
      // Pre-fill the form and show it after a short delay
      setNewHouse({
        title: sharedData.title,
        description: sharedData.description || `Property shared from ${sharedData.address || 'real estate app'}${sharedData.listing_url ? `. View listing: ${sharedData.listing_url}` : ''}`,
        image_url: urlParams.get('image_url') || '',
        listing_url: sharedData.listing_url || ''
      })
      
      // Clean up URL params first
      const newUrl = new URL('/manage', window.location.origin)
      window.history.replaceState({}, 'Manage Houses', newUrl.toString())
      
      // Show form after a brief delay to ensure everything is loaded
      setTimeout(() => {
        setShowAddForm(true)
      }, 100)
    }
  }, [])

  const fetchCollectionsAndRankings = async () => {
    try {
      const apiKey = localStorage.getItem('apiKey')
      if (!apiKey) {
        // If no API key, use localStorage only
        const localCollections = getCollections()
        const localRankings = getRankingsForCollection(currentCollection)
        setCollections(localCollections)
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
        // Merge with localStorage collections to keep user's personal collections
        const localCollections = getCollections()
        const mergedCollections = Array.from(new Set([...localCollections, ...data.collections]))
        setCollections(mergedCollections)
        setAllRankings(data.rankings)
        
        // ALWAYS merge with localStorage rankings for current collection
        const localRankings = getRankingsForCollection(currentCollection)
        const mergedRankings = Array.from(new Set([...localRankings, ...data.rankings]))
        setRankings(mergedRankings)
      } else {
        throw new Error('Failed to fetch from API')
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

  const fetchHouses = async (collectionName?: string, rankingName?: string) => {
    try {
      const apiKey = localStorage.getItem('apiKey')
      if (!apiKey) {
        setError('API key not found. Please set it in localStorage.')
        setLoading(false)
        return
      }

      const collection = collectionName || currentCollection
      const ranking = rankingName || currentRanking
      
      // Fetch ranked and unranked houses separately for current ranking
      const buildUrl = (ranked: boolean) => {
        const params = new URLSearchParams()
        params.set('ranked', ranked.toString())
        if (collection) params.set('collection_name', collection)
        if (ranking) params.set('ranking_name', ranking)
        return `/api/houses?${params.toString()}`
      }

      const [rankedResponse, unrankedResponse] = await Promise.all([
        fetch(buildUrl(true), {
          headers: { 'x-api-key': apiKey, 'x-user-id': 'default' }
        }),
        fetch(buildUrl(false), {
          headers: { 'x-api-key': apiKey, 'x-user-id': 'default' }
        })
      ])

      if (!rankedResponse.ok || !unrankedResponse.ok) {
        throw new Error('Failed to fetch houses')
      }

      const [rankedData, unrankedData] = await Promise.all([
        rankedResponse.json(),
        unrankedResponse.json()
      ])

      // Combine and mark houses appropriately
      const allHouses = [
        ...rankedData.map((h: House) => ({ ...h, is_ranked: true })),
        ...unrankedData.map((h: House) => ({ ...h, is_ranked: false }))
      ]

      setHouses(allHouses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAddHouse = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!newHouse.title.trim()) {
      setError('Title is required')
      return
    }
    
    // Check for duplicates based on title, image URL, or similar address
    console.log('Checking for duplicates. Current houses:', houses.map(h => h.title))
    console.log('New house title:', newHouse.title)
    
    const isDuplicate = houses.some(house => {
      // Check exact title match
      if (house.title.toLowerCase() === newHouse.title.toLowerCase()) {
        console.log('Found duplicate title:', house.title)
        return true
      }
      // Check image URL match
      if (newHouse.image_url && house.image_url && 
          house.image_url === newHouse.image_url) {
        console.log('Found duplicate image URL:', house.image_url)
        return true
      }
      // Check listing URL match
      if (newHouse.listing_url && house.listing_url && 
          house.listing_url === newHouse.listing_url) {
        console.log('Found duplicate listing URL:', house.listing_url)
        return true
      }
      return false
    })
    
    if (isDuplicate) {
      setError('This house appears to already exist in your list')
      return
    }
    
    // Extra safety check
    if (adding) {
      return
    }

    setAdding(true)
    setError(null)

    try {
      const apiKey = localStorage.getItem('apiKey')
      const response = await fetch('/api/houses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey!,
          'x-user-id': 'default'
        },
        body: JSON.stringify({
          ...newHouse,
          collection_name: currentCollection
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add house')
      }

      const addedHouse = await response.json()
      setHouses([addedHouse, ...houses])
      setNewHouse({ title: '', description: '', image_url: '', listing_url: '' })
      setShowAddForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add house')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteHouse = async (houseId: string) => {
    if (!confirm('Are you sure you want to delete this house?')) {
      return
    }

    try {
      const apiKey = localStorage.getItem('apiKey')
      const response = await fetch(`/api/houses/${houseId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey!,
          'x-user-id': 'default'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete house')
      }

      setHouses(houses.filter(h => h.id !== houseId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete house')
    }
  }

  const handleCollectionChange = (collectionName: string) => {
    setCurrentCollectionState(collectionName)
    setCurrentCollection(collectionName)
    
    // Update rankings for new collection - merge localStorage with database rankings
    const localRankings = getRankingsForCollection(collectionName)
    const mergedRankings = Array.from(new Set([...localRankings, ...allRankings]))
    setRankings(mergedRankings)
    
    const firstRanking = mergedRankings[0] || 'Main Ranking'
    setCurrentRanking(firstRanking)
    setCurrentRanking(firstRanking)
    
    fetchHouses(collectionName, firstRanking)
  }

  const handleRankingChange = (rankingName: string) => {
    setCurrentRanking(rankingName)
    setCurrentRanking(rankingName)
    fetchHouses(currentCollection, rankingName)
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
    setNewCollectionName('')
    setShowNewCollectionForm(false)
    fetchHouses(newCollectionName, 'Main Ranking')
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
    setCurrentRanking(newRankingName)
    setCurrentRanking(newRankingName)
    setNewRankingName('')
    setShowNewRankingForm(false)
    setError(null)
    fetchHouses(currentCollection, newRankingName)
  }

  const handleImportResult = (result: any) => {
    if (result.success) {
      // Show success message
      const message = `Successfully imported ${result.imported} houses. ${result.duplicates > 0 ? `${result.duplicates} duplicates skipped.` : ''}`
      alert(message)
      
      // Refresh the house list
      fetchHouses()
    } else {
      alert(`Import failed: ${result.errors?.join(', ') || 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Manage Houses
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Collection: {currentCollection} • Ranking: {currentRanking}
            </p>
          </div>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Home
          </Link>
        </div>

        {/* Collection Management */}
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
                value={currentRanking}
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
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add New House'}
          </button>
          
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Import Houses
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Add New House
            </h2>
            
            <form onSubmit={handleAddHouse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newHouse.title}
                  onChange={(e) => setNewHouse({ ...newHouse, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter house title"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newHouse.description}
                  onChange={(e) => setNewHouse({ ...newHouse, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter house description"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={newHouse.image_url}
                  onChange={(e) => setNewHouse({ ...newHouse, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter image URL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Listing URL
                </label>
                <input
                  type="url"
                  value={newHouse.listing_url}
                  onChange={(e) => setNewHouse({ ...newHouse, listing_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter listing URL (e.g., Compass, Zillow)"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add House'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-6">
          {/* Unranked Houses Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Unranked Houses ({houses.filter(h => !h.is_ranked).length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {houses
                .filter(h => !h.is_ranked)
                .map((house) => (
                  <div
                    key={house.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                  >
                    {house.image_url ? (
                      <Image
                        src={house.image_url}
                        alt={house.title}
                        width={300}
                        height={200}
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-500 dark:text-gray-400">No Image</span>
                      </div>
                    )}
                    
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                        {house.title}
                      </h3>
                      {house.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                          {house.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        {house.listing_url ? (
                          <a
                            href={house.listing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            View Listing →
                          </a>
                        ) : (
                          <div></div>
                        )}
                        
                        <button
                          onClick={() => handleDeleteHouse(house.id)}
                          className="text-red-600 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Ranked Houses Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Ranked Houses ({houses.filter(h => h.is_ranked).length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {houses
                .filter(h => h.is_ranked)
                .sort((a, b) => (a.rank || 0) - (b.rank || 0))
                .map((house) => (
                  <div
                    key={house.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                  >
                    <div className="relative">
                      <div className="absolute top-2 left-2 z-10">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-300">
                            {(house.rank || 0) + 1}
                          </span>
                        </div>
                      </div>
                      {house.image_url ? (
                        <Image
                          src={house.image_url}
                          alt={house.title}
                          width={300}
                          height={200}
                          className="w-full h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-500 dark:text-gray-400">No Image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                        {house.title}
                      </h3>
                      {house.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                          {house.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        {house.listing_url ? (
                          <a
                            href={house.listing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            View Listing →
                          </a>
                        ) : (
                          <div></div>
                        )}
                        
                        <button
                          onClick={() => handleDeleteHouse(house.id)}
                          className="text-red-600 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportResult}
        />
      </div>
    </div>
  )
}