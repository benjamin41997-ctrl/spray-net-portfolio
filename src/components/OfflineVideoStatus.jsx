import { useSyncExternalStore } from 'react';
import { getOfflineVideos, subscribeOfflineVideos, prepareOfflineVideos, localVideos } from '../lib/offlineVideos';
import { useOnline } from '../hooks/useOnline';

export default function OfflineVideoStatus({ compact = false }) {
  const status = useSyncExternalStore(subscribeOfflineVideos, getOfflineVideos);
  const online = useOnline();
  const ready = status.savedUrls.length === localVideos.length;
  if (compact) return <span className="offline-video-summary">{ready ? 'Local Videos Ready Offline' : status.phase === 'saving' ? 'Saving Offline Videos…' : 'Videos Not Yet Saved Offline'}</span>;
  return <section className="offline-video-panel" aria-label="Offline video setup">
    <h2>{ready ? 'Local Videos Ready Offline' : status.phase === 'saving' ? 'Saving Videos on This Device' : 'Offline Video Setup'}</h2>
    <p>{status.savedUrls.length} of {localVideos.length} local films saved · {Math.min(status.loadedBytes / 1048576, status.totalBytes / 1048576).toFixed(1)} / {(status.totalBytes / 1048576).toFixed(1)} MB</p>
    {status.phase === 'saving' && <progress aria-label="Saving offline videos" value={status.loadedBytes} max={status.totalBytes || 1} />}
    <p>{ready ? 'These local films play without internet. YouTube films require a connection.' : 'Keep the app open online until both local films are saved. YouTube films require a connection.'}</p>
    {!!status.error && <p role="status">{status.error}</p>}
    {!ready && status.phase !== 'saving' && <button className="button" disabled={!online || status.phase === 'unsupported'} onClick={() => prepareOfflineVideos({ retry:true })}>Retry Offline Video Setup</button>}
  </section>;
}
