import { useState, useEffect, useRef, useCallback } from 'react';
import { startDeployment, getDeployStatus } from '../lib/api.js';

// ─── useDeployment ────────────────────────────────
// Gère le cycle de vie complet d'un déploiement :
// lancement → polling → succès/erreur
export function useDeployment() {
  const [phase, setPhase] = useState('idle'); // idle | deploying | polling | success | error
  const [deploymentId, setDeploymentId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const deploy = useCallback(async (payload) => {
    setPhase('deploying');
    setError(null);
    setStatus(null);

    try {
      const result = await startDeployment(payload);
      setDeploymentId(result.deploymentId);
      setPhase('polling');
      poll(result.deploymentId);
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  }, []);

  function poll(id, delay = 2000) {
    pollRef.current = setTimeout(async () => {
      try {
        const s = await getDeployStatus(id);
        setStatus(s);

        if (s.status === 'success') {
          setPhase('success');
        } else if (s.status === 'failed') {
          setError(s.errorMessage || 'Déploiement échoué');
          setPhase('error');
        } else {
          poll(id, 2000); // continue polling
        }
      } catch {
        poll(id, 4000); // retry on network error
      }
    }, delay);
  }

  const retry = useCallback((payload) => {
    setPhase('idle');
    setDeploymentId(null);
    setStatus(null);
    setError(null);
    deploy(payload);
  }, [deploy]);

  return { phase, deploymentId, status, error, deploy, retry };
}

// ─── useLocalStorage ─────────────────────────────
// Persiste l'état du wizard pour reprendre en cas de fermeture
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore (private mode / quota)
    }
  }, [key, value]);

  return [value, setValue];
}

// ─── useTelegramUser ─────────────────────────────
export function useTelegramUser() {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  return {
    id: user?.id,
    firstName: user?.first_name,
    lastName: user?.last_name,
    username: user?.username,
    photoUrl: user?.photo_url,
    isAvailable: !!tg,
  };
}
