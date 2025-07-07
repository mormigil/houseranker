'use client'

import { useState, useEffect } from 'react'
import { House } from '@/types/house'
import Link from 'next/link'
import Image from 'next/image'
import ImportModal from '@/components/ImportModal'

export default function ManagePage() {
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [newHouse, setNewHouse] = useState({
    title: '',
    description: '',
    image_url: ''
  })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchHouses()
    
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
      
      // Pre-fill the form and show it
      setNewHouse({
        title: sharedData.title,
        description: sharedData.description || `Property shared from ${sharedData.address || 'real estate app'}${sharedData.listing_url ? `. View listing: ${sharedData.listing_url}` : ''}`,
        image_url: urlParams.get('image_url') || ''
      })
      setShowAddForm(true)
      
      // Clean up URL params
      window.history.replaceState({}, '', '/manage')
    }
  }, [])

  const fetchHouses = async () => {
    try {
      const apiKey = localStorage.getItem('apiKey')
      if (!apiKey) {
        setError('API key not found. Please set it in localStorage.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/houses', {
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

  const handleAddHouse = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newHouse.title.trim()) {
      setError('Title is required')
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
        body: JSON.stringify(newHouse)
      })

      if (!response.ok) {
        throw new Error('Failed to add house')
      }

      const addedHouse = await response.json()
      setHouses([addedHouse, ...houses])
      setNewHouse({ title: '', description: '', image_url: '' })
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Manage Houses
          </h1>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Home
          </Link>
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

        <div className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Unranked Houses ({houses.filter(h => !h.is_ranked).length})
              </h2>
              <div className="space-y-3">
                {houses
                  .filter(h => !h.is_ranked)
                  .map((house) => (
                    <div
                      key={house.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center space-x-4"
                    >
                      {house.image_url && (
                        <Image
                          src={house.image_url}
                          alt={house.title}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover"
                        />
                      )}
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {house.title}
                        </h3>
                        {house.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {house.description}
                          </p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleDeleteHouse(house.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Ranked Houses ({houses.filter(h => h.is_ranked).length})
              </h2>
              <div className="space-y-3">
                {houses
                  .filter(h => h.is_ranked)
                  .sort((a, b) => (a.rank || 0) - (b.rank || 0))
                  .map((house) => (
                    <div
                      key={house.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center space-x-4"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-300">
                            {(house.rank || 0) + 1}
                          </span>
                        </div>
                      </div>
                      
                      {house.image_url && (
                        <Image
                          src={house.image_url}
                          alt={house.title}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover"
                        />
                      )}
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {house.title}
                        </h3>
                        {house.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {house.description}
                          </p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleDeleteHouse(house.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>
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