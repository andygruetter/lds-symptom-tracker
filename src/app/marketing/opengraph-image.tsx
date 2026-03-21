import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Symptomchat — Symptome erfassen, Muster erkennen'
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
          marginBottom: '40px',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#C4692E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '32px',
            fontWeight: 700,
          }}
        >
          S
        </div>
        <span
          style={{
            fontSize: '36px',
            fontWeight: 700,
            color: '#3D3530',
          }}
        >
          Symptomchat
        </span>
      </div>

      <div
        style={{
          fontSize: '56px',
          fontWeight: 700,
          color: '#3D3530',
          textAlign: 'center',
          lineHeight: 1.2,
          marginBottom: '24px',
        }}
      >
        Symptome erfassen.
      </div>
      <div
        style={{
          fontSize: '56px',
          fontWeight: 700,
          color: '#C4692E',
          textAlign: 'center',
          lineHeight: 1.2,
          marginBottom: '32px',
        }}
      >
        Muster erkennen.
      </div>

      <div
        style={{
          fontSize: '24px',
          color: '#6B5E54',
          textAlign: 'center',
          maxWidth: '800px',
          lineHeight: 1.5,
          marginBottom: '48px',
        }}
      >
        Sprich oder tippe — die KI erledigt den Rest. In unter 10 Sekunden.
      </div>

      <div
        style={{
          display: 'flex',
          gap: '32px',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#6B5E54',
            fontSize: '18px',
          }}
        >
          Kostenlos
        </div>
        <div
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#6B5E54',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#6B5E54',
            fontSize: '18px',
          }}
        >
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#6B5E54',
            fontSize: '18px',
          }}
        >
          Datenschutz-konform
        </div>
      </div>
    </div>,
    { ...size },
  )
}
