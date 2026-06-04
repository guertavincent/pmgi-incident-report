'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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

type SlideItem = {
  key: string;
  header: string;
  text: string | null;
  images: string[];
};

const HIDDEN_IMAGES = new Set([
  '/housekeeping-guidelines/slide-04-img-01.png',
  '/housekeeping-guidelines/slide-05-img-01.png',
  '/housekeeping-guidelines/slide-06-img-01.png',
  '/housekeeping-guidelines/slide-24-img-01.png',
  '/housekeeping-guidelines/slide-25-img-01.png',
  '/housekeeping-guidelines/slide-27-img-01.png',
  '/housekeeping-guidelines/slide-28-img-01.png',
  '/housekeeping-guidelines/slide-30-img-01.png',
  '/housekeeping-guidelines/slide-31-img-01.png',
]);

const headingFont = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

const bodyFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const HOUSEKEEPING_GALLERY = [
  { src: '/img%201.png', label: 'Housekeeping Image 1' },
  { src: '/img%202.png', label: 'Housekeeping Image 2' },
  { src: '/img%203.png', label: 'Housekeeping Image 3' },
  { src: '/img%204.png', label: 'Housekeeping Image 4' },
  { src: '/img%205.png', label: 'Housekeeping Image 5' },
];

const HOUSEKEEPING_GALLERY_DETAIL = [
  { src: '/img%206.png', label: 'Housekeeping Image 6' },
  { src: '/img%207.png', label: 'Housekeeping Image 7' },
];

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

    current.slides.push({ ...slide, texts: cleaned });
  });

  if (current.slides.length) {
    sections.push(current);
  }

  return { sections, heroTitle, heroSubtitle };
}

function buildSlideItems(section: Section): SlideItem[] {
  return section.slides.flatMap((slide): SlideItem[] => {
    const title =
      slide.texts.length > 1 && isHeading(slide.texts[0]) ? slide.texts[0] : null;
    const body = title ? slide.texts.slice(1) : slide.texts;
    const images = slide.images.filter((src) => !HIDDEN_IMAGES.has(src));
    const header = title ?? `Slide ${slide.index}`;

    if (!body.length) {
      return [{ key: `${slide.index}-0`, header, text: null, images }];
    }

    return body.map((text, idx): SlideItem => ({
      key: `${slide.index}-${idx}`,
      header,
      text,
      images: images[idx] ? [images[idx]] : [],
    }));
  });
}

