'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Trees, 
  ArrowLeft, 
  CreditCard, 
  User, 
  FileBadge, 
  Save,
  ShieldCheck,
  Plus,
  Trash2
} from 'lucide-react'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // ID Fields
  const [fullName, setFullName] = useState('')
  const [outdoorsCard, setOutdoorsCard] = useState('')
  const [driversLicense, setDriversLicense] = useState('')
  
  // Multiple Licenses State
  const [licenses, setLicenses] = useState<string[]>(['']) 

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setFullName(data.full_name || '')
        setOutdoorsCard(data.outdoors_card || '')
        setDriversLicense(data.drivers_license || '')
        
        // Convert stored string back into a list (or default to empty one)
        if (data.trapping_license) {
          setLicenses(data.trapping_license.split(','))
        }
      } else if (!error) {
        await supabase.from('profiles').insert({ id: user.id })
      }
      setLoading(false)
    }
    getProfile()
  }, [router, supabase])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Filter out empty lines and join with commas
    const cleanLicenses = licenses.filter(l => l.trim() !== '').join(',')

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          trapping_license: cleanLicenses, // Stores as "T-123,T-456"
          outdoors_card: outdoorsCard,
          drivers_license: driversLicense,
          updated_at: new Date().toISOString(),
        })

      if (error) alert('Error saving profile!')
      else alert('Licenses Updated Successfully')
    }
    setSaving(false)
  }

  // Helper to update a specific license in the list
  const updateLicense = (index: number, value: string) => {
    const newLicenses = [...licenses]
    newLicenses[index] = value
    setLicenses(newLicenses)
  }

  // Helper to add a new blank line
  const addLicenseLine = () => {
    setLicenses([...licenses, ''])
  }

  // Helper to remove a line
  const removeLicenseLine = (index: number) => {
    const newLicenses = licenses.filter((_, i) => i !== index)
    setLicenses(newLicenses.length ? newLicenses : ['']) // Keep at least one
  }

  return (
    <div className="min-h-screen bg-stone-100 font-sans">
      
      {/* Navbar */}
      <nav className="bg-emerald-900 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
            <span className="font-bold">Back to Dashboard</span>
          </div>
          <Trees className="h-6 w-6 text-emerald-400 opacity-50" />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            Trapper Identification
          </h1>
          <p className="text-stone-500">Manage your legal credentials for Ontario Ministry compliance.</p>
        </div>

        {loading ? <p>Loading...</p> : (
          <div className="grid gap-6">
            
            {/* DIGITAL CARD PREVIEW */}
            <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-emerald-700">
              <div className="absolute top-0 right-0 p-32 bg-emerald-500 rounded-full blur-3xl opacity-10 -mr-10 -mt-10"></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="text-emerald-200 font-bold uppercase tracking-widest text-xs">Ontario Trapper</h3>
                  <p className="font-bold text-xl">{fullName || 'YOUR NAME'}</p>
                </div>
                <Trees className="h-8 w-8 text-emerald-400" />
              </div>

              <div className="space-y-4 relative z-10">
                {/* Dynamic License List on Card */}
                <div className="border-b border-emerald-700/50 pb-2">
                  <span className="text-emerald-300 text-sm block mb-1">Trapping Licenses</span>
                  {licenses.filter(l => l.trim() !== '').length === 0 ? (
                    <span className="font-mono text-sm opacity-50">---</span>
                  ) : (
                    licenses.filter(l => l.trim() !== '').map((lic, i) => (
                      <div key={i} className="font-mono font-bold tracking-wide text-sm">
                        {lic}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-between border-b border-emerald-700/50 pb-2">
                  <span className="text-emerald-300 text-sm">Outdoors Card</span>
                  <span className="font-mono font-bold tracking-wide">{outdoorsCard || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-300 text-sm">Driver's License</span>
                  <span className="font-mono font-bold tracking-wide">{driversLicense || '---'}</span>
                </div>
              </div>
            </div>

            {/* EDIT FORM */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
              <h2 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
                <FileBadge className="h-5 w-5 text-stone-500" />
                Edit Credentials
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Full Legal Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input 
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="As it appears on ID"
                    />
                  </div>
                </div>

                {/* DYNAMIC LICENSE INPUTS */}
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Trapping License Number(s)</label>
                  <div className="space-y-2">
                    {licenses.map((lic, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="relative flex-1">
                          <FileBadge className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                          <input 
                            value={lic}
                            onChange={e => updateLicense(index, e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. T-12345 (Pembroke)"
                          />
                        </div>
                        {licenses.length > 1 && (
                          <button 
                            onClick={() => removeLicenseLine(index)}
                            className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button 
                      onClick={addLicenseLine}
                      className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:text-emerald-700 mt-2"
                    >
                      <Plus className="h-3 w-3" />
                      Add Another License
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Outdoors Card Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input 
                      value={outdoorsCard}
                      onChange={e => setOutdoorsCard(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="708158..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Driver's License</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input 
                      value={driversLicense}
                      onChange={e => setDriversLicense(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="A1234-..."
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 shadow-md flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Credentials'}
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