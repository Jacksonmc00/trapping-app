'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import { 
  Trees, 
  ArrowLeft, 
  Plus, 
  Phone, 
  MapPin, 
  FileCheck,
  Tractor
} from 'lucide-react'

export default function LandownersPage() {
  const [permissions, setPermissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  // 1. Fetch Data
  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')

      const { data } = await supabase.from('land_permissions').select('*').order('created_at', { ascending: false })
      setPermissions(data || [])
      setLoading(false)
    }
    getData()
  }, [router, supabase])

  // 2. Add New Landowner
  const handleAdd = async () => {
    const { error } = await supabase.from('land_permissions').insert({
      landowner_name: name,
      phone: phone,
      property_location: location,
      status: 'Active'
    })

    if (error) {
      alert(error.message)
    } else {
      setIsModalOpen(false)
      setName(''); setPhone(''); setLocation('');
      // Refresh list
      const { data } = await supabase.from('land_permissions').select('*').order('created_at', { ascending: false })
      setPermissions(data || [])
    }
  }

  // 3. Generate Legal PDF (The "Permission Slip")
  const generateContract = (p: any) => {
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
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
            <span className="font-bold">Back to Dashboard</span>
          </div>
          <Trees className="h-6 w-6 text-emerald-400 opacity-50" />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Landowner CRM</h1>
            <p className="text-stone-500">Manage private land access and contracts.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>

        {/* LIST */}
        <div className="space-y-4">
          {loading ? <p className="text-stone-400">Loading...</p> : permissions.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border border-dashed border-stone-300">
              <Tractor className="h-12 w-12 mx-auto text-stone-300 mb-2" />
              <p className="text-stone-500">No landowners added yet.</p>
            </div>
          ) : (
            permissions.map((p) => (
              <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-lg text-stone-800">{p.landowner_name}</h3>
                  <div className="flex items-center gap-4 text-sm text-stone-500 mt-1">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.property_location}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => generateContract(p)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg border border-stone-300 font-medium text-sm transition-colors"
                  >
                    <FileCheck className="h-4 w-4" />
                    Download Permission Slip
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-stone-800 mb-4">Add Landowner</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name</label>
                  <input className="w-full border p-2 rounded" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone</label>
                  <input className="w-full border p-2 rounded" value={phone} onChange={e => setPhone(e.target.value)} placeholder="555-1234" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Location / Lot Number</label>
                  <input className="w-full border p-2 rounded" value={location} onChange={e => setLocation(e.target.value)} placeholder="Lot 4, Concession 9" />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-stone-500">Cancel</button>
                  <button onClick={handleAdd} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}