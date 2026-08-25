import { bookMailto, site } from "../_data/site";
import { work } from "../_data/work";

/**
 * The homepage is an intentionally WebGL-first experience. This small,
 * server-rendered companion gives people (and crawlers) a clear description
 * of the studio before the interactive scene has loaded, while the noscript
 * version remains a complete, useful route when WebGL or JavaScript is not
 * available.
 */
export function HomeSeoFallback() {
  return (
    <>
      <section className="sr-only" aria-labelledby="rubberduck-home-title">
        <h1 id="rubberduck-home-title">{work.hero.title}</h1>
        <p>
          {site.studio} is {site.positioning.toLowerCase()} We design and
          build focused websites, small products, and practical automations
          for teams ready to move.
        </p>

        <h2>What we do</h2>
        <ul>
          {work.services.map((service) => (
            <li key={service.title}>
              <strong>{service.title}.</strong> {service.body}
            </li>
          ))}
        </ul>

        <h2>Selected work</h2>
        <ul>
          {work.projects.map((project) => (
            <li key={project.title}>
              <strong>{project.title}.</strong> {project.summary}
            </li>
          ))}
        </ul>

        <nav aria-label="Rubberduck pages">
          <a href="/work">See selected work</a>
          <a href="/about">About Rubberduck</a>
          <a href="/contact">Contact Rubberduck</a>
        </nav>
      </section>

      <noscript>
        <style>{`
          .home-interactive-stage { display: none !important; }

          .home-noscript {
            box-sizing: border-box;
            display: grid;
            min-height: 100svh;
            place-items: center;
            padding: 2rem;
            color: #f8fcff;
            background:
              radial-gradient(circle at 14% 12%, rgba(255, 255, 255, 0.46), transparent 28rem),
              radial-gradient(circle at 82% 86%, rgba(32, 152, 177, 0.34), transparent 33rem),
              linear-gradient(145deg, #9edbed 0%, #63c9df 52%, #46adc9 100%);
            font-family: Arial, sans-serif;
          }

          .home-noscript__shell {
            width: min(100%, 46rem);
            padding: clamp(1.75rem, 5vw, 4rem);
            border: 1px solid rgba(255, 255, 255, 0.26);
            border-radius: 2rem;
            background: rgba(3, 33, 51, 0.74);
            box-shadow: 0 30px 80px -46px rgba(0, 0, 0, 0.82);
          }

          .home-noscript__eyebrow {
            margin: 0;
            color: rgba(248, 252, 255, 0.7);
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }

          .home-noscript h1 {
            max-width: 10ch;
            margin: 1.25rem 0 0;
            font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
            font-size: clamp(3.5rem, 10vw, 6.5rem);
            font-weight: 400;
            line-height: 0.86;
            letter-spacing: -0.05em;
          }

          .home-noscript__intro {
            max-width: 42rem;
            margin: 1.5rem 0 0;
            font-size: 1.125rem;
            line-height: 1.65;
          }

          .home-noscript__services {
            display: grid;
            gap: 0.75rem;
            margin: 2rem 0 0;
            padding: 0;
            list-style: none;
          }

          .home-noscript__services li {
            padding-top: 0.75rem;
            border-top: 1px solid rgba(255, 255, 255, 0.18);
            font-size: 0.95rem;
            line-height: 1.5;
          }

          .home-noscript__services strong { display: block; }

          .home-noscript__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-top: 2rem;
          }

          .home-noscript__actions a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 2.9rem;
            padding: 0.75rem 1rem;
            border: 1px solid rgba(255, 255, 255, 0.36);
            border-radius: 999px;
            color: #ffffff;
            font-weight: 700;
            text-decoration: none;
          }

          .home-noscript__actions a:first-child {
            border-color: rgba(255, 255, 255, 0.34);
            background: rgba(3, 33, 51, 0.9);
            color: #ffffff;
          }

          .home-noscript__actions a:hover,
          .home-noscript__actions a:focus-visible {
            text-decoration: underline;
            text-underline-offset: 0.18em;
          }
        `}</style>

        <main className="home-noscript">
          <div className="home-noscript__shell">
            <p className="home-noscript__eyebrow">
              {site.studio} · independent studio
            </p>
            <h1>{work.hero.title}</h1>
            <p className="home-noscript__intro">
              {work.hero.sub}
            </p>

            <ul className="home-noscript__services">
              {work.services.map((service) => (
                <li key={service.title}>
                  <strong>{service.title}</strong>
                  {service.body}
                </li>
              ))}
            </ul>

            <nav className="home-noscript__actions" aria-label="Rubberduck pages">
              <a href={bookMailto("A useful idea for Rubberduck")}>
                Start a conversation
              </a>
              <a href="/work">See the work</a>
              <a href="/about">About</a>
              <a href="/contact">Contact</a>
            </nav>
          </div>
        </main>
      </noscript>
    </>
  );
}
