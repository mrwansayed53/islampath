import { Helmet } from 'react-helmet-async';

interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
}

function SEO({ title, description, canonical, image }: SeoProps) {
  const siteTitle = 'Islamic Website';
  const pageTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const pageDescription =
    description || 'موقع إسلامي شامل للقرآن الكريم والأحاديث والأذكار وقصص الأنبياء';
  const pageUrl = canonical || window.location.href;
  const pageImage = image || '/icon.svg';

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={pageUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:locale" content="ar_AR" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          url: 'https://www.islampath.site',
          name: 'Islamic Website',
          logo: 'https://www.islampath.site/icon.svg'
        })}
      </script>
    </Helmet>
  );
}

export default SEO; 