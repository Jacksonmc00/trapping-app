'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import toast from 'react-hot-toast'
import { 
  Trees, 
  ArrowLeft, 
  Plus, 
  Phone, 
  MapPin, 
  FileCheck,
  Tractor,
  Pencil,
  Trash2
} from 'lucide-react'

export default function LandownersPage() {
  const [permissions, setPermissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState('')

  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  // 1. Fetch Data
  const fetchPermissions = async () => {
    const { data } = await supabase.from('land_permissions').select('*').order('created_at', { ascending: false })
    setPermissions(data || [])
  }

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      await fetchPermissions()
      setLoading(false)
    }
    getData()
  }, [router, supabase])

  // 2. Save Contact (Handles both Add and Edit)
  const handleSave = async () => {
    const savePromise = async () => {
      let error;
      
      if (isEditing) {
        // UPDATE EXISTING
        const res = await supabase.from('land_permissions').update({
          landowner_name: name,
          phone: phone,
          property_location: location
        }).eq('id', editingId)
        error = res.error
      } else {
        // ADD NEW
        const res = await supabase.from('land_permissions').insert({
          landowner_name: name,
          phone: phone,
          property_location: location,
          status: 'Active'
        })
        error = res.error
      }

      if (error) throw new Error(error.message)
    }

    toast.promise(savePromise(), {
      loading: isEditing ? 'Updating contact...' : 'Saving contact...',
      success: isEditing ? 'Contact updated!' : 'Contact added successfully!',
      error: (err) => `Error: ${err.message}`
    })

    try {
      await savePromise()
      setIsModalOpen(false)
      resetForm()
      await fetchPermissions()
    } catch (e) {
      // Error handled by toast
    }
  }

  // 3. Delete Contact
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    const deletePromise = async () => {
      const { error } = await supabase.from('land_permissions').delete().eq('id', id)
      if (error) throw new Error(error.message)
    }

    toast.promise(deletePromise(), {
      loading: 'Deleting contact...',
      success: 'Contact deleted',
      error: 'Failed to delete contact'
    })

    try {
      await deletePromise()
      await fetchPermissions()
    } catch (e) {
      // Error handled by toast
    }
  }

  // Helper Functions for Modal
  const resetForm = () => {
    setName(''); setPhone(''); setLocation(''); setIsEditing(false); setEditingId('');
  }

  const openAddModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (p: any) => {
    setName(p.landowner_name)
    setPhone(p.phone || '')
    setLocation(p.property_location || '')
    setEditingId(p.id)
    setIsEditing(true)
    setIsModalOpen(true)
  }

  // 4. Generate Legal PDF (The "Permission Slip")
  const generateContract = (p: any) => {
    toast.success('Generating contract...')
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(22)
    doc.setTextColor(22, 101, 52)
    doc.text('TRAPPING PERMISSION AGREEMENT', 105, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 40)

    // Body
    const text = `I, ${p.landowner_name}, being the owner/occupant of the property located at:\n\n` +
                 `${p.property_location}\n\n` +
                 `Hereby grant permission to the undersigned trapper to access said land for the purpose of trapping furbearing animals in accordance with Ontario Regulations.\n\n` +
                 `This permission is valid for the 2026 Trapping Season.`
    
    doc.splitTextToSize(text, 170).forEach((line: string, i: number) => {
      doc.text(line, 20, 60 + (i * 7))
    })

    // Signatures
    doc.line(20, 160, 90, 160)
    doc.text('Landowner Signature', 20, 167)
    
    doc.line(120, 160, 190, 160)
    doc.text('Trapper Signature', 120, 167)

    doc.save(`Permission_${p.landowner_name.replace(' ', '_')}.pdf`)
  }

  return (
    <div className="min-h-screen bg-stone-100 font-sans">
      {/* Nav */}
      <nav className="bg-emerald-900 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer hover:text-emerald-300 transition-colors" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
            <span className="font-bold">Back to Dashboard</span>
          </div>
          <Trees className="h-6 w-6 text-emerald-400 opacity-50" />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Landowner CRM</h1>
            <p className="text-stone-500 text-sm">Manage private land access and contracts.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium shadow-sm transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Add Contact</span>
          </button>
        </div>

        {/* LIST */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white h-32 rounded-xl shadow-sm border border-stone-200 animate-pulse" />
          ) : permissions.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border-2 border-dashed border-stone-300">
              <Tractor className="h-12 w-12 mx-auto text-stone-300 mb-2" />
              <p className="text-stone-500 font-medium">No landowners added yet.</p>
              <button onClick={openAddModal} className="text-emerald-600 text-sm font-bold mt-2 hover:underline">Add your first property</button>
            </div>
          ) : (
            permissions.map((p) => (
              <div key={p.id} className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-emerald-200 transition-colors group">
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-stone-800">{p.landowner_name}</h3>
                    
                    {/* EDIT & DELETE MOBILE/DESKTOP ICONS */}
                    <div className="flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(p)}
                        className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Edit Contact"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-stone-500 mt-1">
                    <span className="flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded w-fit"><MapPin className="h-3.5 w-3.5 text-stone-400" /> {p.property_location}</span>
                    <span className="flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded w-fit"><Phone className="h-3.5 w-3.5 text-stone-400" /> {p.phone || 'No phone'}</span>
                  </div>
                </div>
                
                <div className="w-full md:w-auto mt-2 md:mt-0">
                  <button 
                    onClick={() => generateContract(p)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-stone-50 text-stone-700 hover:bg-stone-200 hover:text-stone-900 rounded-lg border border-stone-200 font-medium text-sm transition-all"
                  >
                    <FileCheck className="h-4 w-4 text-emerald-600" />
                    <span className="whitespace-nowrap">Permission Slip</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CREATE / EDIT MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                  <Tractor className="h-5 w-5" />
                  {isEditing ? 'Edit Landowner' : 'Add Landowner'}
                </h2>
                {isEditing && <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded-full">EDIT MODE</span>}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Full Name</label>
                  <input className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Smith" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone Number</label>
                  <input className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 555-123-4567" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Property Location / Lot</label>
                  <input className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Lot 4, Concession 9" />
                </div>
                
                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-stone-100">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-stone-500 font-medium hover:bg-stone-100 rounded-lg transition-colors">Cancel</button>
                  <button 
                    onClick={handleSave} 
                    disabled={!name || !location}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isEditing ? 'Save Changes' : 'Add Contact'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}