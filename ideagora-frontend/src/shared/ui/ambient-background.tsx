export function AuroraBackground() {
  return (
    <div className="aurora-background" aria-hidden="true">
      <span className="aurora-glow aurora-glow-one" />
      <span className="aurora-glow aurora-glow-two" />
      <span className="aurora-glow aurora-glow-three" />
    </div>
  )
}

export function FlowLines() {
  return (
    <svg
      className="flowlines"
      viewBox="0 0 1200 560"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M-80 420C180 140 300 700 560 390S910 60 1280 260" />
      <path d="M-80 465C200 185 330 720 600 420S940 100 1280 305" />
      <path d="M-80 510C220 230 360 740 640 450S970 140 1280 350" />
    </svg>
  )
}
