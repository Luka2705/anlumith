import { ShoppingBag } from 'lucide-react';
import { products } from '../site.js';

export default function Home() {
  return <main id="inhalt" className="wrap">
    <section className="hero" aria-labelledby="hero-title">
      <p className="eyebrow">Unabhängige Software. Von ANLUMITH.</p>
      <h1 id="hero-title"><span className="hero-title-line">Gute Ideen.</span>{' '}<span className="hero-title-line hero-title-line-muted">Einfach Software.</span></h1>
      <p className="intro">Wir entwickeln digitale Produkte, die ihren eigenen Weg gehen. Das ist erst der Anfang.</p>
    </section>
    <section id="produkte" aria-labelledby="products-title">
      <div className="section-label"><h2 id="products-title">Unsere Produkte</h2><span>{String(products.length).padStart(2, '0')} Ideen. Und mehr vor.</span></div>
      <div className="product-grid">
        {products.map(product => <article key={product.name} className={`product ${product.theme}`}>
          <div className="product-icon" aria-hidden="true">
            {product.icon === 'shopping-bag'
              ? <ShoppingBag size={34} strokeWidth={1.6} />
              : <img src={product.icon} alt="" width="66" height="66" />}
          </div>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <div className="product-links">
            {product.url && <a href={product.url} aria-label={`${product.name} entdecken`}>Entdecken <span aria-hidden="true">↗</span></a>}
            {product.appStore && <a href={product.appStore} aria-label={`${product.name} im App Store`}>App Store <span aria-hidden="true">↗</span></a>}
          </div>
        </article>)}
      </div>
      <p className="next">Weitere Produkte folgen.</p>
    </section>
    <section className="contact-strip" aria-label="Kontakt"><p>Eine Frage. Eine Idee. Ein Hallo.</p><a href="/kontakt/">Schreib uns <span aria-hidden="true">→</span></a></section>
  </main>;
}
