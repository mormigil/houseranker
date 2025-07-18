'use client'

import { useState } from 'react'
import { ImportConfig, CSVImportConfig, URLImportConfig } from '@/types/import'
import ManualEntryForm from './ManualEntryForm'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (result: any) => void
}

export default function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [importType, setImportType] = useState<'csv' | 'url'>('csv')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvConfig, setCsvConfig] = useState<CSVImportConfig>({
    addressColumn: 'address',
    titleColumn: 'title',
    descriptionColumn: 'description',
    priceColumn: 'price',
    imageUrlColumn: 'image_url',
    listingUrlColumn: 'listing_url'
  })
  const [urlConfig, setUrlConfig] = useState<URLImportConfig>({
    url: '',
    extractImages: true,
    extractTitle: true,
    extractDescription: true
  })
  const [config, setConfig] = useState<ImportConfig>({
    source: 'csv',
    deduplicateByAddress: true,
    autoGenerateTitle: true,
    autoGenerateDescription: true,
    selectFirstImage: true
  })
  const [isImporting, setIsImporting] = useState(false)
  const [csvPreview, setCsvPreview] = useState<string[][]>([])
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCsvFile(file)
      
      // Preview first few rows
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const lines = text.split('\n').slice(0, 5)
        const preview = lines.map(line => line.split(',').map(cell => cell.trim()))
        setCsvPreview(preview)
      }
      reader.readAsText(file)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    setErrorMessage('')
    
    try {
      const formData = new FormData()
      formData.append('importType', importType)
      formData.append('config', JSON.stringify(config))
      
      if (importType === 'csv') {
        if (!csvFile) {
          throw new Error('Please select a CSV file')
        }
        formData.append('file', csvFile)
        formData.append('csvConfig', JSON.stringify(csvConfig))
      } else {
        if (!urlConfig.url) {
          throw new Error('Please enter a URL')
        }
        formData.append('urlConfig', JSON.stringify(urlConfig))
      }

      const apiKey = localStorage.getItem('apiKey')
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey!,
          'x-user-id': 'default'
        },
        body: formData
      })

      const result = await response.json()
      
      if (!response.ok) {
        const errorMsg = result.error || 'Import failed'
        setErrorMessage(errorMsg)
        
        // If URL import failed, suggest manual entry
        if (importType === 'url' && urlConfig.url) {
          const shouldTryManual = confirm(
            `${errorMsg}\n\n${result.suggestion || 'Would you like to add this property manually instead?'}`
          )
          if (shouldTryManual) {
            setShowManualEntry(true)
            return
          }
        }
        
        throw new Error(errorMsg)
      }

      onImport(result)
      onClose()
      
    } catch (error) {
      if (!errorMessage) {
        setErrorMessage(error instanceof Error ? error.message : 'Import failed')
      }
    } finally {
      setIsImporting(false)
    }
  }

  const handleManualSave = async (houseData: any) => {
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
          title: houseData.title,
          description: houseData.description || `Manually added property${houseData.address ? ` at ${houseData.address}` : ''}${houseData.listing_url ? `. View listing: ${houseData.listing_url}` : ''}`,
          image_url: houseData.image_url
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save house')
      }

      const result = await response.json()
      onImport({
        success: true,
        imported: 1,
        duplicates: 0,
        errors: [],
        houses: [result]
      })
      onClose()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save house')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Import Houses
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Import Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Import Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="csv"
                checked={importType === 'csv'}
                onChange={(e) => setImportType(e.target.value as 'csv')}
                className="mr-2"
              />
              CSV File
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="url"
                checked={importType === 'url'}
                onChange={(e) => setImportType(e.target.value as 'url')}
                className="mr-2"
              />
              Single URL
            </label>
          </div>
        </div>

        {/* CSV Import */}
        {importType === 'csv' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            
            {csvPreview.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preview (first 5 rows):
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300 dark:border-gray-600">
                    {csvPreview.map((row, index) => (
                      <tr key={index} className={index === 0 ? 'bg-gray-100 dark:bg-gray-700' : ''}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </table>
                </div>
              </div>
            )}

            {/* CSV Column Mapping */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Column *
                </label>
                <input
                  type="text"
                  value={csvConfig.addressColumn}
                  onChange={(e) => setCsvConfig({ ...csvConfig, addressColumn: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title Column
                </label>
                <input
                  type="text"
                  value={csvConfig.titleColumn}
                  onChange={(e) => setCsvConfig({ ...csvConfig, titleColumn: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description Column
                </label>
                <input
                  type="text"
                  value={csvConfig.descriptionColumn}
                  onChange={(e) => setCsvConfig({ ...csvConfig, descriptionColumn: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image URL Column
                </label>
                <input
                  type="text"
                  value={csvConfig.imageUrlColumn}
                  onChange={(e) => setCsvConfig({ ...csvConfig, imageUrlColumn: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* URL Import */}
        {importType === 'url' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Property URL
            </label>
            <input
              type="url"
              value={urlConfig.url}
              onChange={(e) => setUrlConfig({ ...urlConfig, url: e.target.value })}
              placeholder="https://www.compass.com/listing/..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            
            <div className="mt-4 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={urlConfig.extractImages}
                  onChange={(e) => setUrlConfig({ ...urlConfig, extractImages: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Extract images</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={urlConfig.extractTitle}
                  onChange={(e) => setUrlConfig({ ...urlConfig, extractTitle: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Extract title</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={urlConfig.extractDescription}
                  onChange={(e) => setUrlConfig({ ...urlConfig, extractDescription: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Extract description</span>
              </label>
            </div>
          </div>
        )}

        {/* Import Options */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Import Options
          </h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.deduplicateByAddress}
                onChange={(e) => setConfig({ ...config, deduplicateByAddress: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Remove duplicates by address
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.autoGenerateTitle}
                onChange={(e) => setConfig({ ...config, autoGenerateTitle: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-generate titles if missing
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.autoGenerateDescription}
                onChange={(e) => setConfig({ ...config, autoGenerateDescription: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-generate descriptions if missing
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.selectFirstImage}
                onChange={(e) => setConfig({ ...config, selectFirstImage: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Use only the first image
              </span>
            </label>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleImport}
            disabled={isImporting || (importType === 'csv' && !csvFile) || (importType === 'url' && !urlConfig.url)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importing...' : 'Import Houses'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Manual Entry Form */}
        {showManualEntry && (
          <ManualEntryForm
            isOpen={showManualEntry}
            onClose={() => setShowManualEntry(false)}
            onSave={handleManualSave}
            prefillUrl={urlConfig.url}
          />
        )}
      </div>
    </div>
  )
}