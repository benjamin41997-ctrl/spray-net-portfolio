import { brand } from '../data/brand';
import Icon from '../components/Icon';
import BrandEmblem from '../components/BrandEmblem';
import Photo from '../components/Photo';

export default function Home() {
  return (
    <>
      <section className="home-intro">
        <div>
          <p className="eyebrow">
            <span className="tiny-line" />
            THE SPRAY-NET DIFFERENCE
          </p>
          <h1 tabIndex={-1}>
            {brand.taglineLines[0]}
            <br />
            <span>{brand.taglineLines[1]}</span>
          </h1>
        </div>
        <p>
          {brand.campaignHeadline}
          <span>Exterior &amp; kitchen cabinet refinishing.</span>
        </p>
      </section>
      <section className="home-cards" aria-label="Explore the portfolio">
        <a className="visual-card cabinet-card" href="#/projects?collection=cabinets">
          <Photo
            src="media/projects/chantilly-lace-kitchen/after.webp"
            alt="Spray-Net kitchen refinished in Chantilly Lace"
            eager
          />
          <span className="card-kicker">FACTORY-QUALITY FINISH</span>
          <div className="visual-card-bottom">
            <div>
              <span className="small-caps">01 / THE INTERIOR</span>
              <h2>
                Kitchen/Bathroom
                <br />
                Cabinets
              </h2>
              <p>{brand.kitchenHeadline}</p>
            </div>
            <span className="circle-link">
              <Icon name="arrow" size={26} />
            </span>
          </div>
        </a>
        <a className="visual-card exterior-card" href="#/projects?collection=exterior">
          <Photo
            src="media/projects/white-brick-stucco/after.webp"
            alt="Spray-Net home with white masonry and dark accents"
            eager
          />
          <div className="visual-card-bottom">
            <div>
              <span className="small-caps">02 / THE EXTERIOR</span>
              <h2>
                Exterior
                <br />
                Transformations
              </h2>
              <p>A factory-quality finish. An alternative to replacement.</p>
            </div>
            <span className="circle-link">
              <Icon name="arrow" size={26} />
            </span>
          </div>
        </a>
        <a className="small-nav-card review-nav" href="#/reviews">
          <span className="nav-card-icon">
            <BrandEmblem size={36} />
          </span>
          <div>
            <span className="small-caps">IN THEIR WORDS</span>
            <h2>Customer Reviews</h2>
            <p>Hear From Our Customers.</p>
          </div>
          <Icon name="arrow" />
        </a>
        <a className="small-nav-card video-nav" href="#/videos">
          <span className="nav-card-icon">
            <Icon name="play" size={24} />
          </span>
          <div>
            <span className="small-caps">BEHIND THE TRANSFORMATION</span>
            <h2>Process Videos</h2>
            <p>From Formulation to Application.</p>
          </div>
          <Icon name="arrow" />
        </a>
        <a className="small-nav-card why-nav" href="#/why">
          <span className="nav-card-icon">
            <Icon name="sparkles" size={25} />
          </span>
          <div>
            <span className="small-caps">THE SPRAY-NET DIFFERENCE</span>
            <h2>Why Spray-Net</h2>
            <p>Custom Chemistry. Factory-Quality Results.</p>
          </div>
          <Icon name="arrow" />
        </a>
      </section>
    </>
  );
}
