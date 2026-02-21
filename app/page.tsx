'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'
import { 
  Trees, FileText, Plus, MapPin, Calendar, PawPrint, Tractor, Leaf, 
  LogOut, Map as MapIcon, User, Trash2, Pencil, Package, Navigation, MousePointerClick
} from 'lucide-react'

// Load map dynamically
const TrapMap = dynamic(() => import('./components/TrapMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full bg-stone-200 animate-pulse rounded-xl flex items-center justify-center text-stone-500 font-medium shadow-inner border border-stone-300">
      <MapPin className="h-6 w-6 mr-2 opacity-50 animate-bounce" /> Loading Satellite Imagery...
    </div>
  )
})

const ONTARIO_DISTRICTS = [
  "Algonquin Park", "Aylmer", "Bancroft", "Chapleau", "Cochrane", 
  "Dryden", "Fort Frances", "Geraldton", "Guelph", "Hearst", 
  "Kemptville", "Kenora", "Kirkland Lake", "Midhurst", "Nipigon", 
  "North Bay", "Parry Sound", "Pembroke", "Peterborough", "Red Lake", 
  "Sault Ste. Marie", "Sioux Lookout", "Sudbury", "Thunder Bay", 
  "Timmins", "Wawa"
]

const ONTARIO_FURBEARERS = [
  "Beaver", "Black Bear", "Bobcat", "Coyote", "Fisher", "Fox", "Lynx", 
  "Marten", "Mink", "Muskrat", "Opossum", "Otter", "Raccoon", 
  "Red Squirrel", "Skunk", "Weasel", "Wolf", "Wolverine"
]

