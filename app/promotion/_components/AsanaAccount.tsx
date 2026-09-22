'use client';

/**
 * AsanaAccount.tsx — conexión de la cuenta de Asana de cada docente.
 *
 * Vivía en Portal del estudiante › Acceso, junto a los enlaces de la promoción,
 * y ahí desentonaba por dos motivos: no es de la promoción sino de la persona,
 * y lo único para lo que sirve —exportar el roadmap— está en Planificación. Se
 * movió al menú "⋯" del roadmap, al lado de "Exportar a Asana".
 *
 * La lógica se saca a un hook porque quien la usa es un elemento de menú: el
 * menú se cierra al elegir, así que el estado y la espera del popup tienen que
 * vivir en el panel, que sigue montado.
 *
 * Fase 1 de docs/tasks/exportar-roadmap-asana.md.
 */

import { useCallback, useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return (typeof window !== 'undefined' ? window : {}) as unknown as any; }

export interface AsanaStatus {
  configured: boolean;
  connected: boolean;
  asanaName?: string | null;
  asanaEmail?: string | null;
}

export interface AsanaAccount {
  status: AsanaStatus | null;   // null = todavía comprobando
  busy: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useAsanaAccount(): AsanaAccount {
  const [status, setStatus] = useState<AsanaStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = (await w().asanaGetStatus?.()) as AsanaStatus | undefined;
      setStatus(s || { configured: false, connected: false });
    } catch {
      setStatus({ configured: false, connected: false });
    }
  }, []);

  useEffect(() => {
    refresh();
    // Al volver de la ventana de Asana la conexión puede haber cambiado.
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const connect = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const url = await w().asanaGetAuthorizeUrl?.();
      if (!url) throw new Error('sin_url');
      window.open(url, 'asana-oauth', 'width=620,height=780,noopener=no');

      // Se espera al aviso del callback (postMessage) o a que el estado cambie.
      const started = Date.now();
      const cleanup = () => { clearInterval(poll); window.removeEventListener('message', onMsg); };
      const onMsg = (e: MessageEvent) => {
        if (e?.data?.source === 'asana-oauth') { cleanup(); refresh().finally(() => setBusy(false)); }
      };
      const poll = setInterval(async () => {
        const s = (await w().asanaGetStatus?.()) as AsanaStatus | undefined;
        if (s?.connected || Date.now() - started > 120000) {
          cleanup();
          setStatus(s || null);
          setBusy(false);
          if (s?.connected) w().showToast?.('Tu cuenta de Asana ya está conectada.', 'success');
        }
      }, 2500);
      window.addEventListener('message', onMsg);
    } catch (e) {
      setBusy(false);
      w().showToast?.(
        (e as Error)?.message === 'asana_not_configured'
          ? 'La integración con Asana no está activada en el servidor.'
          : 'No se pudo iniciar la conexión con Asana.',
        'danger',
      );
    }
  }, [busy, refresh]);

  const disconnect = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await w().asanaDisconnect?.();
      w().showToast?.('Tu cuenta de Asana se ha desconectado.', 'success');
    } catch {
      w().showToast?.('No se pudo desconectar la cuenta de Asana.', 'danger');
    }
    await refresh();
    setBusy(false);
  }, [busy, refresh]);

  return { status, busy, connect, disconnect };
}

/** Cómo se llama la cuenta conectada, para enseñarlo en el menú. */
export function asanaAccountLabel(status: AsanaStatus | null): string {
  if (!status) return 'Comprobando…';
  if (!status.configured) return 'No activada en el servidor';
  if (!status.connected) return 'Sin conectar';
  return status.asanaEmail || status.asanaName || 'Conectada';
}