function useRevealOnScroll() {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            element.classList.add(styles.isVisible);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.08 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ─── Housekeeping photo card ─── */
function HousekeepingPhotoCard({
  gallery,
  eyebrow,
  title,
  text,
  tag,
  ariaLabel,
}: {
  gallery: { src: string; label: string }[];
  eyebrow: string;
  title: string;
  text: string;
  tag: string;
  ariaLabel: string;
}) {
  const [active, setActive] = useState(0);
  const total = gallery.length;
  const current = gallery[active];

  useEffect(() => {
    if (total <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % total);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [total]);

  return (
    <section className={styles.photoShowcase} aria-label={ariaLabel}>
      <div className={styles.photoCard}>
        <div className={styles.photoMedia}>
          <div key={current.src} className={styles.photoFrame}>
            <Image
              src={current.src}
              alt={current.label}
              fill
              sizes="(max-width: 900px) 100vw, 520px"
              className={styles.photoImage}
              priority
            />
          </div>
          <div className={styles.photoTag}>{tag}</div>
        </div>

        <div className={styles.photoContent}>
          <p className={styles.photoEyebrow}>{eyebrow}</p>
          <h2 className={`${headingFont.className} ${styles.photoTitle}`}>
            {title}
          </h2>
          <p className={styles.photoText}>{text}</p>

          <div className={styles.photoControls}>
            <div className={styles.photoDots} role="tablist">
              {gallery.map((item, idx) => (
                <button
                  key={item.src}
                  type="button"
                  role="tab"
                  aria-selected={idx === active}
                  aria-label={`Show photo ${idx + 1}`}
                  className={`${styles.photoDot} ${idx === active ? styles.photoDotActive : ''}`}
                  onClick={() => setActive(idx)}
                />
              ))}
            </div>
            <div className={styles.photoIndex}>
              <span>{String(active + 1).padStart(2, '0')}</span>
              <span className={styles.photoIndexSep}>/</span>
              <span>{String(total).padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Slideshow card ─── */
function SectionSlideshow({
  section,
  sectionIndex,
  headingClassName,
}: {
  section: Section;
  sectionIndex: number;
  headingClassName: string;
}) {
  const items = useMemo(() => buildSlideItems(section), [section]);
  const [active, setActive] = useState(0);
  const sectionRef = useRevealOnScroll();

  const total = items.length;
  const current = items[active];
  const hasImage = current.images.length > 0;
  const isLcpImage = sectionIndex === 0 && active === 0;

  const prev = useCallback(() => setActive((a) => (a - 1 + total) % total), [total]);
  const next = useCallback(() => setActive((a) => (a + 1) % total), [total]);

  /* keyboard navigation */
  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    },
    [prev, next]
  );

  return (
    <section
      id={`section-${sectionIndex}`}
      ref={sectionRef}
      className={`${styles.section} ${styles.reveal}`}
      onKeyDown={handleKey}
      tabIndex={0}
      aria-label={section.title}
    >
      <div className={styles.slideshowCard}>

        {/* ── Left panel: image ── */}
        <div key={`left-${current.key}`} className={`${styles.slideLeft} ${styles.fadeIn}`}>
          <div className={styles.slideImageZone}>
            {hasImage ? (
              <Image
                key={current.images[0]}
                src={current.images[0]}
                alt={`${current.header} visual`}
                fill
                sizes="(max-width: 900px) 100vw, 480px"
                className={styles.slideImage}
                loading={isLcpImage ? 'eager' : 'lazy'}
                fetchPriority={isLcpImage ? 'high' : 'low'}
                priority={isLcpImage}
              />
            ) : (
              <div className={styles.slideImagePlaceholder}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M3 15l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={styles.placeholderLabel}>No image</span>
              </div>
            )}

            {/* Section title overlay on image */}
            <div className={styles.imageOverlay}>
              <span className={styles.overlaySection}>{section.title}</span>
            </div>
          </div>
        </div>

        {/* ── Right panel: content ── */}
        <div key={`right-${current.key}`} className={`${styles.slideRight} ${styles.fadeIn}`}>

          {/* Header */}
          <div className={styles.slideRightHeader}>
            <div className={styles.slideCounter}>
              <span className={styles.slideCountCurrent}>{String(active + 1).padStart(2, '0')}</span>
              <span className={styles.slideCountSep}>/</span>
              <span className={styles.slideCountTotal}>{String(total).padStart(2, '0')}</span>
            </div>
            <h2 className={`${headingClassName} ${styles.sectionTitle}`}>
              {section.title}
            </h2>
            <p className={styles.slideLabel}>{current.header}</p>
          </div>

          {/* Body text */}
          <div className={styles.slideBody}>
            {current.text ? (
              <p className={styles.slideText}>{current.text}</p>
            ) : (
              <p className={styles.slideTextMuted}>
                Visual reference from the training deck.
              </p>
            )}
          </div>

          {/* Controls */}
          <div className={styles.slideControls}>
            <div className={styles.slideDots} role="tablist">
              {items.map((item, idx) => (
                <button
                  key={item.key}
                  role="tab"
                  aria-selected={idx === active}
                  aria-label={`Slide ${idx + 1}`}
                  className={`${styles.slideDot} ${idx === active ? styles.slideDotActive : ''}`}
                  onClick={() => setActive(idx)}
                />
              ))}
            </div>

            <div className={styles.slideBtns}>
              <button
                className={styles.slideBtn}
                onClick={prev}
                aria-label="Previous slide"
                disabled={total <= 1}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                className={styles.slideBtn}
                onClick={next}
                aria-label="Next slide"
                disabled={total <= 1}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─── Page ─── */
export default function HousekeepingGuidelinesPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch('/housekeeping-guidelines/slides.json')
      .then((res) => {
        if (!res.ok) throw new Error('Unable to load housekeeping guidelines.');
        return res.json();
      })
      .then((data: Slide[]) => { if (isMounted) setSlides(data); })
      .catch((err: Error) => { if (isMounted) setError(err.message); });

    return () => { isMounted = false; };
  }, []);

  const { sections, heroTitle, heroSubtitle } = useMemo(
    () => buildSections(slides),
    [slides]
  );

  return (
    <div className={`${styles.page} ${bodyFont.className}`}>

      {/* ── HERO ── */}
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
            <div className={styles.statCard}>
              <p className={styles.statNum}>{sections.length}</p>
              <p className={styles.statLabel}>Key Sections</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statNum}>{slides.length}</p>
              <p className={styles.statLabel}>Total Slides</p>
            </div>
          </div>
        </div>
      </header>

      <HousekeepingPhotoCard
        gallery={HOUSEKEEPING_GALLERY}
        eyebrow="PMGI Guidelines"
        title="Clean. Safe. Ready for Guests."
        text="A quick visual walkthrough of housekeeping checkpoints, stocked rooms, and presentation standards. Use the slider to review each reference image."
        tag="Housekeeping Visuals"
        ariaLabel="Housekeeping photo highlights"
      />

      <HousekeepingPhotoCard
        gallery={HOUSEKEEPING_GALLERY_DETAIL}
        eyebrow="Room Readiness"
        title="Detail Checks and Finish Quality"
        text="Two additional visuals focused on finishing touches and consistent room presentation."
        tag="Detail Standards"
        ariaLabel="Housekeeping detail highlights"
      />

      {/* ── NAV ── */}
      <nav className={styles.sectionNav} aria-label="Jump to section">
        {sections.map((section, index) => (
          <a
            key={section.title}
            href={`#section-${index}`}
            className={styles.navLink}
          >
            {section.title}
          </a>
        ))}
      </nav>

      {/* ── CONTENT ── */}
      {error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <main className={styles.sections}>
          {sections.map((section, sectionIndex) => (
            <SectionSlideshow
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