export default function Dashboard() {
  const [areas, setAreas] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [deployments, setDeployments] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArea, setSelectedArea] = useState<any>(null)
  
  const [userLicenses, setUserLicenses] = useState<string[]>([])

  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false)
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false)
  const [isEditingArea, setIsEditingArea] = useState(false)
  
  // Harvest State
  const [species, setSpecies] = useState('Beaver')
  const [sex, setSex] = useState('Male')

  // Deploy State
  const [selectedTrapId, setSelectedTrapId] = useState('')
  const [manualCoords, setManualCoords] = useState<{lat: number, lng: number} | null>(null) // NEW: Remembers where you clicked

  // Area State
  const [areaId, setAreaId] = useState('')
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaDistrict, setNewAreaDistrict] = useState('Pembroke')
  const [newAreaType, setNewAreaType] = useState('Registered Line')
  const [newAreaLicense, setNewAreaLicense] = useState('')

  const supabase = createClient()
  const router = useRouter()

  const refreshAreas = async () => {
    const { data } = await supabase.from('operating_areas').select('*').order('created_at', { ascending: true })
    setAreas(data || [])
    return data
  }

  const fetchProfileLicenses = async (userId: string) => {
    const { data: profile } = await supabase.from('profiles').select('trapping_license').eq('id', userId).single()
    if (profile && profile.trapping_license) {
      const list = profile.trapping_license.split(',').filter((l: string) => l.trim() !== '')
      setUserLicenses(list)
      return list
    } else {
      setUserLicenses([])
      return []
    }
  }

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const list = await fetchProfileLicenses(user.id)
      if (list.length > 0) setNewAreaLicense(list[0])

      const areaData = await refreshAreas()
      setLoading(false)
      if (areaData && areaData.length > 0 && !selectedArea) setSelectedArea(areaData[0])
    }
    getData()
  }, [router, supabase])

  useEffect(() => {
    if (!selectedArea) {
      setLogs([]); setDeployments([]);
      return
    }
    const getAreaDetails = async () => {
      const { data: logData } = await supabase.from('harvest_logs').select('*').eq('operating_area_id', selectedArea.id).order('created_at', { ascending: false })
      setLogs(logData || [])

      const { data: depData } = await supabase.from('trap_deployments').select('*, trap_inventory(model, category)').eq('operating_area_id', selectedArea.id).order('deployed_at', { ascending: false })
      setDeployments(depData || [])
    }
    getAreaDetails()
  }, [selectedArea, supabase])

  // --- NEW: Handle Manual Map Clicks ---
  const handleMapClick = async (lat: number, lng: number) => {
    if (!selectedArea) {
      toast.error('Select an Operating Area first!')
      return
    }
    setManualCoords({ lat, lng }) // Save the clicked location
    
    const { data } = await supabase.from('trap_inventory').select('*').order('model', { ascending: true })
    setInventory(data || [])
    if (data && data.length > 0) setSelectedTrapId(data[0].id)
    setIsDeployModalOpen(true)
  }

  // --- UPDATE: GPS Button ---
  const openDeployModal = async () => {
    setManualCoords(null) // Erase manual coords so it forces GPS!
    const { data } = await supabase.from('trap_inventory').select('*').order('model', { ascending: true })
    setInventory(data || [])
    if (data && data.length > 0) setSelectedTrapId(data[0].id)
    setIsDeployModalOpen(true)
  }

  // --- UPDATE: Deployment Logic ---
  const handleDeployTrap = async () => {
    if (!selectedArea || !selectedTrapId) return

    const deployPromiseFn = async () => {
      let lat = 0;
      let lng = 0;

      // Check if we clicked the map, or used the GPS button
      if (manualCoords) {
        lat = manualCoords.lat;
        lng = manualCoords.lng;
      } else {
        const position: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
        }).catch(() => { throw new Error("Could not get GPS location. Check your browser permissions.") })
        lat = position.coords.latitude
        lng = position.coords.longitude
      }

      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('trap_deployments').insert({
        user_id: user?.id,
        operating_area_id: selectedArea.id,
        inventory_id: selectedTrapId,
        latitude: lat,
        longitude: lng,
        status: 'Set'
      })

      if (error) throw new Error(error.message)
      return true
    }

    const executingPromise = deployPromiseFn()

    toast.promise(executingPromise, {
      loading: 'Dropping pin...',
      success: 'Trap deployed on map!',
      error: (err) => `Error: ${err.message}`
    })

    try {
      await executingPromise
      setIsDeployModalOpen(false)
      setManualCoords(null) // Reset after success
      const { data: depData } = await supabase.from('trap_deployments').select('*, trap_inventory(model, category)').eq('operating_area_id', selectedArea.id).order('deployed_at', { ascending: false })
      setDeployments(depData || [])
    } catch (e) { }
  }

  const handlePullTrap = async (deploymentId: string) => {
    if (!confirm('Are you sure you want to pull this trap and remove it from the map?')) return
    const pullPromiseFn = async () => {
      const { error } = await supabase.from('trap_deployments').delete().eq('id', deploymentId)
      if (error) throw new Error(error.message); return true
    }
    const executingPromise = pullPromiseFn()
    toast.promise(executingPromise, { loading: 'Removing pin...', success: 'Trap pulled and returned to shed!', error: 'Failed to pull trap' })
    try {
      await executingPromise
      const { data: depData } = await supabase.from('trap_deployments').select('*, trap_inventory(model, category)').eq('operating_area_id', selectedArea.id).order('deployed_at', { ascending: false })
      setDeployments(depData || [])
    } catch (e) { }
  }

  const handleSaveArea = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { name: newAreaName, district: newAreaDistrict, type: newAreaType, license_number: newAreaLicense }
    const savePromiseFn = async () => {
        let error;
        if (isEditingArea) { const res = await supabase.from('operating_areas').update(payload).eq('id', areaId); error = res.error } 
        else { const res = await supabase.from('operating_areas').insert({ user_id: user.id, ...payload }); error = res.error }
        if (error) throw new Error(error.message) 
        return true
    }
    const executingPromise = savePromiseFn();
    toast.promise(executingPromise, { loading: 'Saving area...', success: 'Area saved successfully!', error: (err) => `Error: ${err.message}` })
    try {
        await executingPromise; setIsAreaModalOpen(false); setNewAreaName(''); const data = await refreshAreas()
        if (isEditingArea && selectedArea?.id === areaId) setSelectedArea(data?.find(a => a.id === areaId))
        else if (!isEditingArea && data) setSelectedArea(data[data.length - 1])
    } catch (e) { }
  }

  const handleDeleteArea = async (e: any, id: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure? This will delete the area, its pins, and ALL logs.')) return
    const deletePromiseFn = async () => {
        await supabase.from('trap_deployments').delete().eq('operating_area_id', id)
        await supabase.from('harvest_logs').delete().eq('operating_area_id', id)
        const { error } = await supabase.from('operating_areas').delete().eq('id', id)
        if (error) throw error
    }
    const executingPromise = deletePromiseFn();
    toast.promise(executingPromise, { loading: 'Deleting...', success: 'Area deleted', error: 'Could not delete area' })
    try { await executingPromise; const data = await refreshAreas(); if (selectedArea?.id === id) setSelectedArea(data && data.length > 0 ? data[0] : null) } catch (err) { }
  }

  const openEditModal = async (e: any, area: any) => {
    e.stopPropagation(); setIsEditingArea(true); setAreaId(area.id); setNewAreaName(area.name); setNewAreaDistrict(area.district); setNewAreaType(area.type);
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await fetchProfileLicenses(user.id)
    setNewAreaLicense(area.license_number || ''); setIsAreaModalOpen(true)
  }

  const openCreateModal = async () => {
    setIsEditingArea(false); setNewAreaName('')
    const { data: { user } } = await supabase.auth.getUser()
    if (user) { const freshLicenses = await fetchProfileLicenses(user.id); if (freshLicenses.length > 0) setNewAreaLicense(freshLicenses[0]); else setNewAreaLicense('') }
    setIsAreaModalOpen(true)
  }

  const handleLogHarvest = async () => {
    if (!selectedArea) return
    const logPromiseFn = async () => {
        const { error } = await supabase.from('harvest_logs').insert({ operating_area_id: selectedArea.id, species: species, sex: sex, date_harvested: new Date().toISOString() })
        if (error) throw new Error(error.message)
    }
    const executingPromise = logPromiseFn();
    toast.promise(executingPromise, { loading: 'Logging catch...', success: `${species} logged!`, error: 'Failed to log' })
    try { await executingPromise; setIsLogModalOpen(false); const { data } = await supabase.from('harvest_logs').select('*').eq('operating_area_id', selectedArea.id).order('created_at', { ascending: false }); setLogs(data || []) } catch (e) { }
  }

  const generatePDF = () => {
    if (!selectedArea) return;
    toast.success('Generating Report...')
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(22, 101, 52); doc.text('ONTARIO FUR HARVEST REPORT', 14, 22);
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.setDrawColor(200); doc.line(14, 35, 196, 35); 
    doc.setFontSize(12); doc.setTextColor(0); doc.text(`Operating Area: ${selectedArea.district} - ${selectedArea.name}`, 14, 45);
    doc.text(`License: ${selectedArea.license_number || 'N/A'}`, 14, 52);
    const tableRows = logs.map(log => [new Date(log.date_harvested).toLocaleDateString(), log.species, log.sex, selectedArea.district]);
    autoTable(doc, { head: [['Date', 'Species', 'Sex', 'WMU / District']], body: tableRows, startY: 60, theme: 'grid', headStyles: { fillColor: [22, 101, 52] }, styles: { fontSize: 10 } });
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
          <div className="flex items-center gap-3">
             <button onClick={() => router.push('/profile')} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-800 border border-emerald-700 hover:bg-emerald-700 transition-all text-xs font-medium">
              <User className="h-3 w-3" /><span>ID Wallet</span>
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="p-2 text-emerald-300 hover:text-white transition-colors" title="Sign Out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
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
            <button onClick={() => router.push('/inventory')} className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all shadow-sm">
              <Package className="h-4 w-4" /><span className="hidden md:inline">Trap Shed</span>
            </button>
            <button onClick={generatePDF} disabled={!selectedArea || logs.length === 0} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border ${!selectedArea || logs.length === 0 ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed' : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50 hover:shadow-sm'}`}>
              <FileText className="h-4 w-4" /><span className="hidden md:inline">Report</span>
            </button>
            
            <button onClick={openDeployModal} disabled={!selectedArea} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-emerald-900 shadow-sm transition-all ${!selectedArea ? 'bg-stone-300 cursor-not-allowed' : 'bg-emerald-200 hover:bg-emerald-300 active:scale-95'}`} title="Use phone GPS to drop pin">
              <Navigation className="h-4 w-4" /> Deploy Trap (GPS)
            </button>

            <button onClick={() => setIsLogModalOpen(true)} disabled={!selectedArea} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white shadow-sm transition-all ${!selectedArea ? 'bg-stone-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md active:scale-95'}`}>
              <Plus className="h-4 w-4" /> Log Harvest
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Areas */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Operating Areas</h2>
              <button onClick={openCreateModal} className="text-xs text-emerald-600 font-bold hover:underline">+ NEW</button>
            </div>
            
            {loading ? (
              <div className="bg-white h-32 rounded-xl shadow-sm animate-pulse" />
            ) : areas.length === 0 ? (
                <div onClick={openCreateModal} className="bg-white p-6 rounded-xl border-2 border-dashed border-stone-300 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                    <Plus className="h-8 w-8 mx-auto text-emerald-300 mb-2" />
                    <p className="text-stone-500 text-sm font-bold">Add Your First Area</p>
                    <p className="text-xs text-stone-400 mt-1">Click here to setup a Trap Line or Property</p>
                </div>
            ) : (
              <div className="space-y-3">
                {areas.map((area) => (
                  <div key={area.id} onClick={() => setSelectedArea(area)} className={`group relative p-4 rounded-xl border transition-all cursor-pointer overflow-hidden ${selectedArea?.id === area.id ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'bg-white border-stone-200 hover:border-emerald-300 hover:shadow-sm'}`}>
                    {selectedArea?.id === area.id && (<div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />)}
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase">
                        {area.type === 'Private Land' ? <Tractor className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}{area.district}
                      </div>
                      <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => openEditModal(e, area)} className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-stone-100 rounded" title="Edit Area"><Pencil className="h-3.5 w-3.5" /></button>
                         <button onClick={(e) => handleDeleteArea(e, area.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-stone-100 rounded" title="Delete Area"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${selectedArea?.id === area.id ? 'text-emerald-900' : 'text-stone-700'}`}>{area.name}</h3>
                    <p className="text-xs text-stone-400 font-mono">LIC: {area.license_number || 'PENDING'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Stats, MAP, & Logs */}
          <div className="lg:col-span-8">
            {!selectedArea ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-stone-200/50 rounded-2xl border-2 border-dashed border-stone-300 text-stone-400">
                <MapPin className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium">Select an Operating Area</p>
                <p className="text-sm opacity-70">Choose a line from the left to view data</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 col-span-2 md:col-span-1">
                    <p className="text-xs text-stone-500 font-medium mb-1">Total Harvest</p>
                    <p className="text-3xl font-bold text-stone-800">{logs.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 col-span-2 md:col-span-1">
                    <p className="text-xs text-stone-500 font-medium mb-1">Top Species</p>
                    <p className="text-lg font-bold text-stone-800 truncate">{logs.length > 0 ? logs[0].species : '-'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200 bg-emerald-50 col-span-2 md:col-span-2">
                    <p className="text-xs text-emerald-600 font-bold mb-1 flex items-center gap-1"><Navigation className="h-3 w-3"/> Active Sets</p>
                    <p className="text-2xl font-black text-emerald-900">{deployments.length}</p>
                  </div>
                </div>

                {/* THE MAP SECTION */}
                <div className="bg-white p-2 rounded-xl shadow-sm border border-stone-200 z-0 relative">
                  <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur text-xs font-bold text-stone-500 px-3 py-1.5 rounded-lg shadow-sm pointer-events-none">
                    Click anywhere on map to manual deploy
                  </div>
                  {/* NEW: Passed the handleMapClick down to the map component */}
                  <TrapMap deployments={deployments} onPullTrap={handlePullTrap} onMapClick={handleMapClick} />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                    <h3 className="font-bold text-stone-700 flex items-center gap-2"><Calendar className="h-4 w-4 text-stone-400" />Harvest Log</h3>
                    <span className="text-xs font-medium bg-stone-200 text-stone-600 px-2 py-1 rounded-full">2026 Season</span>
                  </div>
                  {logs.length === 0 ? (
                    <div className="p-12 text-center text-stone-400">
                      <PawPrint className="h-8 w-8 mx-auto mb-3 opacity-20" />
                      <p>No harvests logged yet.</p>
                      <button onClick={() => setIsLogModalOpen(true)} className="text-emerald-600 text-sm font-medium hover:underline mt-2">Log your first catch</button>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {logs.map((log) => (
                        <div key={log.id} className="px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${['Beaver', 'Muskrat', 'Mink', 'Otter'].includes(log.species) ? 'bg-amber-700' : 'bg-stone-600'}`}>{log.species.charAt(0)}</div>
                            <div><p className="font-bold text-stone-800">{log.species}</p><p className="text-xs text-stone-500">{log.sex} • {selectedArea.district}</p></div>
                          </div>
                          <div className="text-right"><p className="text-sm font-medium text-stone-600">{new Date(log.date_harvested).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DEPLOY TRAP MODAL */}
        {isDeployModalOpen && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-900">
                  {manualCoords ? <MousePointerClick className="h-5 w-5" /> : <Navigation className="h-5 w-5" />} 
                  Deploy Trap
                </h2>
                <button onClick={() => { setIsDeployModalOpen(false); setManualCoords(null); }} className="text-stone-400 hover:text-stone-600 text-xl font-bold">&times;</button>
              </div>
              
              {inventory.length === 0 ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-4">
                  You have no traps in your Trap Shed! Go add some inventory first.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* NEW: Dynamic visual feedback so you know how it's getting your location */}
                  {manualCoords ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex flex-col gap-1">
                      <span className="font-bold">📍 Using Selected Map Location</span>
                      <span className="text-xs opacity-75 font-mono">Lat: {manualCoords.lat.toFixed(5)}, Lng: {manualCoords.lng.toFixed(5)}</span>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 flex items-center gap-2">
                      <Navigation className="h-4 w-4 animate-pulse" />
                      <span className="font-bold">Using Current Phone GPS Location</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1 mt-2">Select Trap from Shed</label>
                    <select value={selectedTrapId} onChange={e => setSelectedTrapId(e.target.value)} className="w-full border p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                      {inventory.map(item => (
                        <option key={item.id} value={item.id}>{item.model} (Owned: {item.total_quantity})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-8 pt-4 border-t border-stone-100">
                <button onClick={() => { setIsDeployModalOpen(false); setManualCoords(null); }} className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded transition-colors">Cancel</button>
                <button 
                  onClick={handleDeployTrap} 
                  disabled={inventory.length === 0}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors disabled:bg-stone-300 flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" /> Drop Pin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HARVEST MODAL */}
        {isLogModalOpen && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-900"><Leaf className="h-5 w-5" /> Log Harvest</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Species</label>
                  <select value={species} onChange={e => setSpecies(e.target.value)} className="w-full border p-2 rounded bg-white">
                    {ONTARIO_FURBEARERS.map(f => (<option key={f} value={f}>{f}</option>))}
                  </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Sex</label>
                    <select value={sex} onChange={e => setSex(e.target.value)} className="w-full border p-2 rounded bg-white">
                        <option>Male</option><option>Female</option><option>Unknown</option>
                    </select>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setIsLogModalOpen(false)} className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded transition-colors">Cancel</button>
                  <button onClick={handleLogHarvest} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 transition-colors">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AREA MODAL */}
        {isAreaModalOpen && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-900"><MapIcon className="h-5 w-5" /> {isEditingArea ? 'Edit Operating Area' : 'Add Operating Area'}</h2>
                 {isEditingArea && (<span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold">EDIT MODE</span>)}
              </div>
              <div className="space-y-4">
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Area Name</label><input className="w-full border p-2 rounded" placeholder="e.g. South Bush Line" value={newAreaName} onChange={e => setNewAreaName(e.target.value)} /></div>
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">MNRF District</label><select className="w-full border p-2 rounded bg-white" value={newAreaDistrict} onChange={e => setNewAreaDistrict(e.target.value)}>{ONTARIO_DISTRICTS.map(d => (<option key={d} value={d}>{d}</option>))}</select></div>
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Type</label><select value={newAreaType} onChange={e => setNewAreaType(e.target.value)} className="w-full border p-2 rounded bg-white"><option>Registered Line</option><option>Private Land</option></select></div>
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">License # (From Wallet)</label>{userLicenses.length > 0 ? (<select className="w-full border p-2 rounded bg-white" value={newAreaLicense} onChange={e => setNewAreaLicense(e.target.value)}>{userLicenses.map((lic, i) => (<option key={i} value={lic}>{lic}</option>))}</select>) : (<div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-200">No licenses found. Go to <strong>ID Wallet</strong> to add them first.</div>)}</div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setIsAreaModalOpen(false)} className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded transition-colors">Cancel</button>
                  <button onClick={handleSaveArea} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 transition-colors">{isEditingArea ? 'Save Changes' : 'Create Area'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}