'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Trees, ArrowRight, Lock } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false) // Toggle between Sign In / Sign Up
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isSignUp) {
      // Create new account
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
      })
      if (error) {
        alert(error.message)
      } else {
        alert('Account created! Logging you in...')
        router.refresh()
      }
    } else {
      // Log in existing account
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      if (error) {
        alert(error.message)
      } else {
        router.push('/') // Redirect to Dashboard
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-stone-200">
        
        {/* Login Header */}
        <div className="bg-emerald-900 p-8 text-center">
          <div className="mx-auto bg-emerald-800 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Trees className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">TraplineOS</h1>
          <p className="text-emerald-200 text-sm mt-1">Professional Fur Management</p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-stone-300 rounded-lg p-3 text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none bg-stone-50"
                placeholder="trapper@example.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-stone-300 rounded-lg p-3 text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none bg-stone-50"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-stone-500 hover:text-emerald-600 font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <Lock className="h-3 w-3" />
              {isSignUp ? 'Already have an account? Sign In' : 'New trapper? Create Account'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}