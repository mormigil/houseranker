'use client'

import { useState } from 'react'

interface ManualEntryFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (house: any) => void
  prefillUrl?: string
}

export default function ManualEntryForm({ isOpen, onClose, onSave, prefillUrl }: ManualEntryFormProps) {
  const [house, setHouse] = useState({
    title: '',
    description: '',
    image_url: '',
    address: '',
    price: '',
    listing_url: prefillUrl || ''
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!house.title.trim()) {
      alert('Title is required')
      return
    }

    const houseData = {
      ...house,
      price: house.price ? parseFloat(house.price.replace(/[^0-9.]/g, '')) : undefined
    }

    onSave(houseData)
    onClose()
    
    // Reset form
    setHouse({
      title: '',
      description: '',
      image_url: '',
      address: '',
      price: '',
      listing_url: ''
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Add House Manually
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={house.title}
              onChange={(e) => setHouse({ ...house, title: e.target.value })}
              placeholder="e.g., Beautiful 3BR Home on Main Street"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <input
              type="text"
              value={house.address}
              onChange={(e) => setHouse({ ...house, address: e.target.value })}
              placeholder="e.g., 333 Cherry Street Unit B, San Francisco, CA"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={house.description}
              onChange={(e) => setHouse({ ...house, description: e.target.value })}
              placeholder="Property details, features, location notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Price
            </label>
            <input
              type="text"
              value={house.price}
              onChange={(e) => setHouse({ ...house, price: e.target.value })}
              placeholder="e.g., $1,250,000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={house.image_url}
              onChange={(e) => setHouse({ ...house, image_url: e.target.value })}
              placeholder="https://example.com/photo.jpg"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Listing URL
            </label>
            <input
              type="url"
              value={house.listing_url}
              onChange={(e) => setHouse({ ...house, listing_url: e.target.value })}
              placeholder="https://www.compass.com/listing/..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Add House
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}