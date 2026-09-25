import type { PageContext } from '../../browser/types.js';

export interface TechDetection {
  name: string;
  category: 'Framework' | 'CMS' | 'UI Library' | 'Analytics' | 'CDN / Hosting' | 'Web Server' | 'Database / Backend';
  confidence: number; // 0 - 100
  version?: string;
  evidenceSource: string;
  matchValue: string;
  description: string;
  docsUrl: string;
  isOutdated?: boolean;
}

export type TechDetector = (context: PageContext) => TechDetection | null;

export const TECH_DETECTORS: TechDetector[] = [
  // 1. Next.js
  (ctx) => {
    if (
      ctx.html.includes('__NEXT_DATA__') ||
      ctx.html.includes('/_next/static/') ||
      ctx.scripts.some((s) => s.src?.includes('/_next/'))
    ) {
      return {
        name: 'Next.js',
        category: 'Framework',
        confidence: 100,
        evidenceSource: 'HTML / Scripts',
        matchValue: '/_next/ static assets or __NEXT_DATA__',
        description: 'Next.js is a leading React framework for full-stack web applications with server-side rendering (SSR) and static generation.',
        docsUrl: 'https://nextjs.org/',
      };
    }
    return null;
  },

  // 2. React
  (ctx) => {
    if (
      ctx.html.includes('data-reactroot') ||
      ctx.html.includes('react') ||
      ctx.scripts.some((s) => s.src?.toLowerCase().includes('react'))
    ) {
      return {
        name: 'React',
        category: 'Framework',
        confidence: 90,
        evidenceSource: 'DOM / Scripts',
        matchValue: 'React DOM markers or script references',
        description: 'React is an open-source front-end JavaScript library for building component-based user interfaces.',
        docsUrl: 'https://react.dev/',
      };
    }
    return null;
  },

  // 3. Vue.js / Nuxt
  (ctx) => {
    if (ctx.html.includes('__NUXT__') || ctx.scripts.some((s) => s.src?.includes('/_nuxt/'))) {
      return {
        name: 'Nuxt.js',
        category: 'Framework',
        confidence: 100,
        evidenceSource: 'HTML / Scripts',
        matchValue: '__NUXT__ context or /_nuxt/ scripts',
        description: 'Nuxt is an intuitive, open-source framework built on Vue.js for full-stack development and SSR.',
        docsUrl: 'https://nuxt.com/',
      };
    }
    if (ctx.html.includes('data-v-') || ctx.scripts.some((s) => s.src?.toLowerCase().includes('vue'))) {
      return {
        name: 'Vue.js',
        category: 'Framework',
        confidence: 85,
        evidenceSource: 'DOM / Scripts',
        matchValue: 'Vue scoped CSS attributes (data-v-) or Vue script',
        description: 'Vue.js is a progressive JavaScript framework for building performant user interfaces.',
        docsUrl: 'https://vuejs.org/',
      };
    }
    return null;
  },

  // 4. Angular
  (ctx) => {
    const ngVersion = ctx.html.match(/ng-version="([^"]+)"/i);
    if (ngVersion || ctx.html.includes('ng-app') || ctx.html.includes('<app-root')) {
      return {
        name: 'Angular',
        category: 'Framework',
        confidence: 95,
        version: ngVersion ? ngVersion[1] : undefined,
        evidenceSource: 'HTML DOM',
        matchValue: ngVersion ? `ng-version="${ngVersion[1]}"` : '<app-root> component tag',
        description: 'Angular is a TypeScript-based, open-source web application framework developed by Google.',
        docsUrl: 'https://angular.dev/',
      };
    }
    return null;
  },

  // 5. WordPress
  (ctx) => {
    const generator = ctx.metaTags.find(
      (m) => m.name?.toLowerCase() === 'generator' && m.content?.toLowerCase().includes('wordpress')
    );
    const hasWpContent = ctx.html.includes('/wp-content/') || ctx.html.includes('/wp-includes/');
    if (generator || hasWpContent) {
      const versionMatch = generator?.content?.match(/wordpress\s+([\d.]+)/i);
      return {
        name: 'WordPress',
        category: 'CMS',
        confidence: 100,
        version: versionMatch ? versionMatch[1] : undefined,
        evidenceSource: generator ? 'Meta Generator' : 'Asset Paths',
        matchValue: generator?.content || '/wp-content/ directory structure',
        description: 'WordPress is the world’s most popular open-source content management system, powering millions of websites.',
        docsUrl: 'https://wordpress.org/',
      };
    }
    return null;
  },

  // 6. Shopify
  (ctx) => {
    if (
      ctx.html.includes('cdn.shopify.com') ||
      ctx.html.includes('Shopify.theme') ||
      ctx.scripts.some((s) => s.src?.includes('shopify'))
    ) {
      return {
        name: 'Shopify',
        category: 'CMS',
        confidence: 100,
        evidenceSource: 'HTML / Scripts',
        matchValue: 'cdn.shopify.com references or Shopify globals',
        description: 'Shopify is a complete e-commerce platform that lets individuals and businesses sell products online.',
        docsUrl: 'https://www.shopify.com/',
      };
    }
    return null;
  },

  // 7. Tailwind CSS
  (ctx) => {
    const hasTailwindLink = ctx.stylesheets.some((s) => s.href?.includes('tailwind'));
    // Match common tailwind utility classes in HTML
    const hasTailwindClasses = /\b(flex|grid|hidden|bg-\w+-\d+|text-\w+-\d+|p-\d+|m-\d+|rounded-\w+|shadow-\w+)\b/.test(
      ctx.html
    );
    if (hasTailwindLink || (hasTailwindClasses && ctx.html.includes('class="'))) {
      return {
        name: 'Tailwind CSS',
        category: 'UI Library',
        confidence: hasTailwindLink ? 100 : 80,
        evidenceSource: hasTailwindLink ? 'Stylesheet Link' : 'HTML Class Signatures',
        matchValue: hasTailwindLink ? 'Tailwind stylesheet' : 'Tailwind utility class clusters',
        description: 'Tailwind CSS is a utility-first CSS framework packed with classes that can be composed to build any design directly in your markup.',
        docsUrl: 'https://tailwindcss.com/',
      };
    }
    return null;
  },

  // 8. Bootstrap
  (ctx) => {
    const hasBootstrapCss = ctx.stylesheets.some((s) => s.href?.toLowerCase().includes('bootstrap'));
    const hasBootstrapJs = ctx.scripts.some((s) => s.src?.toLowerCase().includes('bootstrap'));
    if (hasBootstrapCss || hasBootstrapJs || ctx.html.includes('class="container') || ctx.html.includes('class="row')) {
      if (hasBootstrapCss || hasBootstrapJs) {
        return {
          name: 'Bootstrap',
          category: 'UI Library',
          confidence: 95,
          evidenceSource: 'Assets',
          matchValue: 'Bootstrap stylesheet or bundle script',
          description: 'Bootstrap is a powerful, extensible, and feature-packed frontend toolkit for responsive web design.',
          docsUrl: 'https://getbootstrap.com/',
        };
      }
    }
    return null;
  },

  // 9. jQuery
  (ctx) => {
    const jqScript = ctx.scripts.find((s) => s.src?.toLowerCase().includes('jquery'));
    if (jqScript) {
      const versionMatch = jqScript.src?.match(/jquery[.-]([\d.]+)/i);
      const isAncient = versionMatch && parseFloat(versionMatch[1]) < 3.5;
      return {
        name: 'jQuery',
        category: 'UI Library',
        confidence: 95,
        version: versionMatch ? versionMatch[1] : undefined,
        evidenceSource: 'Script Tag',
        matchValue: jqScript.src || 'jQuery script reference',
        description: 'jQuery is a fast, small, and feature-rich JavaScript library for DOM manipulation and event handling.',
        docsUrl: 'https://jquery.com/',
        isOutdated: isAncient,
      };
    }
    return null;
  },

  // 10. Google Analytics (GA4) / Tag Manager
  (ctx) => {
    const hasGtm = ctx.scripts.some((s) => s.src?.includes('googletagmanager.com/gtm.js'));
    const hasGa = ctx.scripts.some(
      (s) => s.src?.includes('google-analytics.com') || s.src?.includes('googletagmanager.com/gtag/js')
    );
    if (hasGtm) {
      return {
        name: 'Google Tag Manager',
        category: 'Analytics',
        confidence: 100,
        evidenceSource: 'Script Tag',
        matchValue: 'googletagmanager.com/gtm.js',
        description: 'Google Tag Manager is a tag management system to manage and deploy marketing and measurement tags.',
        docsUrl: 'https://tagmanager.google.com/',
      };
    }
    if (hasGa) {
      return {
        name: 'Google Analytics (GA4)',
        category: 'Analytics',
        confidence: 100,
        evidenceSource: 'Script Tag',
        matchValue: 'gtag.js or google-analytics.com',
        description: 'Google Analytics is a web analytics service that tracks and reports website traffic.',
        docsUrl: 'https://analytics.google.com/',
      };
    }
    return null;
  },

  // 11. Cloudflare
  (ctx) => {
    const hasCfHeader = Boolean(ctx.headers['cf-ray'] || ctx.headers['cf-cache-status']);
    const serverHeader = ctx.headers['server']?.toLowerCase();
    if (hasCfHeader || serverHeader === 'cloudflare') {
      return {
        name: 'Cloudflare',
        category: 'CDN / Hosting',
        confidence: 100,
        evidenceSource: 'HTTP Headers',
        matchValue: ctx.headers['cf-ray'] ? `CF-Ray: ${ctx.headers['cf-ray']}` : 'Server: cloudflare',
        description: 'Cloudflare is a global cloud platform offering content delivery network (CDN), DDoS mitigation, and edge compute services.',
        docsUrl: 'https://www.cloudflare.com/',
      };
    }
    return null;
  },

  // 12. Vercel
  (ctx) => {
    if (ctx.headers['x-vercel-id'] || ctx.headers['server']?.toLowerCase() === 'vercel') {
      return {
        name: 'Vercel',
        category: 'CDN / Hosting',
        confidence: 100,
        evidenceSource: 'HTTP Headers',
        matchValue: 'x-vercel-id or Server: Vercel header',
        description: 'Vercel is a cloud platform for frontend developers, providing edge delivery, preview deployments, and serverless compute.',
        docsUrl: 'https://vercel.com/',
      };
    }
    return null;
  },

  // 13. Express / Node.js
  (ctx) => {
    const poweredBy = ctx.headers['x-powered-by']?.toLowerCase();
    if (poweredBy?.includes('express')) {
      return {
        name: 'Express.js',
        category: 'Web Server',
        confidence: 100,
        evidenceSource: 'HTTP Header',
        matchValue: `X-Powered-By: ${ctx.headers['x-powered-by']}`,
        description: 'Express is a minimal and flexible Node.js web application framework providing a robust set of features for web applications and APIs.',
        docsUrl: 'https://expressjs.com/',
      };
    }
    return null;
  },

  // 14. Nginx / Apache Web Server
  (ctx) => {
    const server = ctx.headers['server']?.toLowerCase();
    if (server?.includes('nginx')) {
      return {
        name: 'Nginx',
        category: 'Web Server',
        confidence: 100,
        evidenceSource: 'HTTP Header',
        matchValue: `Server: ${ctx.headers['server']}`,
        description: 'Nginx is a high-performance HTTP server, reverse proxy, and asynchronous event-driven network engine.',
        docsUrl: 'https://nginx.org/',
      };
    }
    if (server?.includes('apache')) {
      return {
        name: 'Apache HTTP Server',
        category: 'Web Server',
        confidence: 100,
        evidenceSource: 'HTTP Header',
        matchValue: `Server: ${ctx.headers['server']}`,
        description: 'The Apache HTTP Server Project is a collaborative software development effort to create a robust, commercial-grade web server.',
        docsUrl: 'https://httpd.apache.org/',
      };
    }
    return null;
  },
];
