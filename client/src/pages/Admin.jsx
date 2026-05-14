import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import {
  ArrowLeft, Search, MapPin, Eye, Users, MessageCircle, Heart,
  Star, Trash2, Check, X, Zap, BarChart3, RotateCcw, Shield, Crown, User
} from 'lucide-react';
import './Admin.css';

const BADGE_LABELS = { just_hang: 'Just Hang', hang_fun: 'Hang & Have Fun', down_to_link: 'Down to Link' };
const STATUS_LABELS = { going: 'Going', trynna_hang: 'Trynna Hang First' };
const CITIES = [
  'Wesley Chapel', 'Brandon', 'Trinity', 'New Port Richey', 'Tampa',
  'St. Petersburg', 'Clearwater', 'Riverview', 'Lutz', "Land O' Lakes"
];

const ADMIN_KEY = 'snook sniffers';

export default function Admin({ onBack }) {
  const { user, refreshUser, API } = useUser();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [viewData, setViewData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search filters
  const [searchCity, setSearchCity] = useState('');
  const [searchMinAge, setSearchMinAge] = useState('');
  const [searchMaxAge, setSearchMaxAge] = useState('');
  const [searchGender, setSearchGender] = useState('');
  const [searchBadge, setSearchBadge] = useState('');
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    loadStats();
    loadViews();
  }, []);

  const loadStats = async () => {
    const r = await fetch(`${API}/api/admin/stats?adminKey=${encodeURIComponent(ADMIN_KEY)}`);
    if (r.ok) setStats(await r.json());
  };

  const loadViews = async () => {
    const r = await fetch(`${API}/api/profile-views/${user.id}`);
    if (r.ok) setViewData(await r.json());
  };

  const searchProfiles = async () => {
    setLoading(true);
    const params = new URLSearchParams({ adminKey: ADMIN_KEY });
    if (searchCity) params.set('city', searchCity);
    if (searchMinAge) params.set('minAge', searchMinAge);
    if (searchMaxAge) params.set('maxAge', searchMaxAge);
    if (searchGender) params.set('gender', searchGender);
    if (searchBadge) params.set('badge', searchBadge);
    if (searchName) params.set('search', searchName);

    const r = await fetch(`${API}/api/admin/profiles?${params}`);
    if (r.ok) setProfiles(await r.json());
    setLoading(false);
  };

  const approveUser = async (targetId, approved) => {
    await fetch(`${API}/api/admin/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: ADMIN_KEY, targetId, approved }),
    });
    searchProfiles();
  };

  const promoteUser = async (targetId, promoted) => {
    await fetch(`${API}/api/admin/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: ADMIN_KEY, targetId, promoted }),
    });
    searchProfiles();
  };

  const deleteUser = async (targetId) => {
    if (!confirm('Permanently delete this user?')) return;
    await fetch(`${API}/api/admin/delete-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: ADMIN_KEY, targetId }),
    });
    searchProfiles();
    loadStats();
  };

  const resetSwipes = async () => {
    await fetch(`${API}/api/admin/reset-swipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: ADMIN_KEY, userId: user.id }),
    });
    alert('Swipes reset! You can now see all profiles again.');
  };

  const selfPromote = async () => {
    await promoteUser(user.id, !user.is_promoted);
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="back-button" onClick={onBack}><ArrowLeft size={22} /></button>
        <div style={{ flex: 1 }}>
          <h2><Shield size={20} /> Admin Panel</h2>
          <p className="admin-sub">Full control over Going.org</p>
        </div>
        <button className="switch-normal-btn" onClick={onBack}>
          <User size={16} /> Normal Mode
        </button>
      </div>

      <div className="admin-tabs">
        {['dashboard', 'profiles', 'views', 'powers'].map(t => (
          <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); if (t === 'profiles') searchProfiles(); }}>
            {t === 'dashboard' && <BarChart3 size={16} />}
            {t === 'profiles' && <Users size={16} />}
            {t === 'views' && <Eye size={16} />}
            {t === 'powers' && <Zap size={16} />}
            <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
          </button>
        ))}
      </div>

      <div className="admin-content">
        {/* Dashboard */}
        {tab === 'dashboard' && stats && (
          <div className="dashboard fade-in">
            <div className="stat-grid">
              <div className="stat-card">
                <Users size={20} />
                <span className="stat-num">{stats.totalUsers}</span>
                <span className="stat-label">Total Users</span>
              </div>
              <div className="stat-card">
                <span className="stat-emoji">👩</span>
                <span className="stat-num">{stats.totalFemale}</span>
                <span className="stat-label">Girls</span>
              </div>
              <div className="stat-card">
                <span className="stat-emoji">👨</span>
                <span className="stat-num">{stats.totalMale}</span>
                <span className="stat-label">Guys</span>
              </div>
              <div className="stat-card">
                <Heart size={20} />
                <span className="stat-num">{stats.totalMatches}</span>
                <span className="stat-label">Matches</span>
              </div>
              <div className="stat-card">
                <MessageCircle size={20} />
                <span className="stat-num">{stats.totalMessages}</span>
                <span className="stat-label">Messages</span>
              </div>
              <div className="stat-card">
                <Star size={20} />
                <span className="stat-num">{stats.totalSwipes}</span>
                <span className="stat-label">Swipes</span>
              </div>
            </div>

            <div className="stat-section">
              <h4>Users by City</h4>
              {stats.cityCounts.map(c => (
                <div key={c.city} className="stat-bar-row">
                  <span className="stat-bar-label">{c.city}</span>
                  <div className="stat-bar">
                    <div className="stat-bar-fill" style={{ width: `${(c.count / stats.totalUsers) * 100}%` }} />
                  </div>
                  <span className="stat-bar-count">{c.count}</span>
                </div>
              ))}
            </div>

            <div className="stat-section">
              <h4>Users by Vibe</h4>
              {stats.badgeCounts.map(b => (
                <div key={b.badge} className="stat-bar-row">
                  <span className="stat-bar-label">{BADGE_LABELS[b.badge] || b.badge}</span>
                  <div className="stat-bar">
                    <div className={`stat-bar-fill badge-${b.badge}`} style={{ width: `${(b.count / stats.totalUsers) * 100}%` }} />
                  </div>
                  <span className="stat-bar-count">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profiles Search */}
        {tab === 'profiles' && (
          <div className="profiles-tab fade-in">
            <div className="search-filters">
              <input type="text" placeholder="Search by name..." value={searchName}
                onChange={e => setSearchName(e.target.value)} className="text-input" />
              <div className="filter-row-admin">
                <select value={searchCity} onChange={e => setSearchCity(e.target.value)} className="text-input">
                  <option value="">All Cities</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={searchGender} onChange={e => setSearchGender(e.target.value)} className="text-input">
                  <option value="">All</option>
                  <option value="female">Girls</option>
                  <option value="male">Guys</option>
                </select>
              </div>
              <div className="filter-row-admin">
                <input type="number" placeholder="Min age" value={searchMinAge}
                  onChange={e => setSearchMinAge(e.target.value)} className="text-input" />
                <input type="number" placeholder="Max age" value={searchMaxAge}
                  onChange={e => setSearchMaxAge(e.target.value)} className="text-input" />
                <select value={searchBadge} onChange={e => setSearchBadge(e.target.value)} className="text-input">
                  <option value="">All Vibes</option>
                  <option value="just_hang">Just Hang</option>
                  <option value="hang_fun">Hang & Fun</option>
                  <option value="down_to_link">Down to Link</option>
                </select>
              </div>
              <button className="btn-primary" onClick={searchProfiles} style={{ fontSize: 14, padding: '12px' }}>
                <Search size={16} /> Search Profiles
              </button>
            </div>

            <p className="results-count">{profiles.length} profiles found</p>

            {loading ? (
              <div className="loading-center"><div className="loading-spinner" /></div>
            ) : (
              <div className="admin-profiles-list">
                {profiles.map(p => (
                  <div key={p.id} className="admin-profile-card">
                    <img src={`${API}/uploads/${p.profile_pic}`} alt="" className="admin-profile-pic" />
                    <div className="admin-profile-info">
                      <div className="admin-profile-name">
                        {p.name}, {p.age}
                        {p.is_promoted ? <span className="promoted-tag"><Crown size={10} /> Promoted</span> : null}
                        {!p.is_approved ? <span className="unapproved-tag">Hidden</span> : null}
                      </div>
                      <div className="admin-profile-meta">
                        <MapPin size={12} /> {p.city} · {p.gender === 'female' ? '👩' : '👨'} ·
                        <span className={`badge-pill badge-${p.badge}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                          {BADGE_LABELS[p.badge]}
                        </span>
                      </div>
                    </div>
                    <div className="admin-profile-actions">
                      <button className="admin-action-btn approve"
                        title={p.is_approved ? 'Hide profile' : 'Approve profile'}
                        onClick={() => approveUser(p.id, !p.is_approved)}>
                        {p.is_approved ? <Eye size={16} /> : <X size={16} />}
                      </button>
                      <button className="admin-action-btn promote"
                        title={p.is_promoted ? 'Remove promotion' : 'Promote to all feeds'}
                        onClick={() => promoteUser(p.id, !p.is_promoted)}>
                        <Crown size={16} />
                      </button>
                      <button className="admin-action-btn delete"
                        title="Delete user" onClick={() => deleteUser(p.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Views */}
        {tab === 'views' && viewData && (
          <div className="views-tab fade-in">
            <div className="views-stat">
              <Eye size={40} />
              <h2>{viewData.count}</h2>
              <p>Total profile views</p>
            </div>
            <h4 style={{ padding: '0 16px', marginBottom: 12 }}>Recent Viewers</h4>
            {viewData.viewers.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <p>No one has viewed your profile yet</p>
              </div>
            ) : (
              <div className="viewers-list">
                {viewData.viewers.map(v => (
                  <div key={v.id} className="viewer-card">
                    <img src={`${API}/uploads/${v.profile_pic}`} alt="" className="viewer-pic" />
                    <div className="viewer-info">
                      <h5>{v.name}, {v.age}</h5>
                      <span><MapPin size={11} /> {v.city}</span>
                    </div>
                    <span className={`badge-pill badge-${v.badge}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {BADGE_LABELS[v.badge]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin Powers */}
        {tab === 'powers' && (
          <div className="powers-tab fade-in">
            <h3 style={{ marginBottom: 16 }}>Admin Powers</h3>

            <div className="power-card" onClick={selfPromote}>
              <div className="power-icon" style={{ background: user.is_promoted ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.15)' }}>
                <Crown size={24} color={user.is_promoted ? '#EF4444' : '#8B5CF6'} />
              </div>
              <div className="power-info">
                <h4>{user.is_promoted ? 'Remove Self-Promotion' : 'Self-Promote'}</h4>
                <p>{user.is_promoted ? 'You are currently appearing on everyone\'s feed' : 'Appear on every user\'s feed regardless of gender'}</p>
              </div>
              <div className={`power-status ${user.is_promoted ? 'on' : 'off'}`}>
                {user.is_promoted ? 'ON' : 'OFF'}
              </div>
            </div>

            <div className="power-card" onClick={resetSwipes}>
              <div className="power-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <RotateCcw size={24} color="#10B981" />
              </div>
              <div className="power-info">
                <h4>Reset All Swipes</h4>
                <p>Clear your swipe history and see all profiles again</p>
              </div>
            </div>

            <div className="power-card" onClick={() => setTab('profiles')}>
              <div className="power-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Search size={24} color="#3B82F6" />
              </div>
              <div className="power-info">
                <h4>Search All Profiles</h4>
                <p>Find and manage any user by name, city, age, or vibe</p>
              </div>
            </div>

            <div className="power-card" onClick={() => setTab('views')}>
              <div className="power-icon" style={{ background: 'rgba(236,72,153,0.15)' }}>
                <Eye size={24} color="#EC4899" />
              </div>
              <div className="power-info">
                <h4>See Who Viewed You</h4>
                <p>View {viewData?.count || 0} people who checked out your profile</p>
              </div>
            </div>

            <div className="power-card" onClick={() => { loadStats(); setTab('dashboard'); }}>
              <div className="power-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <BarChart3 size={24} color="#F59E0B" />
              </div>
              <div className="power-info">
                <h4>Platform Analytics</h4>
                <p>See full stats on users, matches, messages, and more</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
