function buildStarShadow(count) {
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(Math.random() * 2000);
    const y = Math.floor(Math.random() * 2000);
    parts.push(`${x}px ${y}px #FFF`);
  }
  return parts.join(', ');
}

const SHADOWS = {
  small: buildStarShadow(700),
  medium: buildStarShadow(200),
  big: buildStarShadow(100),
};

export default function SpaceBackground() {
  return (
    <div className="space-bg" aria-hidden="true">
      <div className="space-stars" style={{ boxShadow: SHADOWS.small }} />
      <div className="space-stars space-stars--md" style={{ boxShadow: SHADOWS.medium }} />
      <div className="space-stars space-stars--lg" style={{ boxShadow: SHADOWS.big }} />

      <div className="space-horizon">
        <div className="space-horizon-glow" />
      </div>
      <div className="space-earth" />

      <div className="space-title">nSERVE</div>
      <div className="space-subtitle">
        <span>CHOOSE</span>
        <span>YOUR</span>
        <span>PATH</span>
      </div>
    </div>
  );
}
