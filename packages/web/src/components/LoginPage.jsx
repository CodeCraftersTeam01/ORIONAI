import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import OrionLogo from './OrionLogo';

export default function LoginPage({
  isInitialized = true,
  onLoginSuccess,
  theme = 'dark',
  onToggleTheme,
}) {
  const [isSetupMode, setIsSetupMode] = useState(!isInitialized);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Nama pengguna (username) wajib diisi.');
      return;
    }

    if (!password) {
      setErrorMessage('Password / PIN wajib diisi.');
      return;
    }

    if (isSetupMode) {
      if (password.length < 3) {
        setErrorMessage('Password / PIN minimal 3 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const endpoint = isSetupMode ? '/api/auth/setup' : '/api/auth/login';
      const payload = isSetupMode
        ? { username: username.trim(), password, confirmPassword }
        : { username: username.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Terjadi kesalahan (HTTP ${res.status})`);
      }

      if (data.data?.token) {
        localStorage.setItem('orion_auth_token', data.data.token);
        localStorage.setItem('orion_auth_user', data.data.username);
        onLoginSuccess?.(data.data.username, data.data.token);
      } else {
        throw new Error('Token sesi tidak diterima dari server.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Gagal memproses autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen-wrapper">
      {/* Top Controls Bar */}
      <div className="login-top-bar">
        <div className="login-top-meta">
          <span className="login-version-tag">Orion Agent v1.0</span>
        </div>
        {onToggleTheme && (
          <button
            type="button"
            className="login-theme-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}
      </div>

      {/* Main Centered Card */}
      <div className="login-card-container animate-page-enter">
        <div className="login-card">
          {/* Logo & Header */}
          <div className="login-card-header">
            <div className="login-logo-wrap">
              <OrionLogo size="md" />
            </div>

            <div className="login-badge-pill">
              <ShieldCheck size={12} className="login-badge-icon" />
              <span>{isSetupMode ? 'SETUP AKUN PERTAMA' : 'ORION GATEWAY'}</span>
            </div>

            <h1 className="login-heading">
              {isSetupMode ? 'Atur Akun Pengelola' : 'Masuk ke Orion'}
            </h1>
            <p className="login-subheading">
              {isSetupMode
                ? 'Sistem mendeteksi instalasi baru. Tetapkan nama pengguna dan password Anda.'
                : 'Akses dashboard cerdas, katalog model AI, dan percakapan kosmik Anda.'}
            </p>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="login-alert-box">
              <AlertCircle size={15} className="login-alert-icon" />
              <span className="login-alert-text">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Field: Username */}
            <div className="login-field-group">
              <label className="login-field-label" htmlFor="orion-username">
                Nama Pengguna
              </label>
              <div className="login-input-wrap">
                <User size={15} className="login-input-icon" />
                <input
                  id="orion-username"
                  type="text"
                  className="login-input"
                  placeholder="Contoh: arjuna"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Field: Password / PIN */}
            <div className="login-field-group">
              <label className="login-field-label" htmlFor="orion-password">
                {isSetupMode ? 'Password / PIN Baru' : 'Password / PIN'}
              </label>
              <div className="login-input-wrap">
                <KeyRound size={15} className="login-input-icon" />
                <input
                  id="orion-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Masukkan password atau PIN..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSetupMode ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Field: Confirm Password (Setup mode only) */}
            {isSetupMode && (
              <div className="login-field-group">
                <label className="login-field-label" htmlFor="orion-confirm-password">
                  Konfirmasi Password / PIN
                </label>
                <div className="login-input-wrap">
                  <Lock size={15} className="login-input-icon" />
                  <input
                    id="orion-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Ulangi password atau PIN..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="login-loading-row">
                  <span className="login-btn-spinner" />
                  <span>Memverifikasi...</span>
                </div>
              ) : (
                <div className="login-btn-content">
                  <span>{isSetupMode ? 'Simpan & Masuk' : 'Masuk ke Dashboard'}</span>
                  <ArrowRight size={14} className="login-btn-arrow" />
                </div>
              )}
            </button>
          </form>

          {/* Footer Card Info */}
          <div className="login-card-footer">
            <div className="login-security-tag">
              <CheckCircle2 size={12} className="login-secure-check" />
              <span>Diamankan dengan memori-kuat scrypt KDF</span>
            </div>
            {!isInitialized && !isSetupMode && (
              <button
                type="button"
                className="login-mode-switch"
                onClick={() => {
                  setErrorMessage('');
                  setIsSetupMode(true);
                }}
              >
                Atur akun baru pertama kali
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
