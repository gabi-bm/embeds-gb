import { useState, type ReactElement } from 'react'
import './App.css'

type SlotStatus = 'idle' | 'loading' | 'ready'

interface EmbedSlot {
  id: string
  title: string
  kind: string
  description: string
  icon: ReactElement
}

const ICON_PROPS = {
  role: 'presentation' as const,
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const SLOTS: EmbedSlot[] = [
  {
    id: 'video',
    title: 'Video player',
    kind: 'iframe',
    description: 'YouTube / Vimeo style embed, autoplay + captions toggle.',
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M10 9.5 15 12l-5 2.5Z" />
      </svg>
    ),
  },
  {
    id: 'map',
    title: 'Interactive map',
    kind: 'iframe',
    description: 'Pin drop + zoom controls, checking scroll capture.',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
        <path d="M9 4v14M15 6v14" />
      </svg>
    ),
  },
  {
    id: 'form',
    title: 'Payment form',
    kind: 'web component',
    description: 'Hosted checkout field set, PCI-scoped iframe boundary.',
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="5.5" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <path d="M6.5 14h3" />
      </svg>
    ),
  },
  {
    id: 'chat',
    title: 'Live chat widget',
    kind: 'script',
    description: 'Bottom-right launcher bubble, unread badge test.',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 5h16v10H9l-4 4V5Z" />
        <path d="M8 9h8M8 12h5" />
      </svg>
    ),
  },
  {
    id: 'social',
    title: 'Social post',
    kind: 'iframe',
    description: 'oEmbed card with like/share counters mocked out.',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.5 13c.6 1.2 1.9 2 3.5 2s2.9-.8 3.5-2" />
        <path d="M9 10h.01M15 10h.01" />
      </svg>
    ),
  },
  {
    id: 'chart',
    title: 'Analytics chart',
    kind: 'web component',
    description: 'Streaming data viz, resize + theme sync check.',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 20V9M12 20V4M20 20v-7" />
        <path d="M2.5 20h19" />
      </svg>
    ),
  },
]

function useSlotStatus() {
  const [statuses, setStatuses] = useState<Record<string, SlotStatus>>({})

  const test = (id: string) => {
    setStatuses((s) => ({ ...s, [id]: 'loading' }))
    window.setTimeout(() => {
      setStatuses((s) => ({ ...s, [id]: 'ready' }))
    }, 600 + Math.random() * 500)
  }

  return { statuses, test }
}

function App() {
  const [pings, setPings] = useState(0)
  const { statuses, test } = useSlotStatus()

  return (
    <>
      <header id="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ◆
          </span>
          Embeds Testing Page
        </div>
        <span className="pill">
          <span className="pill-dot" aria-hidden="true" />
          sandbox
        </span>
      </header>

      <section id="center">
        <div className="eyebrow">internal QA playground</div>
        <h1>
          Drop it in.
          <br />
          See if it behaves.
        </h1>
        <p className="lede">
          A no-frills sandbox for eyeballing third-party embeds before they
          ship &mdash; layout shift, postMessage chatter, dark-mode leaks, the
          usual suspects.
        </p>
        <button
          type="button"
          className="counter"
          onClick={() => setPings((p) => p + 1)}
        >
          Send test ping &middot; {pings}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="slots">
        <div className="slots-head">
          <h2>Embed slots sape</h2>
          <p>Click a slot to simulate it mounting and reporting ready.</p>
        </div>
        <div className="slot-grid">
          {SLOTS.map((slot) => {
            const status = statuses[slot.id] ?? 'idle'
            return (
              <article className="slot-card" key={slot.id}>
                <div className="slot-top">
                  <span className="slot-icon">{slot.icon}</span>
                  <span className="slot-kind">{slot.kind}</span>
                </div>
                <h3>{slot.title}</h3>
                <p>{slot.description}</p>
                <button
                  type="button"
                  className={`slot-frame status-${status}`}
                  onClick={() => test(slot.id)}
                >
                  {status === 'idle' && 'waiting for embed'}
                  {status === 'loading' && 'mounting…'}
                  {status === 'ready' && 'ready ✓'}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <div className="ticks"></div>

      <footer id="footer">
        <p>No real third-party scripts are loaded here &mdash; every slot above is mocked.</p>
      </footer>

      <section id="spacer"></section>
    </>
  )
}

export default App
