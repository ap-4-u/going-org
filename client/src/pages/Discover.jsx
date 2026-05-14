import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { MapPin, X, Heart, Filter, ChevronDown, RotateCcw } from 'lucide-react';
import './Discover.css';

const BADGE_LABELS = { just_hang: 'Just Hang', hang_fun: 'Hang & Have Fun', down_to_link: 'Down to Link' };
const STATUS_LABELS = { going: 'Going', trynna_hang: 'Trynna Hang First' };

export default function Discover({ onMatch }) {
  const { user, API } = useUser();
  const [profiles, setProfiles] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [swiping, setSwiping] = useState(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minAge: '', maxAge: '', city: '', badge: '' });
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState({ x: 0, y: 0, dragging: false });
  const cardRef = useRef();
  const startPos = useRef({ x: 0, y: 0 });

  const loadProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.minAge) params.set('minAge', filters.minAge);
    if (filters.maxAge) params.set('maxAge', filters.maxAge);
    if (filters.city) params.set('city', filters.city);
    if (filters.badge) params.set('badge', filters.badge);

    try {
      const r = await fetch(`${API}/api/discover/${user.id}?${params}`);
      const data = await r.json();
      setProfiles(data);
      setCurrentIdx(0);
      setPhotoIdx(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, API, filters]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const currentProfile = profiles[currentIdx];

  const getPhotos = (p) => {
    if (!p) return [];
    return [p.profile_pic, p.photo2, p.photo3, p.photo4, p.photo5].filter(Boolean);
  };

  const swipe = async (direction) => {
    if (!currentProfile || swiping) return;
    setSwiping(direction);

    try {
      const r = await fetch(`${API}/api/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swiperId: user.id,
          swipedId: currentProfile.id,
          direction,
        }),
      });
      const data = await r.json();

      if (data.match) {
        onMatch({ matchId: data.matchId, user: data.user });
      }
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => {
      setSwiping(null);
      setDragState({ x: 0, y: 0, dragging: false });
      setPhotoIdx(0);
      setCurrentIdx(i => i + 1);
    }, 300);
  };

  const handleTouchStart = (e) => {
    const t = e.touches ? e.touches[0] : e;
    startPos.current = { x: t.clientX, y: t.clientY };
    setDragState(s => ({ ...s, dragging: true }));
  };

  const handleTouchMove = (e) => {
    if (!dragState.dragging) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - startPos.current.x;
    const dy = t.clientY - startPos.current.y;
    setDragState({ x: dx, y: dy * 0.3, dragging: true });
  };

  const handleTouchEnd = () => {
    if (!dragState.dragging) return;
    if (dragState.x > 100) {
      swipe('right');
    } else if (dragState.x < -100) {
      swipe('left');
    } else {
      setDragState({ x: 0, y: 0, dragging: false });
    }
  };

  const cardStyle = swiping ? {
    animation: `swipe${swiping === 'right' ? 'Right' : 'Left'} 0.3s ease-out forwards`
  } : dragState.dragging ? {
    transform: `translateX(${dragState.x}px) translateY(${dragState.y}px) rotate(${dragState.x * 0.05}deg)`,
    transition: 'none'
  } : {
    transform: 'translateX(0) translateY(0) rotate(0deg)',
    transition: 'transform 0.3s ease'
  };

  const photos = currentProfile ? getPhotos(currentProfile) : [];

  if (loading) {
    return (
      <div className="discover-page">
        <div className="discover-empty">
          <div className="loading-spinner" />
          <p>Finding people near you...</p>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="discover-page">
        <div className="discover-empty">
          <div className="empty-icon">🔍</div>
          <h3>No more profiles</h3>
          <p>Check back later or adjust your filters</p>
          <button className="btn-secondary" onClick={loadProfiles} style={{ marginTop: 16, width: 'auto', padding: '12px 24px' }}>
            <RotateCcw size={16} /> Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="discover-page">
      <div className="discover-header">
        <h2 className="discover-title">Discover</h2>
        <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}>
          <Filter size={20} />
        </button>
      </div>

      {showFilters && (
        <div className="filter-panel slide-up">
          <div className="filter-row">
            <div className="filter-field">
              <label>Min Age</label>
              <input type="number" value={filters.minAge} onChange={e => setFilters({ ...filters, minAge: e.target.value })}
                placeholder="18" className="text-input" />
            </div>
            <div className="filter-field">
              <label>Max Age</label>
              <input type="number" value={filters.maxAge} onChange={e => setFilters({ ...filters, maxAge: e.target.value })}
                placeholder="99" className="text-input" />
            </div>
          </div>
          <div className="filter-field">
            <label>City</label>
            <select value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} className="text-input">
              <option value="">All Cities</option>
              {['Wesley Chapel','Brandon','Trinity','New Port Richey','Tampa','St. Petersburg','Clearwater','Riverview','Lutz',"Land O' Lakes"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label>Vibe</label>
            <select value={filters.badge} onChange={e => setFilters({ ...filters, badge: e.target.value })} className="text-input">
              <option value="">All Vibes</option>
              <option value="just_hang">Just Hang</option>
              <option value="hang_fun">Hang & Have Fun</option>
              <option value="down_to_link">Down to Link</option>
            </select>
          </div>
          <button className="btn-primary" onClick={() => { setShowFilters(false); loadProfiles(); }}
            style={{ marginTop: 8, fontSize: 14, padding: '12px' }}>Apply Filters</button>
        </div>
      )}

      <div className="swipe-area">
        <div
          ref={cardRef}
          className="swipe-card"
          style={cardStyle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={dragState.dragging ? handleTouchMove : undefined}
          onMouseUp={handleTouchEnd}
          onMouseLeave={dragState.dragging ? handleTouchEnd : undefined}
        >
          {dragState.x > 50 && <div className="swipe-label like">LIKE</div>}
          {dragState.x < -50 && <div className="swipe-label nope">NOPE</div>}

          <div className="card-photo">
            <img src={`${API}/uploads/${photos[photoIdx]}`} alt={currentProfile.name} draggable={false} />
            <div className="photo-dots">
              {photos.map((_, i) => (
                <button
                  key={i}
                  className={`photo-dot ${i === photoIdx ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
                />
              ))}
            </div>
            <div className="photo-nav">
              <div className="photo-nav-left" onClick={(e) => { e.stopPropagation(); setPhotoIdx(Math.max(0, photoIdx - 1)); }} />
              <div className="photo-nav-right" onClick={(e) => { e.stopPropagation(); setPhotoIdx(Math.min(photos.length - 1, photoIdx + 1)); }} />
            </div>
          </div>

          <div className="card-info">
            <div className="card-header">
              <h3>{currentProfile.name}, {currentProfile.age}</h3>
              <div className="card-badges">
                <span className={`badge-pill badge-${currentProfile.badge}`}>
                  {BADGE_LABELS[currentProfile.badge]}
                </span>
                {currentProfile.status && (
                  <span className={`badge-pill status-${currentProfile.status}`}>
                    {STATUS_LABELS[currentProfile.status] || currentProfile.status}
                  </span>
                )}
              </div>
            </div>
            <div className="card-location">
              <MapPin size={14} /> {currentProfile.city}
            </div>
            {currentProfile.bio && <p className="card-bio">{currentProfile.bio}</p>}
          </div>
        </div>
      </div>

      <div className="swipe-buttons">
        <button className="swipe-btn nope" onClick={() => swipe('left')}>
          <X size={28} />
        </button>
        <button className="swipe-btn like" onClick={() => swipe('right')}>
          <Heart size={28} />
        </button>
      </div>
    </div>
  );
}
