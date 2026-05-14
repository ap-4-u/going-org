import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Camera, ChevronRight, ChevronLeft, MapPin, User, Ghost, Phone, AtSign, Mail, Lock } from 'lucide-react';
import './Onboarding.css';

const CITIES = [
  'Wesley Chapel', 'Brandon', 'Trinity', 'New Port Richey', 'Tampa',
  'St. Petersburg', 'Clearwater', 'Riverview', 'Lutz', 'Land O\' Lakes',
  'Zephyrhills', 'Dade City', 'Spring Hill', 'Hudson', 'Tarpon Springs',
  'Dunedin', 'Palm Harbor', 'Safety Harbor', 'Oldsmar', 'Temple Terrace',
  'Plant City', 'Lakeland', 'Valrico', 'Seffner', 'Carrollwood',
  'Westchase', 'Citrus Park', 'Town \'n\' Country', 'Seminole', 'Largo'
];

const STATUS_OPTIONS = [
  { id: 'going', label: 'Going', color: 'var(--green)', emoji: '👀', desc: "Ready for action" },
  { id: 'trynna_hang', label: 'Trynna Hang First', color: 'var(--blue)', emoji: '💭', desc: 'Let me get to know you first' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [snapchat, setSnapchat] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const fileRef = useRef();
  const navigate = useNavigate();
  const { setUser, API } = useUser();

  const filteredCities = CITIES.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const addPhotos = (e) => {
    const files = Array.from(e.target.files);
    const total = photos.length + files.length;
    if (total > 5) return alert('Max 5 photos');
    const newPhotos = [...photos, ...files];
    const newPreviews = [...previews, ...files.map(f => URL.createObjectURL(f))];
    setPhotos(newPhotos);
    setPreviews(newPreviews);
  };

  const removePhoto = (idx) => {
    setPhotos(photos.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
  };

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const canNext = () => {
    switch (step) {
      case 0: return !!gender;
      case 1: return isValidEmail(email) && password.length >= 6 && password === confirmPassword;
      case 2: return name.trim().length >= 2 && age >= 16 && age <= 21;
      case 3: return !!city;
      case 4: return !!status;
      case 5: return photos.length >= 1;
      case 6: return true;
      default: return false;
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('email', email.trim().toLowerCase());
      fd.append('password', password);
      fd.append('name', name.trim());
      fd.append('age', age);
      fd.append('gender', gender);
      fd.append('city', city);
      fd.append('badge', 'none');
      fd.append('status', status);
      fd.append('bio', bio);
      fd.append('instagram', instagram);
      fd.append('snapchat', snapchat);
      fd.append('phone', phone);
      photos.forEach(p => fd.append('photos', p));

      const r = await fetch(`${API}/api/register`, { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);

      const fullUser = await fetch(`${API}/api/users/${data.id}?self=${data.id}`).then(r => r.json());
      setUser(fullUser);
      navigate('/app');
    } catch (err) {
      alert(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    // Step 0: Gender
    <div className="onboard-step fade-in" key="gender">
      <div className="step-icon">👋</div>
      <h2>Welcome to Going.org</h2>
      <p className="step-sub">First things first — are you a...</p>
      <div className="gender-options">
        <button
          className={`gender-card ${gender === 'female' ? 'selected' : ''}`}
          onClick={() => setGender('female')}
        >
          <span className="gender-emoji">👩</span>
          <span className="gender-label">Girl</span>
        </button>
        <button
          className={`gender-card ${gender === 'male' ? 'selected' : ''}`}
          onClick={() => setGender('male')}
        >
          <span className="gender-emoji">👨</span>
          <span className="gender-label">Guy</span>
        </button>
      </div>
    </div>,

    // Step 1: Email & Password
    <div className="onboard-step fade-in" key="auth">
      <div className="step-icon"><Lock size={32} /></div>
      <h2>Create your account</h2>
      <p className="step-sub">You'll use this to sign in</p>
      <div className="input-group">
        <label><Mail size={14} /> Email</label>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="text-input"
          autoFocus
        />
      </div>
      <div className="input-group">
        <label><Lock size={14} /> Password</label>
        <input
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="text-input"
        />
      </div>
      <div className="input-group">
        <label><Lock size={14} /> Confirm Password</label>
        <input
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="text-input"
        />
      </div>
      {email && !isValidEmail(email) && <p className="error-text">Enter a valid email</p>}
      {password && password.length < 6 && <p className="error-text">Password must be at least 6 characters</p>}
      {confirmPassword && password !== confirmPassword && <p className="error-text">Passwords don't match</p>}
    </div>,

    // Step 2: Name & Age
    <div className="onboard-step fade-in" key="name">
      <div className="step-icon"><User size={32} /></div>
      <h2>What's your name?</h2>
      <p className="step-sub">And how old are you?</p>
      <div className="input-group">
        <label>Name</label>
        <input
          type="text"
          placeholder="Your first name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="text-input"
          autoFocus
        />
      </div>
      <div className="input-group">
        <label>Age</label>
        <input
          type="number"
          placeholder="16-21"
          min="16"
          max="21"
          value={age}
          onChange={e => setAge(e.target.value)}
          className="text-input"
        />
      </div>
      {age && (age < 16 || age > 21) && <p className="error-text">Age must be between 16 and 21</p>}
    </div>,

    // Step 2: City
    <div className="onboard-step fade-in" key="city">
      <div className="step-icon"><MapPin size={32} /></div>
      <h2>Where are you located?</h2>
      <p className="step-sub">Pick your area in Tampa Bay</p>
      <input
        type="text"
        placeholder="Search cities..."
        value={citySearch}
        onChange={e => setCitySearch(e.target.value)}
        className="text-input search-input"
      />
      <div className="city-grid">
        {filteredCities.map(c => (
          <button
            key={c}
            className={`city-chip ${city === c ? 'selected' : ''}`}
            onClick={() => setCity(c)}
          >
            <MapPin size={14} />
            {c}
          </button>
        ))}
      </div>
    </div>,

    // Step 4: Status
    <div className="onboard-step fade-in" key="status">
      <div className="step-icon">🚦</div>
      <h2>What's your status?</h2>
      <p className="step-sub">Let people know where you're at</p>
      <div className="badge-options">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.id}
            className={`badge-card ${status === s.id ? 'selected' : ''}`}
            onClick={() => setStatus(s.id)}
            style={{ '--badge-color': s.color }}
          >
            <span className="badge-emoji">{s.emoji}</span>
            <div>
              <span className="badge-label">{s.label}</span>
              <span className="badge-desc">{s.desc}</span>
            </div>
            <div className="badge-indicator" style={{ background: s.color }} />
          </button>
        ))}
      </div>
    </div>,

    // Step 5: Photos
    <div className="onboard-step fade-in" key="photos">
      <div className="step-icon"><Camera size={32} /></div>
      <h2>Add your photos</h2>
      <p className="step-sub">Upload 1 profile pic + up to 4 more</p>
      <div className="photo-grid">
        {[0,1,2,3,4].map(i => (
          <div
            key={i}
            className={`photo-slot ${i === 0 ? 'main' : ''} ${previews[i] ? 'has-photo' : ''}`}
            onClick={() => { if (!previews[i]) fileRef.current.click(); }}
          >
            {previews[i] ? (
              <>
                <img src={previews[i]} alt="" />
                <button className="remove-photo" onClick={(e) => { e.stopPropagation(); removePhoto(i); }}>×</button>
                {i === 0 && <span className="photo-label">Profile</span>}
              </>
            ) : (
              <div className="photo-placeholder">
                <Camera size={24} />
                <span>{i === 0 ? 'Profile pic' : 'Add'}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={addPhotos}
        style={{ display: 'none' }}
      />
    </div>,

    // Step 5: Socials & Bio
    <div className="onboard-step fade-in" key="socials">
      <div className="step-icon">🔗</div>
      <h2>Almost done!</h2>
      <p className="step-sub">Add your socials (optional — shown after matching)</p>
      <div className="input-group">
        <label><AtSign size={16} /> Instagram</label>
        <input
          type="text"
          placeholder="@yourhandle"
          value={instagram}
          onChange={e => setInstagram(e.target.value)}
          className="text-input"
        />
      </div>
      <div className="input-group">
        <label><Ghost size={16} /> Snapchat</label>
        <input
          type="text"
          placeholder="Your snap username"
          value={snapchat}
          onChange={e => setSnapchat(e.target.value)}
          className="text-input"
        />
      </div>
      <div className="input-group">
        <label><Phone size={16} /> Phone Number</label>
        <input
          type="tel"
          placeholder="(optional)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="text-input"
        />
      </div>
      <div className="input-group">
        <label>Bio</label>
        <textarea
          placeholder="Tell people about yourself..."
          value={bio}
          onChange={e => setBio(e.target.value)}
          className="text-input bio-input"
          rows={3}
        />
      </div>
    </div>,
  ];

  return (
    <div className="onboarding-page">
      <div className="onboard-header">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="step-counter">Step {step + 1} of {steps.length}</div>
      </div>

      <div className="onboard-body">
        {steps[step]}
      </div>

      <div className="onboard-footer">
        {step > 0 && (
          <button className="btn-secondary back-btn" onClick={() => setStep(step - 1)}>
            <ChevronLeft size={20} /> Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button
            className="btn-primary next-btn"
            disabled={!canNext()}
            onClick={() => setStep(step + 1)}
          >
            Continue <ChevronRight size={20} />
          </button>
        ) : (
          <button
            className="btn-primary next-btn"
            disabled={submitting || !canNext()}
            onClick={submit}
          >
            {submitting ? 'Creating profile...' : 'Create Profile 🚀'}
          </button>
        )}
      </div>
    </div>
  );
}
