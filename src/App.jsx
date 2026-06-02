import { useState } from 'react'
import FloorPlan from './FloorPlan'
import Cabin3D from './Cabin3D'
import BayConcepts from './BayConcepts'

const TABS = [
  { id: 'plan', label: 'Floor Plan' },
  { id: '3d',   label: '3D View'    },
  { id: 'bay',  label: 'Bay Ideas'  },
]

export default function App() {
  const [view, setView] = useState('plan')
  return (
    <div style={{ minHeight: '100vh', background: '#eeeae4' }}>
      <nav style={{
        display: 'flex', gap: 0, padding: '14px 24px',
        background: '#fff', borderBottom: '1px solid #e5e0d8',
        boxShadow: '0 1px 0 rgba(0,0,0,0.03)',
        position: 'sticky', top: 0, zIndex: 10,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginRight: 32, alignSelf: 'center' }}>
          A-Frame Cabin
        </div>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            style={{
              padding: '8px 18px', marginRight: 4,
              background: view === t.id ? '#1a1a2e' : 'transparent',
              color:      view === t.id ? '#fff' : '#374151',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              fontFamily: 'inherit',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: view === '3d' ? '24px' : 0, position: 'relative' }}>
        {view === 'plan' && <FloorPlan />}
        {view === '3d'   && <Cabin3D />}
        {view === 'bay'  && <BayConcepts />}
      </div>
    </div>
  )
}
