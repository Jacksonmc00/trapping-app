'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  Trees, 
  ArrowLeft, 
  CreditCard, 
  User, 
  FileBadge, 
  Save,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Target
} from 'lucide-react'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Existing ID Fields
  const [fullName, setFullName] = useState('')
  const [outdoorsCard, setOutdoorsCard] = useState('')
  const [palNumber, setPalNumber] = useState('') // REPLACED: Drivers License with PAL
  const [licenses, setLicenses] = useState<string[]>(['']) 

  // Expiry & OFMF Fields
  const [licenseExpiry, setLicenseExpiry] = useState('')
  const [ofmfNumber, setOfmfNumber] = useState('')
  const [ofmfExpiry, setOfmfExpiry] = useState('')

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
        setPalNumber(data.pal_number || '') // REPLACED
        
        setLicenseExpiry(data.license_expiry || '')
        setOfmfNumber(data.ofmf_number || '')
        setOfmfExpiry(data.ofmf_expiry || '')
        
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
    
    const cleanLicenses = licenses.filter(l => l.trim() !== '').join(',')

    if (user) {
      const savePromise = async () => {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: fullName,
            trapping_license: cleanLicenses,
            outdoors_card: outdoorsCard,
            pal_number: palNumber,                 // REPLACED
            license_expiry: licenseExpiry || null, 
            ofmf_number: ofmfNumber,               
            ofmf_expiry: ofmfExpiry || null,       
            updated_at: new Date().toISOString(),
          })
        if (error) throw new Error(error.message)
        return true
      }

      toast.promise(savePromise(), {
        loading: 'Saving ID Wallet...',
        success: 'Credentials Updated Successfully!',
        error: 'Error saving profile!'
      })
      
      try {
        await savePromise()
      } catch (e) {}
    }
    setSaving(false)
  }

  const updateLicense = (index: number, value: string) => {
    const newLicenses = [...licenses]
    newLicenses[index] = value
    setLicenses(newLicenses)
  }

  const addLicenseLine = () => setLicenses([...licenses, ''])
  
  const removeLicenseLine = (index: number) => {
    const newLicenses = licenses.filter((_, i) => i !== index)
    setLicenses(newLicenses.length ? newLicenses : [''])
  }

  const getStatus = (expiryDate: string) => {
    if (!expiryDate) return { label: 'MISSING DATES', color: 'bg-stone-200/20 text-stone-300', icon: <AlertTriangle className="h-3 w-3" /> }
    
    const today = new Date()
    const expiry = new Date(expiryDate)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    if (today > expiry) return { label: 'EXPIRED', color: 'bg-red-500/20 text-red-300 border border-red-500/50', icon: <ShieldAlert className="h-3 w-3" /> }
    if (expiry <= thirtyDaysFromNow) return { label: 'EXPIRING SOON', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/50', icon: <AlertTriangle className="h-3 w-3" /> }
    
    return { label: 'ACTIVE', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50', icon: <ShieldCheck className="h-3 w-3" /> }
  }

  const mnrfStatus = getStatus(licenseExpiry)
  const ofmfStatus = getStatus(ofmfExpiry)

  return (
    <div className="min-h-screen bg-stone-100 font-sans pb-12">
      
      {/* Navbar */}
      <nav className="bg-emerald-900 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer hover:text-emerald-300 transition-colors" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
            <span className="font-bold">Back to Dashboard</span>
          </div>
          <Trees className="h-6 w-6 text-emerald-400 opacity-50" />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              Trapper Identification
            </h1>
            <p className="text-stone-500 text-sm mt-1">Manage your legal credentials and OFMF insurance.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="hidden md:flex bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-emerald-700 shadow-md items-center gap-2 transition-all active:scale-95"
          >
            <Save className="h-4 w-4" /> Save Wallet
          </button>
        </div>

        {loading ? (
           <div className="h-64 bg-white rounded-2xl border border-stone-200 animate-pulse"></div>
        ) : (
          <div className="grid gap-6">
            
            {/* ENHANCED DIGITAL CARD PREVIEW */}
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
                
                {/* Trapping Licenses & Expiry */}
                <div className="border-b border-emerald-700/50 pb-3 flex justify-between items-end">
                  <div>
                    <span className="text-emerald-300 text-xs uppercase tracking-wider block mb-1">Trapping Licenses</span>
                    {licenses.filter(l => l.trim() !== '').length === 0 ? (
                      <span className="font-mono text-sm opacity-50">---</span>
                    ) : (
                      licenses.filter(l => l.trim() !== '').map((lic, i) => (
                        <div key={i} className="font-mono font-bold tracking-wide text-sm">{lic}</div>
                      ))
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">MNRF Status</div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${mnrfStatus.color}`}>
                      {mnrfStatus.icon} {mnrfStatus.label}
                    </span>
                  </div>
                </div>

                {/* OFMF & Expiry */}
                <div className="border-b border-emerald-700/50 pb-3 flex justify-between items-end">
                  <div>
                    <span className="text-emerald-300 text-xs uppercase tracking-wider block mb-1">OFMF Membership</span>
                    <span className="font-mono font-bold tracking-wide">{ofmfNumber || '---'}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Insurance Status</div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${ofmfStatus.color}`}>
                      {ofmfStatus.icon} {ofmfStatus.label}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between pt-1">
                  <div>
                    <span className="text-emerald-300 text-xs uppercase tracking-wider block">Outdoors Card</span>
                    <span className="font-mono font-bold tracking-wide text-sm">{outdoorsCard || '---'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-300 text-xs uppercase tracking-wider block">PAL Number</span>
                    <span className="font-mono font-bold tracking-wide text-sm">{palNumber || '---'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* EDIT FORM */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
              <h2 className="font-bold text-stone-800 mb-6 flex items-center gap-2 pb-4 border-b border-stone-100">
                <FileBadge className="h-5 w-5 text-stone-500" /> Update Credentials
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Full Legal Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input 
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="As it appears on ID"
                    />
                  </div>
                </div>

                {/* Trapping Licenses & Expiry Block */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Trapping License Number(s)</label>
                    <div className="space-y-2">
                      {licenses.map((lic, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="relative flex-1">
                            <FileBadge className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
                            <input 
                              value={lic}
                              onChange={e => updateLicense(index, e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                              placeholder="e.g. TR-123456"
                            />
                          </div>
                          {licenses.length > 1 && (
                            <button onClick={() => removeLicenseLine(index)} className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={addLicenseLine} className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:text-emerald-700 mt-2 px-2 py-1 hover:bg-emerald-50 rounded transition-colors">
                        <Plus className="h-3 w-3" /> Add Another License
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1 flex items-center gap-1"><Calendar className="h-3 w-3"/> MNRF Expiry Date</label>
                    <input type="date" value={licenseExpiry} onChange={e => setLicenseExpiry(e.target.value)} className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>

                {/* OFMF Block */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">OFMF Number</label>
                    <input value={ofmfNumber} onChange={e => setOfmfNumber(e.target.value)} className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono" placeholder="e.g. 987654" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1 flex items-center gap-1"><Calendar className="h-3 w-3"/> OFMF Expiry Date</label>
                    <input type="date" value={ofmfExpiry} onChange={e => setOfmfExpiry(e.target.value)} className="w-full border border-stone-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Outdoors Card Number</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                      <input 
                        value={outdoorsCard}
                        onChange={e => setOutdoorsCard(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="708158..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">PAL Number</label>
                    <div className="relative">
                      <Target className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                      <input 
                        value={palNumber}
                        onChange={e => setPalNumber(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="12345678.0001"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-stone-100">
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-lg hover:bg-emerald-700 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Save className="h-5 w-5" />
                    {saving ? 'Saving Database...' : 'Save All Credentials'}
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