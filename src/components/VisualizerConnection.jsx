import { useState } from 'react';
import { connectTablet, forgetConnection } from '../lib/visualizerClient';

export default function VisualizerConnection({connected, online, onConnected, onForgotten}) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function activate(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { const result = await connectTablet(password); setPassword(''); onConnected(result); }
    catch (e) { setError(e.message || 'Unable to connect this tablet. Please try again.'); }
    finally { setBusy(false); }
  }
  function forget() {
    try { forgetConnection(); setPassword(''); setError(''); onForgotten(); }
    catch { setError('Unable to remove access. Please clear this site’s saved data in the browser settings.'); }
  }
  return <div className="viz-tablet-connection">
    {connected ? <><p role="status"><strong>Tablet Connected</strong> · Access is remembered on this tablet.</p><button className="viz-text-button" onClick={forget}>Forget This Tablet</button></> : <>
      <p>Enter your password once. This tablet will remember access for regular and custom previews.</p>
      <form className="viz-password-form" onSubmit={activate}>
        <label className="viz-label">Tablet Password<input type="password" autoComplete="current-password" autoCapitalize="none" spellCheck="false" value={password} required maxLength={128} onChange={event => setPassword(event.target.value)} /></label>
        <button className="button button-dark" disabled={busy || !online || !password.trim()}>{busy ? 'Connecting…' : 'Activate This Tablet'}</button>
      </form>
      {!online && <p>Connect to the internet to activate this tablet.</p>}
    </>}
    {error && <p className="viz-error" role="alert">{error}</p>}
  </div>;
}
