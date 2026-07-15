'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, KeyRound, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import Spinner from '@/components/Spinner';

import { getApiUrl } from '@/lib/api';
import { isTokenExpired, clearSession } from '@/lib/auth';
import type { StoredUser } from '@/lib/auth';

type AlertType = 'danger' | 'success';

export default function LoginPage() {
  const router = useRouter();

  // ── Login form state ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: AlertType } | null>(null);

  // ── Forgot password modal state ──
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotAlert, setForgotAlert] = useState<{
    message: string;
    type: AlertType | 'warning';
  } | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // ── Auto-redirect if already logged in ──
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !isTokenExpired(token)) {
      router.replace('/dashboard');
    } else {
      clearSession();
    }
  }, [router]);

  // ── Reset forgot state when dialog closes ──
  function handleForgotOpenChange(open: boolean) {
    setForgotOpen(open);
    if (open) {
      setForgotEmail('');
      setForgotAlert(null);
      setForgotSuccess(false);
    }
  }

  // ── Login handler (lógica idéntica a la versión Bootstrap) ──
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
          data.message ||
          data.error ||
          payload.message ||
          payload.error ||
          'Login fallido. Comprueba tus credenciales.';
        setAlert({ message: errMsg, type: 'danger' });
      }
    } catch {
      setAlert({ message: 'Error de conexión. Inténtalo de nuevo.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot password handler (lógica idéntica) ──
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
      try {
        data = JSON.parse(text);
      } catch {
        /* no JSON body */
      }

      if (response.ok) {
        setForgotAlert({
          message:
            data.message ||
            'En breves recibirás un correo con el enlace para restablecer tu contraseña.',
          type: 'success',
        });
        setForgotSuccess(true);
      } else {
        setForgotAlert({
          message:
            data.message || data.error || 'No se pudo enviar el correo. Comprueba la dirección.',
          type: 'danger',
        });
      }
    } catch {
      setForgotAlert({ message: 'Error de conexión. Inténtalo de nuevo.', type: 'danger' });
    } finally {
      setForgotLoading(false);
    }
  }

  // ── Helper para mapear tipo de alert (danger/warning) a variant de shadcn ──
  function alertVariant(type: AlertType | 'warning'): 'default' | 'destructive' {
    return type === 'danger' ? 'destructive' : 'default';
  }

  return (
    <div
      className="flex-1 w-full min-h-screen flex items-center justify-center bg-repeat"
      style={{
        backgroundImage: "url('/img/Fondo-factoria-f5-color.png')",
        backgroundSize: '150px 150px',
      }}
    >
      <div className="w-full max-w-md m-4 bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header naranja con logo F5 + Bootcamp Manager */}
        <div className="bg-crok text-white text-center p-5">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/img/logo-factoria-b.svg"
              alt="Factoría F5"
              width={120}
              height={56}
              className="h-14 w-auto"
              style={{ height: 'auto', maxHeight: 56 }}
              priority
            />
            <span className="font-bold text-2xl leading-tight tracking-tight text-left">
              Bootcamp
              <br />
              Manager
            </span>
          </div>
        </div>

        {/* Título decorativo */}
        <h2 className="text-crok text-center font-decorative text-xl pt-5 pb-1 m-0">
          preparate para dar el salto...
        </h2>

        {/* Form login */}
        <form onSubmit={handleLogin} noValidate className="px-10 pt-2 pb-10 space-y-5">
          {alert && (
            <Alert variant={alertVariant(alert.type)}>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-text">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="username"
              placeholder="tu.correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-text">
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Introduce tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-text-muted hover:text-crok hover:bg-transparent"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
            <p className="text-xs text-text-muted">Usa tu contraseña asignada</p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-crok hover:bg-crok-hover text-crok-on h-11"
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                <span>Accediendo...</span>
              </>
            ) : (
              'Iniciar sesión'
            )}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              className="text-text-muted text-xs p-0 h-auto"
              onClick={() => handleForgotOpenChange(true)}
            >
              <KeyRound className="mr-1 h-3 w-3" />
              ¿Has olvidado tu contraseña?
            </Button>
          </div>
        </form>
      </div>

      {/* ── Forgot password Dialog (reemplaza Bootstrap Modal) ── */}
      <Dialog open={forgotOpen} onOpenChange={handleForgotOpenChange}>
        <DialogContent className="max-w-[420px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="bg-crok text-white p-4 space-y-0">
            <DialogTitle className="text-white font-bold flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Restablecer contraseña
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 py-4 space-y-3">
            <p className="text-text-muted text-sm">
              Introduce tu dirección de correo electrónico y te enviaremos un enlace para
              restablecer tu contraseña.
            </p>

            {forgotAlert && (
              <Alert variant={alertVariant(forgotAlert.type)}>
                <AlertDescription>{forgotAlert.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="forgot-email">Correo electrónico</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="tu.correo@ejemplo.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                disabled={forgotSuccess}
                onKeyDown={(e) => e.key === 'Enter' && sendForgotPassword()}
              />
            </div>
          </div>

          <DialogFooter className="px-4 pb-4 pt-0 gap-2 sm:gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="flex-1">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="flex-1 bg-crok hover:bg-crok-hover text-crok-on"
              onClick={sendForgotPassword}
              disabled={forgotLoading || forgotSuccess}
            >
              {forgotLoading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Send className="mr-1 h-3 w-3" />
                  Enviar enlace
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
