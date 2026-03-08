'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  Trees, ArrowLeft, Plus, User, MapPin, Phone, Calendar, FileText, 
  Trash2, Pencil, ShieldAlert, ShieldCheck, Tractor
} from 'lucide-react'

export default function CRM() {
  const [landowners, setLandowners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Single state object to handle all the Form on00816e fields cleanly
  const defaultForm = {
    id: '', first_name: '', last_name: '', phone: '', email: '',
    property_address: '', township: '', concession: '', lot: '',
    total_acres: '', permission_start: '', permission_end: '',
    target_species: '', notes: ''
  }
  const [formData, setFormData] = useState(defaultForm)

  const supabase = createClient()
  const router = useRouter()

  const fetchLandowners = async () => {
    const { data } = await supabase.from('landowners').select('*').order('last_name', { ascending: true })
    setLandowners(data || [])
    setLoading(false)
  }

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      fetchLandowners()
    }
    checkAuth()
  }, [router, supabase])

  const handleInputChange = (e: any) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    // Upgraded Validation Check
    if (!formData.first_name || !formData.last_name) {
      toast.error("First and Last name are required.")
      return
    }
    if (!formData.property_address) {
      toast.error("Civic Address is required to validate permission.")
      return
    }
    if (!formData.phone && !formData.email) {
      toast.error("Please provide either a Phone number or Email.")
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      email: formData.email,
      property_address: formData.property_address,
      township: formData.township,
      concession: formData.concession,
      lot: formData.lot,
      total_acres: formData.total_acres ? parseFloat(formData.total_acres) : null,
      permission_start: formData.permission_start || null,
      permission_end: formData.permission_end || null,
      target_species: formData.target_species,
      notes: formData.notes
    }

    // 1. Define the action
    const saveToDatabase = async () => {
      let error;
      if (isEditing) {
        const res = await supabase.from('landowners').update(payload).eq('id', formData.id)
        error = res.error
      } else {
        const res = await supabase.from('landowners').insert(payload)
        error = res.error
      }
      if (error) throw new Error(error.message)
      return true
    }

    // 2. Execute it EXACTLY ONCE and store the result
    const executingPromise = saveToDatabase()

    // 3. Hand that single execution to the toast notification
    toast.promise(executingPromise, {
      loading: 'Saving landowner record...',
      success: 'Record saved successfully!',
      error: (err) => `Error: ${err.message}`
    })

    // 4. Wait for that exact same execution to finish, then close the modal
    try {
      await executingPromise
      setIsModalOpen(false)
      fetchLandowners()
    } catch (e) {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? If this landowner is linked to an Operating Area, it will clear that link.')) return

    const deletePromise = async () => {
      const { error } = await supabase.from('landowners').delete().eq('id', id)
      if (error) throw new Error(error.message)
      return true
    }

    toast.promise(deletePromise(), {
      loading: 'Deleting record...',
      success: 'Landowner deleted.',
      error: 'Failed to delete.'
    })

    try {
      await deletePromise()
      fetchLandowners()
    } catch (e) {}
  }

  const openCreateModal = () => {
    setFormData(defaultForm)
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const openEditModal = (owner: any) => {
    setFormData({
      id: owner.id,
      first_name: owner.first_name || '', last_name: owner.last_name || '',
      phone: owner.phone || '', email: owner.email || '',
      property_address: owner.property_address || '',
      township: owner.township || '', concession: owner.concession || '', lot: owner.lot || '',
      total_acres: owner.total_acres || '',
      permission_start: owner.permission_start || '', permission_end: owner.permission_end || '',
      target_species: owner.target_species || '', notes: owner.notes || ''
    })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  // Helper to check if permission is active
  const checkPermissionStatus = (start: string, end: string) => {
    if (!start || !end) return { status: 'Unknown', color: 'bg-stone-100 text-stone-600 border-stone-200' }
    const today = new Date()
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    if (today >= startDate && today <= endDate) return { status: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <ShieldCheck className="h-3 w-3 mr-1" /> }
    if (today > endDate) return { status: 'Expired', color: 'bg-red-50 text-red-700 border-red-200', icon: <ShieldAlert className="h-3 w-3 mr-1" /> }
    return { status: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 font-sans pb-12">
      {/* NAVBAR */}
      <nav className="bg-emerald-900 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trees className="h-6 w-6 text-emerald-400" />
            <span className="font-bold text-lg tracking-tight">TraplineOS</span>
          </div>
          <button onClick={() => router.push('/')} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-800 border border-emerald-700 hover:bg-emerald-700 transition-all text-xs font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to Dash
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2"><Tractor className="h-6 w-6 text-emerald-700" /> Landowner CRM</h1>
            <p className="text-stone-500 text-sm">Manage Private Land permissions and Form on00816e records.</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white shadow-sm transition-all bg-emerald-600 hover:bg-emerald-700 hover:shadow-md active:scale-95">
            <Plus className="h-4 w-4" /> Add Landowner
          </button>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="bg-white h-48 rounded-xl shadow-sm animate-pulse" />)}
          </div>
        ) : landowners.length === 0 ? (
          <div onClick={openCreateModal} className="bg-white p-12 rounded-xl border-2 border-dashed border-stone-300 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all">
            <User className="h-12 w-12 mx-auto text-stone-300 mb-3" />
            <p className="text-stone-600 font-bold text-lg">No Landowners Yet</p>
            <p className="text-sm text-stone-500 mt-1">Click here to add your first private property permission.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {landowners.map((owner) => {
              const perm = checkPermissionStatus(owner.permission_start, owner.permission_end)
              return (
                <div key={owner.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow relative group">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-stone-800">{owner.first_name} {owner.last_name}</h3>
                      <div className="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(owner)} className="p-1.5 text-stone-400 hover:text-emerald-600 bg-stone-50 hover:bg-emerald-50 rounded"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(owner.id)} className="p-1.5 text-stone-400 hover:text-red-600 bg-stone-50 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {owner.phone && <p className="text-sm text-stone-600 flex items-center gap-2"><Phone className="h-4 w-4 text-stone-400" /> {owner.phone}</p>}
                      {(owner.township || owner.concession || owner.property_address) && (
                        <p className="text-sm text-stone-600 flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" /> 
                          <span>
                            {owner.property_address && <span className="block">{owner.property_address}</span>}
                            {(owner.township || owner.concession) && (
                                <span className="block text-xs opacity-75 mt-0.5">Twp: {owner.township || '-'} • Con: {owner.concession || '-'} • Lot: {owner.lot || '-'}</span>
                            )}
                          </span>
                        </p>
                      )}
                      {owner.target_species && <p className="text-sm text-stone-600 flex items-center gap-2"><Trees className="h-4 w-4 text-stone-400" /> {owner.target_species}</p>}
                    </div>
                  </div>
                  
                  <div className="bg-stone-50 px-5 py-3 border-t border-stone-100 flex justify-between items-center">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center ${perm.color}`}>
                      {perm.icon} {perm.status}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      {owner.total_acres ? `${owner.total_acres} Acres` : 'Acres Unknown'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* --- ADD/EDIT MODAL --- */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto animate-in zoom-in-95">
              
              <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
                <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-900">
                  <FileText className="h-5 w-5" /> {isEditing ? 'Edit Landowner Record' : 'New Landowner Form'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600 text-2xl">&times;</button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Section 1: Contact Info */}
                  <div className="md:col-span-2">
                    <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 border-b pb-1">Contact Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-stone-500 mb-1">First Name *</label><input name="first_name" value={formData.first_name} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1">Last Name *</label><input name="last_name" value={formData.last_name} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1">Phone *</label><input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="(555) 123-4567" /></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1">Email *</label><input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                      <div className="md:col-span-2 text-[10px] text-stone-400 mt-[-8px]">Note: You must provide either a Phone Number or an Email address.</div>
                    </div>
                  </div>

                  {/* Section 2: Form on00816e Property Specs */}
                  <div className="md:col-span-2 mt-2">
                    <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 border-b pb-1 flex justify-between">
                      <span>Property Location</span>
                      <span className="text-[10px] text-stone-400 normal-case font-medium">As required by MNRF</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="md:col-span-3"><label className="block text-xs font-bold text-stone-500 mb-1">Civic Address / Road *</label><input name="property_address" value={formData.property_address} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg outline-none" /></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1">Township</label><input name="township" value={formData.township} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg outline-none" placeholder="e.g. Russell" /></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1">Concession</label><input name="concession" value={formData.concession} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg outline-none" /></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1">Lot</label><input name="lot" value={formData.lot} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg outline-none" /></div>
                    </div>
                  </div>

                  {/* Section 3: Agreement Specs */}
                  <div className="md:col-span-2 mt-2">
                    <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 border-b pb-1">Permission Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-stone-500 mb-1">Total Acres</label><input name="total_acres" type="number" value={formData.total_acres} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg outline-none" placeholder="e.g. 150" /></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1">Target Species</label><input name="target_species" value={formData.target_species} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg outline-none" placeholder="e.g. Blanket, Beaver Only" /></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1 flex items-center gap-1"><Calendar className="h-3 w-3"/> Start Date</label><input type="date" name="permission_start" value={formData.permission_start} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg outline-none text-stone-700" /></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1 flex items-center gap-1"><Calendar className="h-3 w-3"/> Expiry Date</label><input type="date" name="permission_end" value={formData.permission_end} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg outline-none text-stone-700" /></div>
                      <div className="md:col-span-2"><label className="block text-xs font-bold text-stone-500 mb-1">Additional Notes</label><textarea name="notes" value={formData.notes} onChange={handleInputChange} className="w-full border border-stone-300 p-2.5 rounded-lg outline-none min-h-[80px]" placeholder="Gates, access rules, parking info..." /></div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="bg-stone-50 p-6 border-t border-stone-200 rounded-b-2xl flex justify-end gap-3 sticky bottom-0">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-200 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-5 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                  {isEditing ? 'Save Changes' : 'Save Landowner'}
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  )
}