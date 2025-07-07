'use client'

import { useState, useEffect } from 'react'

export default function ApiKeyManager() {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const savedApiKey = localStorage.getItem('apiKey')
    if (savedApiKey) {
      setApiKey(savedApiKey)
    } else {
      setIsEditing(true)
    }
  }, [])

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('apiKey', apiKey.trim())
      setIsEditing(false)
    }
  }

  const handleClearApiKey = () => {
    localStorage.removeItem('apiKey')
    setApiKey('')
    setIsEditing(true)
  }

  if (!isEditing && apiKey) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              API Key
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {showApiKey ? apiKey : '••••••••••••••••'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Edit
            </button>
            <button
              onClick={handleClearApiKey}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        Enter API Key
      </h3>
      <div className="flex gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
        />
        <button
          onClick={handleSaveApiKey}
          disabled={!apiKey.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          Save
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Your API key is stored locally in your browser
      </p>
    </div>
  )
}