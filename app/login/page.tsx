'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Spinner from '@/components/Spinner';
import { getApiUrl } from '@/lib/api';
import { isTokenExpired, clearSession } from '@/lib/auth';
import type { StoredUser } from '@/lib/auth';
import styles from './page.module.css';

type AlertType = 'danger' | 'success';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: AlertType } | null>(null);

  // Forgot password modal state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotAlert, setForgotAlert] = useState<{ message: string; type: AlertType | 'warning' } | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const forgotModalRef = useRef<HTMLDivElement>(null);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !isTokenExpired(token)) {
      router.replace('/dashboard');
    } else {
      clearSession();
    }
  }, [router]);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email || !password) {
      setAlert({ message: 'Por favor introduce tu email y contraseña.', type: 'danger' });
      return;
    }
    setAlert(null);
    setLoading(true);

    try {
      const base = getApiUrl();
      const response = await fetch(`${base}/api/auth/external-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      const payload = data.data || data;
      const token: string = payload.token;
      const loginOk = data.success !== false && !!token;

      if (loginOk && token) {
        const roles: string[] = Array.isArray(payload.roles) ? payload.roles : [];

        let role = 'teacher';
        if (
          roles.includes('ROLE_SUPER_ADMIN') ||
          roles.includes('ROLE_SUPERADMIN') ||
          (roles.includes('ROLE_USER') && roles.includes('ROLE_ADMIN'))
        ) {
          role = 'superadmin';
        }

        const user: StoredUser = {
          id: payload.email || payload.userId || '',
          userId: payload.userId || payload.id || '',
          name: payload.name || payload.email || '',
          email: payload.email || '',
          role,
        };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('role', role);

        // Resolve local DB UUID
        try {
          const meRes = await fetch(`${base}/api/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            user.id = meData.id;
            if (meData.userRole) user.userRole = meData.userRole;
            localStorage.setItem('user', JSON.stringify(user));
          }
        } catch {
          // Non-blocking — proceed with external user ID
        }

        setAlert({ message: '¡Acceso correcto! Redirigiendo...', type: 'success' });
        setTimeout(() => router.push('/dashboard'), 1000);
      } else {
        const errMsg =
          data.message || data.error || payload.message || payload.error || 'Login fallido. Comprueba tus credenciales.';
        setAlert({ message: errMsg, type: 'danger' });
      }
    } catch {
      setAlert({ message: 'Error de conexión. Inténtalo de nuevo.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  }

  function openForgotModal() {
    setForgotEmail('');
    setForgotAlert(null);
    setForgotSuccess(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bs = (window as any).bootstrap;
    if (bs?.Modal && forgotModalRef.current) {
      new bs.Modal(forgotModalRef.current).show();
    }
  }

  async function sendForgotPassword() {
    if (!forgotEmail.trim()) {
      setForgotAlert({ message: 'Por favor, introduce tu correo electrónico.', type: 'warning' });
      return;
    }
    setForgotAlert(null);
    setForgotLoading(true);

    try {
      const base = getApiUrl();
      const response = await fetch(`${base}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      let data: Record<string, string> = {};
      const text = await response.text();
      try { data = JSON.parse(text); } catch { /* no JSON body */ }

      if (response.ok) {
        setForgotAlert({
          message: data.message || 'En breves recibirás un correo con el enlace para restablecer tu contraseña.',
          type: 'success',
        });
        setForgotSuccess(true);
      } else {
        setForgotAlert({
          message: data.message || data.error || 'No se pudo enviar el correo. Comprueba la dirección.',
          type: 'danger',
        });
      }
    } catch {
      setForgotAlert({ message: 'Error de conexión. Inténtalo de nuevo.', type: 'danger' });
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className={styles.body}>
      <div className={styles.loginContainer}>
        {/* Header */}
        <div className={styles.logoSection}>
          <div className={styles.brandRow}>
            <Image
              src="/img/logo-factoria-b.svg"
              alt="Factoría F5"
              width={120}
              height={50}
              className={styles.brandLogo}
              priority
            />
            <span className={styles.brandName}>Bootcamp<br />Manager</span>
          </div>
        </div>

        <h2 className={styles.welcomeTitle}>preparate para dar el salto...</h2>

        {/* Alerts */}
        {alert && (
          <div className={`alert alert-${alert.type} mx-4 mt-3`} role="alert">
            {alert.message}
          </div>
        )}

        {/* Login form */}
        <form id="login-form" className={styles.loginForm} onSubmit={handleLogin} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email
            </label>
            <input
              type="email"
              id="email"
              className={styles.formControl}
              placeholder="tu.correo@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Contraseña
            </label>
            <div className={styles.passwordInputGroup}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={styles.formControl}
                placeholder="Introduce tu contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
            <div className={styles.helpText}>Usa tu contraseña asignada</div>
          </div>

          <button type="submit" className={styles.btnLogin} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" />
                <span>Accediendo...</span>
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>

          <div className="text-center mt-3">
            <button
              type="button"
              className="btn btn-link text-muted p-0"
              style={{ fontSize: '0.85rem', textDecoration: 'none' }}
              onClick={openForgotModal}
            >
              <i className="bi bi-key me-1" />
              ¿Has olvidado tu contraseña?
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      <div
        className="modal fade"
        id="forgotPasswordModal"
        tabIndex={-1}
        aria-labelledby="forgotPasswordModalLabel"
        aria-hidden="true"
        ref={forgotModalRef}
      >
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
          <div className="modal-content border-0 shadow" style={{ borderRadius: 12, overflow: 'hidden' }}>
            <div className="modal-header border-0" style={{ background: 'var(--principal-1)' }}>
              <h5 className="modal-title text-white fw-bold" id="forgotPasswordModalLabel">
                <i className="bi bi-key me-2" />
                Restablecer contraseña
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" />
            </div>

            <div className="modal-body px-4 py-4">
              <p className="text-muted small mb-3">
                Introduce tu dirección de correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              {forgotAlert && (
                <div className={`alert alert-${forgotAlert.type} mb-3`} role="alert">
                  {forgotAlert.message}
                </div>
              )}

              <div className="form-group mb-0">
                <label htmlFor="forgot-email" className="form-label">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id="forgot-email"
                  className="form-control"
                  placeholder="tu.correo@ejemplo.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  disabled={forgotSuccess}
                  onKeyDown={e => e.key === 'Enter' && sendForgotPassword()}
                />
              </div>
            </div>

            <div className="modal-footer border-0 px-4 pb-4 pt-0 d-flex gap-2">
              <button type="button" className="btn btn-outline-secondary flex-grow-1" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button
                type="button"
                className="btn flex-grow-1 text-white fw-semibold"
                style={{ background: 'var(--principal-1)', border: 'none' }}
                onClick={sendForgotPassword}
                disabled={forgotLoading || forgotSuccess}
              >
                {forgotLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <i className="bi bi-send me-1" />
                    Enviar enlace
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
