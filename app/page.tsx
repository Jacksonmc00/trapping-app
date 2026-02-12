'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  Trees, 
  FileText, 
  Plus, 
  MapPin, 
  Calendar, 
  PawPrint,
  Tractor,
  Leaf,
  LogOut,
  Map as MapIcon
} from 'lucide-react'

export default function Dashboard() {
  const [areas, setAreas] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArea, setSelectedArea] = useState<any>(null)
  
  // Modals State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false)
  
  // Log Form
  const [species, setSpecies] = useState('Beaver')
  const [sex, setSex] = useState('Male')

  // Area Form
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaDistrict, setNewAreaDistrict] = useState('')
  const [newAreaType, setNewAreaType] = useState('Registered Line')
  const [newAreaLicense, setNewAreaLicense] = useState('')

  const supabase = createClient()
  const router = useRouter()

  // 1. Fetch Areas
  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')

      const { data } = await supabase.from('operating_areas').select('*').order('created_at', { ascending: true })
      setAreas(data || [])
      setLoading(false)
      // Auto-select first area if exists
      if (data && data.length > 0) setSelectedArea(data[0])
    }
    getData()
  }, [router, supabase])

  // 2. Fetch Logs
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
  }, [selectedArea, supabase])

  // 3. Handle Create Area
  const handleCreateArea = async () => {
    const { error } = await supabase.from('operating_areas').insert({
      name: newAreaName,
      district: newAreaDistrict,
      type: newAreaType,
      license_number: newAreaLicense
    })

    if (error) {
      alert(error.message)
    } else {
      setIsAreaModalOpen(false)
      setNewAreaName(''); setNewAreaDistrict(''); setNewAreaLicense('')
      // Refresh list
      const { data } = await supabase.from('operating_areas').select('*').order('created_at', { ascending: true })
      setAreas(data || [])
      if (data && data.length > 0) setSelectedArea(data[data.length - 1]) // Select the new one
    }
  }

  // 4. Handle Harvest Log
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
    } else {
      setIsLogModalOpen(false)
      const { data } = await supabase
        .from('harvest_logs')
        .select('*')
        .eq('operating_area_id', selectedArea.id)
        .order('created_at', { ascending: false })
      setLogs(data || [])
    }
  }

  // 5. Generate PDF Report
  const generatePDF = () => {
    if (!selectedArea) return;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(22, 101, 52); 
    doc.text('ONTARIO FUR HARVEST REPORT', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35); 

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Operating Area: ${selectedArea.district} - ${selectedArea.name}`, 14, 45);
    doc.text(`License: ${selectedArea.license_number || 'N/A'}`, 14, 52);

    const tableRows = logs.map(log => [
      new Date(log.date_harvested).toLocaleDateString(),
      log.species,
      log.sex,
      selectedArea.district
    ]);

    autoTable(doc, {
      head: [['Date', 'Species', 'Sex', 'WMU / District']],
      body: tableRows,
      startY: 60,
      theme: 'grid',
      headStyles: { fillColor: [22, 101, 52] }, 
      styles: { fontSize: 10 }
    });

    doc.save(`Harvest_Report_${selectedArea.district}_2026.pdf`);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 font-sans">
      
      {/* NAVBAR */}
      <nav className="bg-emerald-900 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trees className="h-6 w-6 text-emerald-400" />
            <span className="font-bold text-lg tracking-tight">TraplineOS</span>
          </div>
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="flex items-center gap-2 text-xs text-emerald-100 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        
        {/* HEADER SECTION */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
            <p className="text-stone-500 text-sm">Manage your lines, quota, and harvests.</p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <button 
              onClick={() => router.push('/landowners')}
              className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all shadow-sm"
            >
              <Tractor className="h-4 w-4" />
              <span className="hidden md:inline">CRM</span>
            </button>

            <button 
              onClick={generatePDF}
              disabled={!selectedArea || logs.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border
                ${!selectedArea || logs.length === 0
                  ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed' 
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50 hover:shadow-sm'
                }
              `}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden md:inline">Report</span>
            </button>

            <button 
              onClick={() => setIsLogModalOpen(true)}
              disabled={!selectedArea}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white shadow-sm transition-all
                ${!selectedArea 
                  ? 'bg-stone-300 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md active:transform active:scale-95'
                }
              `}
            >
              <Plus className="h-4 w-4" />
              Log Harvest
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Areas */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Operating Areas</h2>
              <button onClick={() => setIsAreaModalOpen(true)} className="text-xs text-emerald-600 font-bold hover:underline">+ NEW</button>
            </div>
            
            {loading ? (
              <div className="bg-white h-32 rounded-xl shadow-sm animate-pulse" />
            ) : areas.length === 0 ? (
                <div onClick={() => setIsAreaModalOpen(true)} className="bg-white p-6 rounded-xl border-2 border-dashed border-stone-300 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                    <Plus className="h-8 w-8 mx-auto text-emerald-300 mb-2" />
                    <p className="text-stone-500 text-sm font-bold">Add Your First Area</p>
                    <p className="text-xs text-stone-400 mt-1">Click here to setup a Trap Line or Property</p>
                </div>
            ) : (
              <div className="space-y-3">
                {areas.map((area) => (
                  <div 
                    key={area.id}
                    onClick={() => setSelectedArea(area)}
                    className={`
                      group relative p-4 rounded-xl border transition-all cursor-pointer overflow-hidden
                      ${selectedArea?.id === area.id 
                        ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500' 
                        : 'bg-white border-stone-200 hover:border-emerald-300 hover:shadow-sm'
                      }
                    `}
                  >
                    {selectedArea?.id === area.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                    )}
                    
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase">
                        {area.type === 'Private Land' ? <Tractor className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {area.district}
                      </div>
                      {selectedArea?.id === area.id && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                    </div>
                    
                    <h3 className={`font-bold text-lg mb-1 ${selectedArea?.id === area.id ? 'text-emerald-900' : 'text-stone-700'}`}>
                      {area.name}
                    </h3>
                    <p className="text-xs text-stone-400 font-mono">LIC: {area.license_number || 'PENDING'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Stats & Logs */}
          <div className="lg:col-span-8">
            {!selectedArea ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-stone-200/50 rounded-2xl border-2 border-dashed border-stone-300 text-stone-400">
                <MapPin className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium">Select an Operating Area</p>
                <p className="text-sm opacity-70">Choose a line from the left to view data</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
                    <p className="text-xs text-stone-500 font-medium mb-1">Total Harvest</p>
                    <p className="text-3xl font-bold text-stone-800">{logs.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
                    <p className="text-xs text-stone-500 font-medium mb-1">Top Species</p>
                    <p className="text-lg font-bold text-stone-800 truncate">
                      {logs.length > 0 ? logs[0].species : '-'}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 col-span-2 md:col-span-1">
                    <p className="text-xs text-stone-500 font-medium mb-1">Last Active</p>
                    <p className="text-sm font-semibold text-stone-700">
                      {logs.length > 0 ? new Date(logs[0].date_harvested).toLocaleDateString() : 'No Activity'}
                    </p>
                  </div>
                </div>

                {/* Log List */}
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                    <h3 className="font-bold text-stone-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-stone-400" />
                      Harvest Log
                    </h3>
                    <span className="text-xs font-medium bg-stone-200 text-stone-600 px-2 py-1 rounded-full">
                      2026 Season
                    </span>
                  </div>
                  
                  {logs.length === 0 ? (
                    <div className="p-12 text-center text-stone-400">
                      <PawPrint className="h-8 w-8 mx-auto mb-3 opacity-20" />
                      <p>No harvests logged yet.</p>
                      <button 
                        onClick={() => setIsLogModalOpen(true)}
                        className="text-emerald-600 text-sm font-medium hover:underline mt-2"
                      >
                        Log your first catch
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {logs.map((log) => (
                        <div key={log.id} className="px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`
                              h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm
                              ${['Beaver', 'Muskrat'].includes(log.species) ? 'bg-amber-700' : 'bg-stone-600'}
                            `}>
                              {log.species.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-stone-800">{log.species}</p>
                              <p className="text-xs text-stone-500">{log.sex} • {selectedArea.district}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-stone-600">
                              {new Date(log.date_harvested).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LOG HARVEST MODAL */}
        {isLogModalOpen && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-900"><Leaf className="h-5 w-5" /> Log Harvest</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Species</label>
                  <select value={species} onChange={e => setSpecies(e.target.value)} className="w-full border p-2 rounded">
                    <option>Beaver</option><option>Marten</option><option>Fisher</option><option>Otter</option>
                    <option>Wolf</option><option>Coyote</option><option>Muskrat</option><option>Raccoon</option>
                  </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Sex</label>
                    <select value={sex} onChange={e => setSex(e.target.value)} className="w-full border p-2 rounded">
                        <option>Male</option><option>Female</option><option>Unknown</option>
                    </select>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setIsLogModalOpen(false)} className="px-4 py-2 text-stone-500">Cancel</button>
                  <button onClick={handleLogHarvest} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CREATE AREA MODAL */}
        {isAreaModalOpen && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-900"><MapIcon className="h-5 w-5" /> Add Operating Area</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Area Name</label>
                  <input className="w-full border p-2 rounded" placeholder="e.g. South Bush Line" value={newAreaName} onChange={e => setNewAreaName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">District / Town</label>
                  <input className="w-full border p-2 rounded" placeholder="e.g. Pembroke" value={newAreaDistrict} onChange={e => setNewAreaDistrict(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Type</label>
                    <select value={newAreaType} onChange={e => setNewAreaType(e.target.value)} className="w-full border p-2 rounded">
                        <option>Registered Line</option><option>Private Land</option>
                    </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">License # (Optional)</label>
                  <input className="w-full border p-2 rounded" placeholder="T-12345" value={newAreaLicense} onChange={e => setNewAreaLicense(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setIsAreaModalOpen(false)} className="px-4 py-2 text-stone-500">Cancel</button>
                  <button onClick={handleCreateArea} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700">Create Area</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}