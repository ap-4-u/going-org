import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(null);

const API = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('going_user_id');
    if (saved) {
      fetch(`${API}/api/users/${saved}?self=${saved}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setUser(data); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('going_user_id', userData.id);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('going_user_id');
  };

  const refreshUser = async () => {
    if (!user) return;
    const r = await fetch(`${API}/api/users/${user.id}?self=${user.id}`);
    if (r.ok) {
      const data = await r.json();
      setUser(data);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser: login, logout, refreshUser, loading, API }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
