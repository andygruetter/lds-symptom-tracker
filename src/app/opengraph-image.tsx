import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Symptomchat — Symptom-Tracking für seltene Erkrankungen'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #F2EDE7 0%, #E8DFD4 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: '60px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '48px',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '18px',
            background: '#C4692E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '36px',
            fontWeight: 700,
          }}
        >
          S
        </div>
        <span
          style={{
            fontSize: '42px',
            fontWeight: 700,
            color: '#3D3530',
          }}
        >
          Symptomchat
        </span>
      </div>

      <div
        style={{
          fontSize: '28px',
          color: '#6B5E54',
          textAlign: 'center',
          maxWidth: '800px',
          lineHeight: 1.6,
        }}
      >
        Symptom-Tracking für Patienten mit seltenen Erkrankungen
      </div>

      <div
        style={{
          display: 'flex',
          gap: '32px',
          alignItems: 'center',
          marginTop: '48px',
        }}
      >
        <div style={{ color: '#6B5E54', fontSize: '18px' }}>Kostenlos</div>
        <div
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#6B5E54',
          }}
        />
        <div style={{ color: '#6B5E54', fontSize: '18px' }}>
          Entwickelt in der Schweiz
        </div>
        <div
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#6B5E54',
          }}
        />
        <div style={{ color: '#6B5E54', fontSize: '18px' }}>
          Datenschutz-konform
        </div>
      </div>
    </div>,
    { ...size },
  )
}
