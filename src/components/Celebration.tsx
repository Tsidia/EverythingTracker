import { useEffect } from 'react';

interface Props {
  onDone: () => void;
}

const COLORS = ['#ff6b6b', '#feca57', '#ff9ff3', '#55efc4', '#a29bfe', '#74b9ff', '#fd79a8'];

export function Celebration({ onDone }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  // Create particles
  const particles = Array.from({ length: 40 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 40;
    const dist = 150 + Math.random() * 200;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 100;
    const color = COLORS[i % COLORS.length];
    const size = 6 + Math.random() * 8;
    return { dx, dy, color, size, delay: Math.random() * 0.3 };
  });

  return (
    <div className="celebration-overlay">
      <div className="celebration-text">
        ALL TASKS<br />COMPLETE! 🎉
      </div>
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: '50%',
            top: '50%',
            width: p.size,
            height: p.size,
            background: p.color,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            animationDelay: `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
