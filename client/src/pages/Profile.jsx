import { useState, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { MapPin, AtSign, Ghost, Phone, LogOut, Edit3, Trash2, Camera, Save, X, Shield } from 'lucide-react';
import './Profile.css';

const BADGE_LABELS = { just_hang: 'Just Hang', hang_fun: 'Hang & Have Fun', down_to_link: 'Down to Link' };
const STATUS_LABELS = { going: 'Going', trynna_hang: 'Trynna Hang First' };
const BADGES = ['just_hang', 'hang_fun', 'down_to_link'];
const STATUSES = ['going', 'trynna_hang'];
const CITIES = [
  'Wesley Chapel', 'Brandon', 'Trinity', 'New Port Richey', 'Tampa',
  'St. Petersburg', 'Clearwater', 'Riverview', 'Lutz', "Land O' Lakes",
  'Zephyrhills', 'Dade City', 'Spring Hill', 'Hudson', 'Tarpon Springs',
  'Dunedin', 'Palm Harbor', 'Safety Harbor', 'Oldsmar', 'Temple Terrace',
  'Plant City', 'Lakeland', 'Valrico', 'Seffner', 'Carrollwood',
  'Westchase', 'Citrus Park', "Town 'n' Country", 'Seminole', 'Largo'
];

export default function Profile({ onAdminOpen }) {
  const { user, logout, refreshUser, API } = useUser();
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLogging, setAdminLogging] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);

  // Edit state
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editIg, setEditIg] = useState('');
  const [editSnap, setEditSnap] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const photos = [user.profile_pic, user.photo2, user.photo3, user.photo4, user.photo5].filter(Boolean);

  const startEdit = () => {
    setEditName(user.name);
    setEditAge(user.age);
    setEditCity(user.city);
    setEditBadge(user.badge);
    setEditStatus(user.status || 'going');
    setEditBio(user.bio || '');
    setEditIg(user.instagram || '');
    setEditSnap(user.snapchat || '');
    setEditPhone(user.phone || '');
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', editName);
      fd.append('age', editAge);
      fd.append('city', editCity);
      fd.append('badge', editBadge);
      fd.append('bio', editBio);
      fd.append('instagram', editIg);
      fd.append('snapchat', editSnap);
      fd.append('phone', editPhone);

      await fetch(`${API}/api/users/${user.id}`, { method: 'PUT', body: fd });
      await refreshUser();
      setEditing(false);
    } catch (err) {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteProfile = async () => {
    try {
      await fetch(`${API}/api/users/${user.id}`, { method: 'DELETE' });
      logout();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const loginAdmin = () => {
    setAdminError('');
    setAdminLogging(true);
    if (adminPw.toLowerCase().trim() === 'snook sniffers') {
      setAdminAuthed(true);
      setShowAdminLogin(false);
      setAdminPw('');
      onAdminOpen();
    } else {
      setAdminError('Invalid password');
    }
    setAdminLogging(false);
  };

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <img src={`${API}/uploads/${user.profile_pic}`} alt={user.name} className="profile-main-pic" />
        <div className="profile-hero-overlay">
          <h2>{user.name}, {user.age}</h2>
          <div className="profile-location">
            <MapPin size={14} /> {user.city}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`badge-pill badge-${user.badge}`}>
              {BADGE_LABELS[user.badge]}
            </span>
            {user.status && (
              <span className={`badge-pill status-${user.status}`}>
                {STATUS_LABELS[user.status] || user.status}
              </span>
            )}
          </div>
        </div>
        <div className="profile-hero-actions">
          <button className="hero-action-btn edit" onClick={startEdit}>
            <Edit3 size={18} />
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="edit-overlay" onClick={() => setEditing(false)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Edit Profile</h3>
              <button className="close-btn" onClick={() => setEditing(false)}><X size={20} /></button>
            </div>
            <div className="edit-modal-body">
              <div className="input-group">
                <label>Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="text-input" />
              </div>
              <div className="input-group">
                <label>Age (16-21)</label>
                <input type="number" min="16" max="21" value={editAge} onChange={e => setEditAge(e.target.value)} className="text-input" />
              </div>
              <div className="input-group">
                <label>City</label>
                <select value={editCity} onChange={e => setEditCity(e.target.value)} className="text-input">
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Vibe</label>
                <select value={editBadge} onChange={e => setEditBadge(e.target.value)} className="text-input">
                  {BADGES.map(b => <option key={b} value={b}>{BADGE_LABELS[b]}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="text-input">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Bio</label>
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="text-input bio-input" rows={3} />
              </div>
              <div className="input-group">
                <label><AtSign size={14} /> Instagram</label>
                <input type="text" value={editIg} onChange={e => setEditIg(e.target.value)} className="text-input" placeholder="@handle" />
              </div>
              <div className="input-group">
                <label><Ghost size={14} /> Snapchat</label>
                <input type="text" value={editSnap} onChange={e => setEditSnap(e.target.value)} className="text-input" />
              </div>
              <div className="input-group">
                <label><Phone size={14} /> Phone</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="text-input" />
              </div>
            </div>
            <div className="edit-modal-footer">
              <button className="btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {user.bio && (
        <div className="profile-section">
          <h4>About</h4>
          <p>{user.bio}</p>
        </div>
      )}

      {photos.length > 1 && (
        <div className="profile-section">
          <h4>Photos</h4>
          <div className="profile-photos">
            {photos.map((p, i) => (
              <img key={i} src={`${API}/uploads/${p}`} alt="" className="profile-thumb" />
            ))}
          </div>
        </div>
      )}

      <div className="profile-section">
        <h4>Socials</h4>
        <div className="profile-socials">
          {user.instagram && (
            <div className="social-item ig">
              <AtSign size={18} />
              <span>{user.instagram}</span>
            </div>
          )}
          {user.snapchat && (
            <div className="social-item snap">
              <Ghost size={18} />
              <span>{user.snapchat}</span>
            </div>
          )}
          {user.phone && (
            <div className="social-item phone-item">
              <Phone size={18} />
              <span>{user.phone}</span>
            </div>
          )}
          {!user.instagram && !user.snapchat && !user.phone && (
            <p className="no-socials">No socials added yet</p>
          )}
        </div>
      </div>

      <div className="profile-section">
        <h4>Your ID</h4>
        <p className="user-id" onClick={() => {
          navigator.clipboard.writeText(user.id);
          alert('Copied to clipboard!');
        }}>{user.id}</p>
        <p className="id-hint">Tap to copy — use this to log back in</p>
      </div>

      <div className="profile-actions-section">
        <button className="edit-profile-btn" onClick={startEdit}>
          <Edit3 size={18} /> Edit Profile
        </button>
        <button className="delete-profile-btn" onClick={() => setShowDeleteConfirm(true)}>
          <Trash2 size={18} /> Delete Profile
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="edit-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-icon-wrap">⚠️</div>
            <h3>Delete your profile?</h3>
            <p>This will permanently delete your account, matches, messages, and all data. This cannot be undone.</p>
            <div className="delete-confirm-btns">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="delete-confirm-yes" onClick={deleteProfile}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <button className="logout-btn" onClick={logout}>
        <LogOut size={18} /> Log Out
      </button>

      {/* Hidden admin access — very discreet */}
      <div className="admin-link-wrap">
        <button className="admin-link hidden-link" onClick={() => setShowAdminLogin(true)}>
          ⚙️
        </button>
      </div>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="edit-overlay" onClick={() => setShowAdminLogin(false)}>
          <div className="admin-login-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-login-icon"><Shield size={32} /></div>
            <h3>Admin Login</h3>
            <p className="admin-login-sub">Enter the secret password</p>
            <div className="input-group">
              <input
                type="password"
                value={adminPw}
                onChange={e => { setAdminPw(e.target.value); setAdminError(''); }}
                placeholder="Secret password..."
                className="text-input"
                onKeyDown={e => e.key === 'Enter' && loginAdmin()}
                autoFocus
              />
            </div>
            {adminError && <p className="admin-error">{adminError}</p>}
            <button className="btn-primary" onClick={loginAdmin} disabled={adminLogging || !adminPw.trim()}>
              {adminLogging ? 'Verifying...' : 'Login'}
            </button>
            <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => setShowAdminLogin(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
