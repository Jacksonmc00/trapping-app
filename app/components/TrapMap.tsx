'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useState, useEffect } from 'react'

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// NEW: We added `onPullTrap` so the map knows how to talk back to the dashboard!
export default function TrapMap({ deployments = [], onPullTrap }: { deployments: any[], onPullTrap: (id: string) => void }) {
  const defaultCenter: [number, number] = [45.256, -75.358];
  const [mapKey, setMapKey] = useState<string>('')

  useEffect(() => {
    setMapKey(Date.now().toString())
    return () => setMapKey('')
  }, [])

  if (!mapKey) {
    return (
      <div className="h-[500px] w-full bg-stone-100 animate-pulse rounded-xl flex items-center justify-center text-stone-400 border border-stone-200 shadow-sm">
        Initializing map engine...
      </div>
    )
  }

  const mapCenter = deployments.length > 0 
    ? [deployments[0].latitude, deployments[0].longitude] as [number, number]
    : defaultCenter;

  return (
    <div style={{ height: '500px', width: '100%' }} className="rounded-xl overflow-hidden border border-stone-200 z-0 relative shadow-sm">
      <MapContainer key={mapKey} center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {deployments.map((dep) => (
          <Marker key={dep.id} position={[dep.latitude, dep.longitude]} icon={defaultIcon}>
            <Popup>
              <div className="text-center min-w-[120px]">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mb-1 inline-block">
                    Status: {dep.status}
                  </span>
                  <strong className="text-stone-800 font-bold block mb-1 text-sm">
                    {dep.trap_inventory?.model || 'Unknown Trap'}
                  </strong>
                  <span className="text-stone-500 text-xs block mb-3">
                    Deployed: {new Date(dep.deployed_at).toLocaleDateString()}
                  </span>
                  
                  {/* NEW: THE PULL BUTTON */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Stops the map from registering a random click
                      onPullTrap(dep.id);
                    }}
                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 py-1.5 px-2 rounded-md text-xs font-bold transition-colors"
                  >
                    Pull / Remove Pin
                  </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {deployments.length === 0 && (
          <Marker position={defaultCenter} icon={defaultIcon}>
            <Popup>
              <div className="text-center">
                  <strong className="text-emerald-800 font-bold block mb-1">Home Base</strong>
                  <span className="text-stone-500 text-xs">Drop your first pin!</span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}