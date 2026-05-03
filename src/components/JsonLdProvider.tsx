'use client';

import { useEffect } from 'react';

interface JsonLdProps {
  data: Record<string, any>;
}

export function JsonLdProvider({ data }: JsonLdProps) {
  useEffect(() => {
    // Remove existing JSON-LD script if any
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create new JSON-LD script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.querySelector('script[type="application/ld+json"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [data]);

  return null;
}

export function generateRealEstateSchema(landOpportunity: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: landOpportunity.titulo,
    description: landOpportunity.descricao,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/land/${landOpportunity.id}`,
    image: landOpportunity.imagem_url || `${process.env.NEXT_PUBLIC_APP_URL}/images/land-default.jpg`,
    offers: {
      '@type': 'Offer',
      price: landOpportunity.valor_total,
      priceCurrency: 'BRL',
      availability: landOpportunity.status === 'publicado' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Área',
        value: `${landOpportunity.area_m2} m²`,
        unitText: 'square meters',
      },
      {
        '@type': 'PropertyValue',
        name: 'ROI Projetado',
        value: `${landOpportunity.roi_projetado}%`,
        unitText: 'percentage',
      },
      {
        '@type': 'PropertyValue',
        name: 'Zoneamento',
        value: landOpportunity.tag_zoneamento,
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BR',
      // Note: Full address is hidden for privacy, only general info shown
    },
    datePosted: landOpportunity.created_at,
    dateModified: landOpportunity.updated_at,
    seller: {
      '@type': 'Organization',
      name: 'GEO v8.1 Imperium Edition',
      url: process.env.NEXT_PUBLIC_APP_URL,
      logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
    },
  };
}

export function generateArticleSchema(article: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image || `${process.env.NEXT_PUBLIC_APP_URL}/images/article-default.jpg`,
    author: {
      '@type': 'Organization',
      name: 'GEO v8.1 Imperium Edition',
    },
    publisher: {
      '@type': 'Organization',
      name: 'GEO v8.1 Imperium Edition',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
      },
    },
    datePublished: article.published_at,
    dateModified: article.updated_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${process.env.NEXT_PUBLIC_APP_URL}/articles/${article.id}`,
    },
  };
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'GEO v8.1 Imperium Edition',
    url: process.env.NEXT_PUBLIC_APP_URL,
    logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
    description: 'Plataforma premium de investimentos em terras com inteligência preditiva e segurança jurídica',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BR',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'contato@geo-imperium.com',
    },
    sameAs: [
      // Add social media URLs here
    ],
  };
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'GEO v8.1 Imperium Edition',
    url: process.env.NEXT_PUBLIC_APP_URL,
    description: 'Plataforma premium de investimentos em terras com inteligência preditiva e segurança jurídica',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: breadcrumb.name,
      item: breadcrumb.url,
    })),
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
