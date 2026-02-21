'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  Trees, 
  ArrowLeft, 
  Plus, 
  Package, 
  Pencil,
  Trash2,
  Wrench,
  Tag
} from 'lucide-react'

const TRAP_CATEGORIES = [
  "Body Grip (e.g., 110, 220, 330)",
  "Foothold / Leg-hold",
  "Snare / Cable Restraint",
  "Dog Proof (DP)",
  "Live / Cage Trap",
  "Other Equipment"
]

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState('')

  // Form State
  const [category, setCategory] = useState(TRAP_CATEGORIES[0])
  const [model, setModel] = useState('')
  const [quantity, setQuantity] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  const fetchInventory = async () => {
    const { data } = await supabase.from('trap_inventory').select('*').order('category', { ascending: true }).order('model', { ascending: true })
    setInventory(data || [])
  }

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      await fetchInventory()
      setLoading(false)
    }
    getData()
  }, [router, supabase])

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      category,
      model,
      total_quantity: Number(quantity) || 0,
      notes
    }

    const savePromiseFn = async () => {
      let error;
      if (isEditing) {
        const res = await supabase.from('trap_inventory').update(payload).eq('id', editingId)
        error = res.error
      } else {
        const res = await supabase.from('trap_inventory').insert({ user_id: user.id, ...payload })
        error = res.error
      }
      if (error) throw new Error(error.message)
      return true
    }

    const executingPromise = savePromiseFn();

    toast.promise(executingPromise, {
      loading: isEditing ? 'Updating gear...' : 'Adding gear...',
      success: isEditing ? 'Gear updated!' : 'Gear added to shed!',
      error: (err) => `Error: ${err.message}`
    })

    try {
      await executingPromise
      setIsModalOpen(false)
      resetForm()
      await fetchInventory()
    } catch (e) {
      // Error handled by toast
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this gear from your inventory?')) return

    const deletePromiseFn = async () => {
      const { error } = await supabase.from('trap_inventory').delete().eq('id', id)
      if (error) throw new Error(error.message)
      return true
    }

    const executingPromise = deletePromiseFn();

    toast.promise(executingPromise, {
      loading: 'Removing gear...',
      success: 'Gear removed from shed',
      error: 'Failed to remove gear'
    })

    try {
      await executingPromise
      await fetchInventory()
    } catch (e) {
      // Error handled by toast
    }
  }

  const resetForm = () => {
    setCategory(TRAP_CATEGORIES[0])
    setModel('')
    setQuantity('')
    setNotes('')
    setIsEditing(false)
    setEditingId('')
  }

  const openAddModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (item: any) => {
    setCategory(item.category)
    setModel(item.model)
    setQuantity(item.total_quantity)
    setNotes(item.notes || '')
    setEditingId(item.id)
    setIsEditing(true)
    setIsModalOpen(true)
  }

  // Calculate total items
  const totalTraps = inventory.reduce((sum, item) => sum + (item.total_quantity || 0), 0)

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
            <h1 className="text-2xl font-bold text-stone-900">Trap Shed</h1>
            <p className="text-stone-500 text-sm">Manage your hardware inventory.</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="hidden md:block text-right mr-4 border-r border-stone-300 pr-4">
               <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Total Gear</p>
               <p className="text-2xl font-black text-emerald-800">{totalTraps}</p>
            </div>
            <button 
              onClick={openAddModal}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium shadow-sm transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">Add Gear</span>
            </button>
          </div>
        </div>

        {/* LIST */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white h-32 rounded-xl shadow-sm border border-stone-200 animate-pulse" />
          ) : inventory.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border-2 border-dashed border-stone-300">
              <Package className="h-12 w-12 mx-auto text-stone-300 mb-2" />
              <p className="text-stone-500 font-medium">Your trap shed is empty.</p>
              <button onClick={openAddModal} className="text-emerald-600 text-sm font-bold mt-2 hover:underline">Add your first trap</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inventory.map((item) => (
                <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 hover:border-emerald-300 transition-colors group relative flex flex-col justify-between h-full">
                    
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 uppercase tracking-wide">
                            {item.category.split(' ')[0]}
                        </span>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(item)} className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-stone-100 rounded-lg transition-colors" title="Edit">
                                <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-grow">
                        <h3 className="font-black text-xl text-stone-800 leading-tight mb-1">{item.model}</h3>
                        {item.notes && (
                             <p className="text-sm text-stone-500 line-clamp-2 mt-2 flex items-start gap-1"><Tag className="h-3 w-3 mt-1 flex-shrink-0" /> {item.notes}</p>
                        )}
                    </div>
                    
                    <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
                         <span className="text-sm font-semibold text-stone-400 flex items-center gap-1"><Wrench className="h-4 w-4" /> Total Owned:</span>
                         <span className="text-xl font-black text-stone-700 bg-stone-100 px-3 py-1 rounded-lg">{item.total_quantity}</span>
                    </div>

                </div>
                ))}
            </div>
          )}
        </div>

        {/* CREATE / EDIT MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {isEditing ? 'Edit Gear' : 'Add Gear'}
                </h2>
                {isEditing && <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded-full">EDIT MODE</span>}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Category</label>
                  <select className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white" value={category} onChange={e => setCategory(e.target.value)}>
                      {TRAP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Make / Model</label>
                  <input className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g., Belisle 330, Duke DP..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Total Quantity Owned</label>
                  <input type="number" min="0" className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" value={quantity} onChange={e => setQuantity(e.target.value ? Number(e.target.value) : '')} placeholder="e.g., 24" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Notes (Optional)</label>
                  <input className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Dyed and waxed Fall 2025" />
                </div>
                
                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-stone-100">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-stone-500 font-medium hover:bg-stone-100 rounded-lg transition-colors">Cancel</button>
                  <button 
                    onClick={handleSave} 
                    disabled={!model || quantity === ''}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isEditing ? 'Save Changes' : 'Add to Shed'}
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