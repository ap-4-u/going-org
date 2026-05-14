import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { Send, ArrowLeft } from 'lucide-react';
import io from 'socket.io-client';
import './Chat.css';

let socket;

export default function Chat({ matchId, partnerName, partnerPic, onBack }) {
  const { user, API } = useUser();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    socket = io(API);
    socket.emit('register', user.id);

    socket.on('new_message', (msg) => {
      if (msg.match_id === matchId) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => { socket.disconnect(); };
  }, [user, API, matchId]);

  useEffect(() => {
    fetch(`${API}/api/messages/${matchId}`)
      .then(r => r.json())
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [matchId, API]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');

    try {
      await fetch(`${API}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, senderId: user.id, text: trimmed }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr + 'Z');
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>
        <img src={`${API}/uploads/${partnerPic}`} alt="" className="chat-partner-pic" />
        <h3>{partnerName}</h3>
      </div>

      <div className="chat-messages">
        {loading ? (
          <div className="loading-center"><div className="loading-spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <p>You matched! Send the first message 💬</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`chat-bubble ${msg.sender_id === user.id ? 'mine' : 'theirs'}`}
            >
              <p>{msg.text}</p>
              <span className="bubble-time">{formatTime(msg.created_at)}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          className="chat-input"
        />
        <button className="send-btn" onClick={send} disabled={!text.trim()}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
