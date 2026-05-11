'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Fraunces, Space_Grotesk } from 'next/font/google';
import styles from './housekeeping-guidelines.module.css';

type Slide = {
  index: number;
  texts: string[];
  images: string[];
};

type Section = {
  title: string;
  slides: Slide[];
};

const headingFont = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

const bodyFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function isHeading(text: string) {
  const compact = normalizeText(text);
  return compact.length <= 60 && compact.toUpperCase() === compact;
}

function stripPageMarkers(texts: string[]) {
  return texts
    .map((text) => normalizeText(text))
    .filter((text) => text && !/^Page\s+\d+\s+of\s+\d+/i.test(text));
}

function buildSections(slides: Slide[]) {
  const sections: Section[] = [];
  let heroTitle = 'Housekeeping Guidelines';
  let heroSubtitle =
    'PMGI operational housekeeping standards, procedures, and service culture.';

  let current: Section = { title: 'Overview', slides: [] };

  slides.forEach((slide) => {
    const cleaned = stripPageMarkers(slide.texts);
    const isSectionBreak = cleaned.length === 1 && isHeading(cleaned[0]);

    if (isSectionBreak) {
      const title = cleaned[0];
      if (title.includes('HOUSEKEEPING')) {
        heroTitle = title;
        return;
      }
      if (current.slides.length) {
        sections.push(current);
      }
      current = { title, slides: [] };
      return;
    }

    if (!heroSubtitle || heroSubtitle.startsWith('PMGI operational')) {
      const candidate = cleaned.find((text) => text.length >= 120);
      if (candidate) {
        const shortened = candidate.split('.').slice(0, 2).join('. ').trim();
        if (shortened) {
          heroSubtitle = shortened.endsWith('.') ? shortened : `${shortened}.`;
        }
      }
    }

    current.slides.push({
      ...slide,
      texts: cleaned,
    });
  });

  if (current.slides.length) {
    sections.push(current);
  }

  return { sections, heroTitle, heroSubtitle };
}

function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            element.classList.add(styles.isVisible);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function SectionBlock({
  section,
  sectionIndex,
  headingClassName,
}: {
  section: Section;
  sectionIndex: number;
  headingClassName: string;
}) {
  const sectionRef = useRevealOnScroll();

  return (
    <section
      id={`section-${sectionIndex}`}
      ref={sectionRef}
      className={`${styles.section} ${styles.reveal}`}
    >
      <div className={styles.sectionHeader}>
        <h2 className={headingClassName}>{section.title}</h2>
        <p>{section.slides.length} slides</p>
      </div>

      <div className={styles.cardGrid}>
        {section.slides.map((slide) => {
          const title =
            slide.texts.length > 1 && isHeading(slide.texts[0])
              ? slide.texts[0]
              : null;
          const body = title ? slide.texts.slice(1) : slide.texts;

          return (
            <article key={slide.index} className={styles.card}>
              <div className={styles.cardHeader}>
                <span>Slide {slide.index}</span>
                {title ? <h3>{title}</h3> : null}
              </div>

              {body.length ? (
                <div className={styles.cardBody}>
                  {body.map((text, idx) => (
                    <p key={`${slide.index}-text-${idx}`}>{text}</p>
                  ))}
                </div>
              ) : (
                <p className={styles.cardBodyMuted}>
                  Visual reference from the training deck.
                </p>
              )}

              {slide.images.length ? (
                <div className={styles.imageGrid}>
                  {slide.images.map((src, idx) => (
                    <div
                      key={`${slide.index}-img-${idx}`}
                      className={styles.imageFrame}
                    >
                      <Image
                        src={src}
                        alt={`Slide ${slide.index} image ${idx + 1}`}
                        fill
                        sizes="(max-width: 900px) 100vw, 33vw"
                        className={styles.image}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function HousekeepingGuidelinesPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch('/housekeeping-guidelines/slides.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load housekeeping guidelines.');
        }
        return response.json();
      })
      .then((data: Slide[]) => {
        if (isMounted) {
          setSlides(data);
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const { sections, heroTitle, heroSubtitle } = useMemo(
    () => buildSections(slides),
    [slides]
  );

  return (
    <div className={`${styles.page} ${bodyFont.className}`}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.kicker}>PMGI Operations</p>
          <h1 className={`${styles.heroTitle} ${headingFont.className}`}>
            {heroTitle}
          </h1>
          <p className={styles.heroSubtitle}>{heroSubtitle}</p>
          <div className={styles.heroMeta}>
            <span>Training Reference</span>
            <span className={styles.heroDot} />
            <span>Updated May 11, 2026</span>
          </div>
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.heroBadge}>Guideline Playbook</div>
          <div className={styles.heroStats}>
            <div>
              <h3>{sections.length}</h3>
              <p>Key Sections</p>
            </div>
            <div>
              <h3>{slides.length}</h3>
              <p>Total Slides</p>
            </div>
          </div>
        </div>
      </header>

      <nav className={styles.sectionNav}>
        {sections.map((section, index) => (
          <a key={section.title} href={`#section-${index}`}>
            {section.title}
          </a>
        ))}
      </nav>

      {error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <main className={styles.sections}>
          {sections.map((section, sectionIndex) => (
            <SectionBlock
              key={section.title}
              section={section}
              sectionIndex={sectionIndex}
              headingClassName={headingFont.className}
            />
          ))}
        </main>
      )}
    </div>
  );
}
