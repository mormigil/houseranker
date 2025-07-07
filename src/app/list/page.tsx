'use client'

import { useState, useEffect } from 'react'
import { House } from '@/types/house'
import Link from 'next/link'
import Image from 'next/image'

export default function ListPage() {
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRankedHouses()
  }, [])

  const fetchRankedHouses = async () => {
    try {
      const apiKey = localStorage.getItem('apiKey')
      if (!apiKey) {
        setError('API key not found. Please set it in localStorage.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/houses?ranked=true', {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Ranked Houses
          </h1>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Home
          </Link>
        </div>

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
          <div className="space-y-4">
            {houses.map((house, index) => (
              <div
                key={house.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center space-x-4"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-300">
                      {index + 1}
                    </span>
                  </div>
                </div>
                
                {house.image_url && (
                  <div className="flex-shrink-0">
                    <Image
                      src={house.image_url}
                      alt={house.title}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {house.title}
                  </h3>
                  {house.description && (
                    <p className="text-gray-600 dark:text-gray-300">
                      {house.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}