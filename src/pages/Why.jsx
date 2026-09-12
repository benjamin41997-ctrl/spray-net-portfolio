import { content, statistics } from '../data/content';
import { brand } from '../data/brand';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import Photo from '../components/Photo';
export default function Why({ article }) {
  if (article) {
    const next = content[(content.indexOf(article) + 1) % content.length];
    return (
      <>
        <PageHeader
          back="/why"
          backLabel="Why Spray-Net"
          eyebrow="THE SPRAY-NET DIFFERENCE"
          title={article.title}
          description={article.subtitle}
        />
        <article className="info-article">
          <div className="article-icon">
            <Icon name={article.icon} size={36} />
          </div>
          <h2>{article.intro}</h2>
          {article.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {article.steps && (
            <ol className="process-steps">
              {article.steps.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{step}</strong>
                </li>
              ))}
            </ol>
          )}
          {article.comparison && (
            <div
              className="comparison-table"
              role="table"
              aria-label="The Spray-Net refinishing approach"
            >
              <div role="row" className="comparison-table-header">
                <span role="columnheader">The system</span>
                <span role="columnheader">The Spray-Net approach</span>
              </div>
              {article.comparison.map((row) => (
                <div role="row" key={row.topic}>
                  <strong role="cell">{row.topic}</strong>
                  <span role="cell">{row.question}</span>
                </div>
              ))}
            </div>
          )}
          <div className="article-note">
            <Icon name="quote" />
            <p>
              Your home is unique. Your representative is here to answer questions about your
              specific project.
            </p>
          </div>
        </article>
        <a className="next-article" href={`#/why/${next.id}`}>
          <div>
            <span className="eyebrow">KEEP EXPLORING</span>
            <h3>{next.title}</h3>
          </div>
          <Icon name="arrow" size={26} />
        </a>
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="CUSTOM CHEMISTRY. SMARTER PAINTING."
        title={brand.differenceTitle}
        description="Factory-quality results with the convenience of on-site painting."
      />
      <section className="why-hero">
        <div>
          <p className="eyebrow">FROM FORMULATION TO APPLICATION</p>
          <h2>{brand.campaignHeadline}</h2>
          <p>Proprietary coatings. Specialized spray application. An alternative to replacement.</p>
        </div>
        <Photo
          src="media/projects/white-kitchen-detail.svg"
          alt="Illustration of white cabinetry and warm brass details"
        />
      </section>
      <div className="info-grid">
        {content.map((item, index) => (
          <a href={`#/why/${item.id}`} className="info-card" key={item.id}>
            <div className="info-card-top">
              <Icon name={item.icon} size={27} />
              <span>{String(index + 1).padStart(2, '0')}</span>
            </div>
            <h2>{item.title}</h2>
            <p>{item.subtitle}</p>
            <Icon className="info-card-arrow" name="arrow" size={21} />
          </a>
        ))}
      </div>
      <section className="stats-strip" aria-label="Spray-Net service highlights">
        {statistics.map((stat) => (
          <div key={stat.label}>
            <strong>{stat.value}</strong>
            <h3>{stat.label}</h3>
            <p>{stat.detail}</p>
          </div>
        ))}
      </section>
    </>
  );
}
