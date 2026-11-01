import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { mediaUrl, youtubeEmbed } from '../lib/media';
import { useOnline } from '../hooks/useOnline';
import Photo from './Photo';
import Icon from './Icon';
import { cachedVideo, getOfflineVideos, subscribeOfflineVideos } from '../lib/offlineVideos';

export default function VideoPlayer({ video }) {
  const online = useOnline();
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [cached, setCached] = useState(false);
  const [checked, setChecked] = useState(false);
  const [localSource, setLocalSource] = useState('');
  const savedVideos = useSyncExternalStore(subscribeOfflineVideos, getOfflineVideos);
  const objectUrl = useRef('');
  const mounted = useRef(true);
  const local = video.type === 'local';
  const embed = !local && youtubeEmbed(video.url);
  useEffect(() => {
    let active = true;
    if (local)
      cachedVideo(video)
        .then(async (result) => {
          if (result && !objectUrl.current) {
            const blob = await result.blob();
            if (!active) return;
            objectUrl.current = URL.createObjectURL(blob);
            setLocalSource(objectUrl.current);
          }
          if (active) { setCached(Boolean(result)); setChecked(true); }
        })
        .catch(() => { if (active) { setCached(false); setChecked(true); } });
    return () => {
      active = false;
    };
  }, [video.url, local, online, savedVideos.savedUrls]);
  useEffect(() => {
    if (online) setError(false);
  }, [online]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
  }, []);
  async function play() {
    if (localSource) { setPlaying(true); return; }
    if (local) {
      try {
        const response = await cachedVideo(video);
        if (response) {
          const blob = await response.blob();
          if (!mounted.current) return;
          if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
          objectUrl.current = URL.createObjectURL(blob);
          setLocalSource(objectUrl.current); setCached(true);
        }
      } catch { if (!online) { setError(true); return; } }
    }
    if (mounted.current) setPlaying(true);
  }
  if (!online && local && !checked) return <div className="video-message" role="status"><h3>Checking Saved Video…</h3></div>;
  const unavailable = !online && (!local || !cached);
  if (unavailable)
    return (
      <div className="video-message">
        <Icon name="offline" size={36} />
        <h3>Internet connection required to play this video</h3>
        <p>You can keep exploring projects, reviews, and our process offline.</p>
      </div>
    );
  if (error)
    return (
      <div className="video-message">
        <Icon name="play" size={36} />
        <h3>This video couldn’t be loaded</h3>
        <p>Check your connection or explore another part of the portfolio.</p>
        <button
          className="button"
          onClick={() => {
            setError(false);
            setPlaying(false);
          }}
        >
          Try again
        </button>
      </div>
    );
  if (!video.url || (!local && !embed))
    return (
      <div className="video-poster unavailable-poster">
        <Photo src={video.thumbnail} alt="" />
        <div>
          <Icon name="play" size={32} />
          <h3>Film coming soon</h3>
          <p>Your representative can walk you through the process.</p>
        </div>
      </div>
    );
  if (!playing)
    return (
      <button
        className="video-poster"
        onClick={play}
        aria-label={`Play ${video.title}`}
      >
        <Photo src={video.thumbnail} alt="" eager />
        <span className="play-button">
          <Icon name="play" size={28} />
        </span>
        <span className="poster-caption">{video.title}</span>
      </button>
    );
  return local ? (
    <video
      className="video-player"
      controls
      autoPlay
      playsInline
      crossOrigin="anonymous"
      preload="metadata"
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      poster={mediaUrl(video.thumbnail)}
      onError={() => setError(true)}
    >
      <source src={localSource || mediaUrl(video.url)} type="video/mp4" onError={() => setError(true)} />
      {video.captions && (
        <track
          kind="captions"
          src={mediaUrl(video.captions)}
          srcLang="en"
          label="English"
          default
        />
      )}
      Your browser does not support video playback.
    </video>
  ) : (
    <iframe
      className="video-player"
      src={embed}
      title={video.title}
      allow="autoplay; encrypted-media; fullscreen"
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-presentation"
      allowFullScreen
      onError={() => setError(true)}
    />
  );
}
