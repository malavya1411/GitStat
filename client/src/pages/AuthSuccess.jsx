import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('gitstat_token', token);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center" style={{ background: 'var(--gs-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 rounded-full border-2 border-t-transparent spin"
          style={{ borderColor: 'var(--gs-green)', borderTopColor: 'transparent' }}
        />
        <span className="font-mono-gs text-xs uppercase tracking-widest" style={{ color: 'var(--gs-text-2)' }}>
          Signing in…
        </span>
      </div>
    </div>
  );
}
