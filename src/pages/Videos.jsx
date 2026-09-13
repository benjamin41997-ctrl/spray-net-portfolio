import { videos } from '../data/videos';
import PageHeader from '../components/PageHeader';
import Photo from '../components/Photo';
import Icon from '../components/Icon';
import VideoPlayer from '../components/VideoPlayer';
export default function Videos({ video }) {
  if (video)
    return (
      <>
        <PageHeader
          back="/videos"
          backLabel="Process videos"
          eyebrow={video.eyebrow}
          title={video.title}
          description={video.description}
        />
        <div className="video-detail">
          <VideoPlayer video={video} key={video.id} />
          <p className="video-detail-note">
            {video.note ||
              (video.type === 'local'
                ? 'Process film'
                : 'Online video · Internet connection required')}
          </p>
        </div>
      </>
    );
  return (
    <>
      <PageHeader
        eyebrow="BEHIND THE TRANSFORMATION"
        title="From Formulation to Application."
        description="Explore the preparation and specialized spray application behind a Spray-Net transformation."
      />
      {!videos.length && (
        <section className="empty-state">
          <h2>More films to come.</h2>
          <p>Your representative can walk you through the process.</p>
        </section>
      )}
      <div className="videos-grid">
        {videos.map((video) => (
          <a className="video-card" href={`#/videos/${video.id}`} key={video.id}>
            <div className="video-card-image">
              <Photo src={video.thumbnail} alt="" />
              <span className="play-button">
                <Icon name="play" size={27} />
              </span>
              <span className="duration">{video.duration}</span>
            </div>
            <div className="video-card-copy">
              <p className="eyebrow">{video.eyebrow}</p>
              <h2>{video.title}</h2>
              <p>{video.description}</p>
              <span className="text-link">
                {video.url ? 'Watch the film' : 'Explore the preview'}
                <Icon name="arrow" size={18} />
              </span>
            </div>
          </a>
        ))}
      </div>
      <div className="quiet-note">
        <Icon name="layers" size={20} />
        <p>
          Curious about a particular surface? Your representative can explain the process for your
          home.
        </p>
      </div>
    </>
  );
}
