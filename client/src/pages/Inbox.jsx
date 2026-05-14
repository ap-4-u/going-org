import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Check, X, MapPin } from 'lucide-react';
import './Inbox.css';

const BADGE_LABELS = { just_hang: 'Just Hang', hang_fun: 'Hang & Have Fun', down_to_link: 'Down to Link' };

export default function Inbox({ onMatch }) {
  const { user, API } = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/inbox/${user.id}`)
      .then(r => r.json())
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, API]);

  const respond = async (senderId, action) => {
    try {
      const r = await fetch(`${API}/api/inbox/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: user.id, senderId, action }),
      });
      const data = await r.json();
      setItems(items.filter(i => i.sender_id !== senderId));

      if (data.matched) {
        const senderProfile = items.find(i => i.sender_id === senderId);
        onMatch({ matchId: data.matchId, user: senderProfile });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="inbox-page">
      <div className="page-header">
        <h2>Inbox</h2>
        <p className="header-sub">{items.length} people liked you</p>
      </div>

      {loading ? (
        <div className="loading-center">
          <div className="loading-spinner" />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💌</div>
          <h3>No pending likes</h3>
          <p>When someone likes you, they'll show up here</p>
        </div>
      ) : (
        <div className="inbox-list">
          {items.map(item => (
            <div key={item.sender_id} className="inbox-card fade-in">
              <img
                src={`${API}/uploads/${item.profile_pic}`}
                alt={item.name}
                className="inbox-pic"
              />
              <div className="inbox-info">
                <h4>{item.name}, {item.age}</h4>
                <div className="inbox-meta">
                  <span className="inbox-location">
                    <MapPin size={12} /> {item.city}
                  </span>
                  <span className={`badge-pill badge-${item.badge}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                    {BADGE_LABELS[item.badge]}
                  </span>
                </div>
              </div>
              <div className="inbox-actions">
                <button className="inbox-btn reject" onClick={() => respond(item.sender_id, 'reject')}>
                  <X size={20} />
                </button>
                <button className="inbox-btn accept" onClick={() => respond(item.sender_id, 'accept')}>
                  <Check size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
