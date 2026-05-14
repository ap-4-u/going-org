import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from './context/UserContext';
import { Compass, Inbox as InboxIcon, MessageCircle, User, Lock } from 'lucide-react';
import Welcome from './pages/Welcome';
import Onboarding from './pages/Onboarding';
import Discover from './pages/Discover';
import InboxPage from './pages/Inbox';
import Matches from './pages/Matches';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import LaunchWall from './pages/LaunchWall';
import io from 'socket.io-client';

const API = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

// May 30, 2026 at 7:00 AM ET
const LAUNCH_DATE = new Date('2026-05-30T07:00:00-04:00');

function isLaunched() {
  return Date.now() >= LAUNCH_DATE.getTime();
}

function MainApp() {
  const { user } = useUser();
  const [tab, setTab] = useState('discover');
  const [matchPopup, setMatchPopup] = useState(null);
  const [chatInfo, setChatInfo] = useState(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminSession, setAdminSession] = useState(false);
  const [launched, setLaunched] = useState(isLaunched());

  // Check launch status periodically
  useEffect(() => {
    const check = setInterval(() => {
      if (isLaunched() && !launched) {
        setLaunched(true);
      }
    }, 10000);
    return () => clearInterval(check);
  }, [launched]);

  const appUnlocked = launched || adminSession;

  useEffect(() => {
    if (!user || !appUnlocked) return;
    fetch(`${API}/api/inbox/${user.id}`)
      .then(r => r.json())
      .then(data => setInboxCount(data.length))
      .catch(() => {});

    const socket = io(API);
    socket.emit('register', user.id);
    socket.on('new_match', () => {
      fetch(`${API}/api/inbox/${user.id}`)
        .then(r => r.json())
        .then(data => setInboxCount(data.length))
        .catch(() => {});
    });

    return () => socket.disconnect();
  }, [user, appUnlocked]);

  if (showAdmin && adminSession) {
    return <Admin onBack={() => { setShowAdmin(false); setAdminSession(false); }} />;
  }

  if (chatInfo && appUnlocked) {
    return (
      <Chat
        matchId={chatInfo.matchId}
        partnerName={chatInfo.name}
        partnerPic={chatInfo.pic}
        onBack={() => setChatInfo(null)}
      />
    );
  }

  const handleMatch = (matchData) => {
    setMatchPopup(matchData);
  };

  const openChat = (matchId, name, pic) => {
    setChatInfo({ matchId, name, pic });
  };

  // If not launched and not admin, show launch wall on locked tabs, profile always accessible
  const lockedTabs = ['discover', 'inbox', 'matches'];
  const showLaunchWall = !appUnlocked && lockedTabs.includes(tab);

  return (
    <div className="app-container">
      {matchPopup && appUnlocked && (
        <div className="match-overlay" onClick={() => setMatchPopup(null)}>
          <div className="match-popup" onClick={e => e.stopPropagation()}>
            <h1>It's a Match!</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              You and {matchPopup.user?.name || 'someone'} liked each other
            </p>
            <div className="match-photos">
              <img src={`${API}/uploads/${user.profile_pic}`} alt="" />
              {matchPopup.user?.profile_pic && (
                <img src={`${API}/uploads/${matchPopup.user.profile_pic}`} alt="" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
              <button className="btn-primary" onClick={() => {
                setMatchPopup(null);
                if (matchPopup.user) {
                  openChat(matchPopup.matchId, matchPopup.user.name, matchPopup.user.profile_pic);
                }
              }}>
                Send a Message
              </button>
              <button className="btn-secondary" onClick={() => setMatchPopup(null)}>
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, paddingBottom: 0 }}>
        {showLaunchWall ? (
          <LaunchWall />
        ) : (
          <>
            {tab === 'discover' && <Discover onMatch={handleMatch} />}
            {tab === 'inbox' && <InboxPage onMatch={handleMatch} />}
            {tab === 'matches' && <Matches onOpenChat={openChat} />}
          </>
        )}
        {tab === 'profile' && <Profile onAdminOpen={() => { setAdminSession(true); setShowAdmin(true); }} />}
      </div>

      <div className="nav-bar">
        <button className={`nav-item ${tab === 'discover' ? 'active' : ''}`} onClick={() => setTab('discover')}>
          {!appUnlocked ? <Lock size={20} /> : <Compass size={22} />}
          <span>Discover</span>
        </button>
        <button className={`nav-item ${tab === 'inbox' ? 'active' : ''}`} onClick={() => { setTab('inbox'); if (appUnlocked) setInboxCount(0); }}>
          {!appUnlocked ? <Lock size={20} /> : <InboxIcon size={22} />}
          <span>Inbox</span>
          {appUnlocked && inboxCount > 0 && <span className="nav-badge">{inboxCount}</span>}
        </button>
        <button className={`nav-item ${tab === 'matches' ? 'active' : ''}`} onClick={() => setTab('matches')}>
          {!appUnlocked ? <Lock size={20} /> : <MessageCircle size={22} />}
          <span>Matches</span>
        </button>
        <button className={`nav-item ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          <User size={22} />
          <span>Profile</span>
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user && (location.pathname === '/' || location.pathname === '/onboarding')) {
      navigate('/app');
    }
  }, [user, loading, location, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <MainApp /> : <Welcome />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/app" element={user ? <MainApp /> : <Welcome />} />
      <Route path="*" element={user ? <MainApp /> : <Welcome />} />
    </Routes>
  );
}

export default AppContent;
