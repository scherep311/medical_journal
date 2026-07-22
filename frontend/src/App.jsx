import { useState } from 'react';
import Journal from './pages/Journal';
import Statistics from './pages/Statistics';
import Services from './pages/Services';
import { loginRequest } from './api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [role, setRole] = useState(localStorage.getItem('user_role'));
  const [page, setPage] = useState('journal');
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const data = await loginRequest(authData.username, authData.password);

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user_role', data.role);

      setToken(data.access);
      setRole(data.role);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setAuthData({ username: '', password: '' });
    setLoginError('');
  };

  if (!token) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>Журнал заявок</h1>
          {loginError && <p className="state-message state-error">{loginError}</p>}
          <div className="field">
            <label>Логин</label>
            <input
              className="input"
              type="text"
              required
              value={authData.username}
              onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Пароль</label>
            <input
              className="input"
              type="password"
              required
              value={authData.password}
              onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loggingIn}>
            {loggingIn ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Журнал заявок</h1>
        <nav className="nav">
          <button type="button" className={page === 'journal' ? 'active' : ''} onClick={() => setPage('journal')}>
            Журнал
          </button>
          <button type="button" className={page === 'stats' ? 'active' : ''} onClick={() => setPage('stats')}>
            Статистика
          </button>
          
          <button type="button" className={page === 'services' ? 'active' : ''} onClick={() => setPage('services')}>
            Услуги
          </button>
          
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            Выйти
          </button>
        </nav>
      </header>

      <main>
        {page === 'journal' && <Journal role={role} />}
        {page === 'stats' && <Statistics />}
        {page === 'services' && <Services role={role} />}
      </main>
    </div>
  );
}
