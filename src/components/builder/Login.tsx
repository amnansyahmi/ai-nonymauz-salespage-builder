'use client';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { Logo } from './ui';

export default function Login() {
  const params = useSearchParams();
  const asked = params.get('next') || '/dashboard';
  const next = asked.startsWith('/') && !asked.startsWith('//') ? asked : '/dashboard';
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(params.get('error') ? 'error' : 'idle');
  const [msg, setMsg] = useState(params.get('error') ? 'That sign-in link has expired. Send a new one.' : '');
  const callbackURL = () => `${window.location.origin}${next}`;

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setState('error'); setMsg('Enter a valid email address, like nama@gmail.com.'); return; }
    setState('sending');
    try {
      const { error } = await authClient().signIn.magicLink({ email, callbackURL: callbackURL() });
      if (error) { setState('error'); setMsg(error.message || 'Could not send the link. Try again.'); } else setState('sent');
    } catch {
      setState('error'); setMsg('Could not reach the server. Check your connection and try again.');
    }
  }
  async function google() {
    try {
      const { error } = await authClient().signIn.social({ provider: 'google', callbackURL: callbackURL() });
      if (error) { setState('error'); setMsg(error.message || 'Google sign-in failed. Try the email link instead.'); }
    } catch {
      setState('error'); setMsg('Could not reach the server. Check your connection and try again.');
    }
  }

  return (
    <div className="v-login">
      <main className="login-card">
        <div className="wordmark"><Logo />Nonymauz</div>
        <h1>Log in to your salespages</h1>
        {state === 'sent' ? (
          <p className="login-sent">Check <b>{email}</b>. We sent you a link to log in. You can close this tab.</p>
        ) : (
          <>
            <button type="button" className="btn wide" onClick={google}>
              <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" stroke="none" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" /><path fill="#34A853" stroke="none" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" /><path fill="#FBBC05" stroke="none" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z" /><path fill="#EA4335" stroke="none" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" /></svg>
              Continue with Google
            </button>
            <div className="or"><span>or</span></div>
            <form onSubmit={sendLink} className="form" noValidate>
              <div className="fld">
                <label className="fld-label" htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={msg ? 'login-msg' : undefined} />
              </div>
              <button type="submit" className="btn primary wide" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Email me a login link'}</button>
            </form>
            {state === 'error' && <p id="login-msg" className="login-err" role="alert">{msg}</p>}
          </>
        )}
        <p className="fine">No password needed. New here? The same link creates your account.</p>
      </main>
    </div>
  );
}
