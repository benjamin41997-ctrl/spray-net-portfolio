import { useEffect, useState } from 'react';
import { mediaUrl, youtubeEmbed } from '../lib/media';
import { useOnline } from '../hooks/useOnline';
import Photo from './Photo';
import Icon from './Icon';

export default function VideoPlayer({ video }) {
  const online = useOnline();
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [cached, setCached] = useState(false);
  const local = video.type === 'local';
  const embed = !local && youtubeEmbed(video.url);
  useEffect(() => {
    let active = true;
    if (local && 'caches' in window)
      caches
        .match(new URL(mediaUrl(video.url), location.href).href)
        .then((result) => {
          if (active) setCached(Boolean(result));
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [video.url, local, online]);
  useEffect(() => {
    setError(false);
    setPlaying(false);
  }, [online]);
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
        onClick={() => setPlaying(true)}
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
      preload="metadata"
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      poster={mediaUrl(video.thumbnail)}
      onError={() => setError(true)}
    >
      <source src={mediaUrl(video.url)} type="video/mp4" onError={() => setError(true)} />
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
