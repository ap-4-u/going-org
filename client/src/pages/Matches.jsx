import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { MessageCircle, AtSign, Ghost, Phone, ExternalLink } from 'lucide-react';
import './Matches.css';

const BADGE_LABELS = { just_hang: 'Just Hang', hang_fun: 'Hang & Have Fun', down_to_link: 'Down to Link' };

export default function Matches({ onOpenChat }) {
  const { user, API } = useUser();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/matches/${user.id}`)
      .then(r => r.json())
      .then(setMatches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, API]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'Z');
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h`;
    return `${Math.floor(diff/86400000)}d`;
  };

  return (
    <div className="matches-page">
      <div className="page-header">
        <h2>Matches</h2>
        <p className="header-sub">{matches.length} connections</p>
      </div>

      {loading ? (
        <div className="loading-center"><div className="loading-spinner" /></div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>No matches yet</h3>
          <p>Start swiping to find your people</p>
        </div>
      ) : (
        <div className="matches-list">
          {matches.map(m => (
            <div key={m.matchId} className="match-card fade-in">
              <img
                src={`${API}/uploads/${m.partnerPic}`}
                alt={m.partnerName}
                className="match-pic"
              />
              <div className="match-info">
                <div className="match-name-row">
                  <h4>{m.partnerName}, {m.partnerAge}</h4>
                  <span className={`badge-pill badge-${m.partnerBadge}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                    {BADGE_LABELS[m.partnerBadge]}
                  </span>
                </div>
                {m.lastMessage ? (
                  <p className="match-last-msg">
                    {m.lastMessage.length > 40 ? m.lastMessage.slice(0, 40) + '...' : m.lastMessage}
                    <span className="msg-time">{formatTime(m.lastMessageAt)}</span>
                  </p>
                ) : (
                  <p className="match-new">New match! Say hi 👋</p>
                )}

                <div className="match-socials">
                  {m.partnerInstagram && (
                    <a href={`https://instagram.com/${m.partnerInstagram.replace('@', '')}`}
                      target="_blank" rel="noopener" className="social-link ig">
                      <AtSign size={14} /> {m.partnerInstagram}
                    </a>
                  )}
                  {m.partnerSnapchat && (
                    <span className="social-link snap">
                      <Ghost size={14} /> {m.partnerSnapchat}
                    </span>
                  )}
                  {m.partnerPhone && (
                    <a href={`tel:${m.partnerPhone}`} className="social-link phone-link">
                      <Phone size={14} /> {m.partnerPhone}
                    </a>
                  )}
                </div>
              </div>

              <button className="chat-btn" onClick={() => onOpenChat(m.matchId, m.partnerName, m.partnerPic)}>
                <MessageCircle size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
