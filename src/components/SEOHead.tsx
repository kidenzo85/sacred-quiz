import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
}

export function SEOHead({
  title = "Quiz Religieux - Testez vos connaissances spirituelles",
  description = "Découvrez et approfondissez vos connaissances religieuses avec notre quiz interactif alimenté par l'IA. Questions sur toutes les grandes traditions spirituelles.",
  path = "/",
}: SEOHeadProps) {
  const url = `https://quiz-religieux.lovable.app${path}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Quiz Religieux",
    description,
    url,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
