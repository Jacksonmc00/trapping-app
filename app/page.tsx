'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function Dashboard() {
  const [areas, setAreas] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([]) // Stores recent catches
  const [loading, setLoading] = useState(true)
  const [selectedArea, setSelectedArea] = useState<any>(null)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [species, setSpecies] = useState('Beaver')
  const [sex, setSex] = useState('Male')

  const supabase = createClient()

  // 1. Fetch Areas on Load
  useEffect(() => {
    const getData = async () => {
      const { data } = await supabase.from('operating_areas').select('*')
      setAreas(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  // 2. Fetch Logs when an Area is selected
  useEffect(() => {
    if (!selectedArea) return
    const getLogs = async () => {
      const { data } = await supabase
        .from('harvest_logs')
        .select('*')
        .eq('operating_area_id', selectedArea.id)
        .order('created_at', { ascending: false })
      setLogs(data || [])
    }
    getLogs()
  }, [selectedArea])

  // 3. Handle Form Submit
  const handleLogHarvest = async () => {
    if (!selectedArea) return

    const { error } = await supabase.from('harvest_logs').insert({
      operating_area_id: selectedArea.id,
      species: species,
      sex: sex,
      date_harvested: new Date().toISOString(),
    })

    if (error) {
      alert('Error logging harvest!')
      console.error(error)
    } else {
      alert('Harvest Logged!')
      setIsModalOpen(false) // Close modal
      // Refresh logs immediately
      const { data } = await supabase
        .from('harvest_logs')
        .select('*')
        .eq('operating_area_id', selectedArea.id)
        .order('created_at', { ascending: false })
      setLogs(data || [])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trapper Dashboard</h1>
          <p className="text-gray-500">Overview</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          disabled={!selectedArea}
          className={`px-4 py-2 rounded-md shadow-sm text-white transition-all
            ${!selectedArea ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
          `}
        >
          + Log Harvest
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT: Context Switcher */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Operating Area</h2>
          {loading ? <p>Loading...</p> : (
            <div className="space-y-3">
              {areas.map((area) => (
                <div 
                  key={area.id}
                  onClick={() => setSelectedArea(area)}
                  className={`
                    w-full text-left p-4 rounded-md border cursor-pointer flex justify-between items-center
                    ${selectedArea?.id === area.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  <div>
                    <h3 className={`font-medium ${selectedArea?.id === area.id ? 'text-blue-700' : 'text-gray-900'}`}>{area.name}</h3>
                    <p className="text-sm text-gray-500">{area.district}</p>
                  </div>
                  {selectedArea?.id === area.id && <span className="text-blue-600 font-bold">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Stats & Recent Logs */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {selectedArea ? `Activity: ${selectedArea.name}` : 'Select an Area'}
          </h2>
          
          {!selectedArea ? (
            <div className="h-40 flex items-center justify-center bg-gray-50 rounded border border-dashed text-gray-400">
              Select an area to view logs
            </div>
          ) : (
            <div>
              {/* Simple Stats Count */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">Total Harvests This Season</p>
                <p className="text-3xl font-bold text-blue-900">{logs.length}</p>
              </div>

              <h3 className="font-medium text-gray-700 mb-2">Recent Logs</h3>
              {logs.length === 0 ? (
                <p className="text-gray-400 text-sm">No harvests logged yet.</p>
              ) : (
                <ul className="space-y-2">
                  {logs.map((log) => (
                    <li key={log.id} className="flex justify-between p-3 bg-gray-50 rounded border border-gray-100 text-sm">
                      <span className="font-medium text-gray-900">{log.species} ({log.sex})</span>
                      <span className="text-gray-500">{new Date(log.date_harvested).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-xl font-bold mb-4">Log Harvest</h2>
            
            <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
            <select 
              value={species} 
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mb-4"
            >
              <option>Beaver</option>
              <option>Marten</option>
              <option>Fisher</option>
              <option>Otter</option>
              <option>Wolf</option>
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
            <select 
              value={sex} 
              onChange={(e) => setSex(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mb-6"
            >
              <option>Male</option>
              <option>Female</option>
              <option>Unknown</option>
            </select>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogHarvest}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}