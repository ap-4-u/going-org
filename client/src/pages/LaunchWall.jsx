import { useState, useEffect } from 'react';
import './LaunchWall.css';

// May 30, 2026 at 7:00 AM ET
const LAUNCH_DATE = new Date('2026-05-30T07:00:00-04:00');

function getTimeLeft() {
  const now = new Date();
  const diff = LAUNCH_DATE.getTime() - now.getTime();
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export default function LaunchWall() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const interval = setInterval(() => {
      const tl = getTimeLeft();
      if (!tl) {
        clearInterval(interval);
        window.location.reload();
      }
      setTimeLeft(tl);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className="launch-wall">
      <div className="launch-bg">
        <div className="launch-orb orb-a" />
        <div className="launch-orb orb-b" />
        <div className="launch-orb orb-c" />
      </div>

      <div className="launch-content">
        <div className="launch-logo">
          <span className="launch-logo-icon">G</span>
        </div>
        <h1 className="launch-title">Going<span>.org</span></h1>

        <div className="launch-announce">
          <p className="launch-label">APP officially launching</p>
          <h2 className="launch-date">May 30th</h2>
        </div>

        <div className="countdown">
          <div className="countdown-unit">
            <span className="countdown-num">{String(timeLeft.days).padStart(2, '0')}</span>
            <span className="countdown-label">Days</span>
          </div>
          <span className="countdown-sep">:</span>
          <div className="countdown-unit">
            <span className="countdown-num">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="countdown-label">Hours</span>
          </div>
          <span className="countdown-sep">:</span>
          <div className="countdown-unit">
            <span className="countdown-num">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="countdown-label">Minutes</span>
          </div>
        </div>

        <div className="launch-status-bar">
          <div className="launch-status-fill" style={{
            width: `${Math.max(5, 100 - ((timeLeft.days * 24 * 60 + timeLeft.hours * 60 + timeLeft.minutes) / (16 * 24 * 60)) * 100)}%`
          }} />
        </div>

        <p className="launch-sub">
          Your profile is all set! Once we launch, you'll be able to discover and match with people in the Tampa Bay area.
        </p>

        <div className="launch-badges">
          <div className="badge-pill status-going">Going 👀</div>
          <div className="badge-pill status-trynna_hang">Trynna Hang First 💭</div>
        </div>
      </div>
    </div>
  );
}
