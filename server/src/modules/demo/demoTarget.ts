import type { Request, Response } from 'express';

/**
 * Serves a deterministic target website with deliberately engineered flaws
 * matching Specification Section 19 for deterministic analyzer testing and demos.
 */
export function serveDemoTarget(_req: Request, res: Response): void {
  // Deliberately omit security headers to test security analyzers
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Strict-Transport-Security');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shop</title> <!-- SEO Flaw: Title too short (< 10 chars) -->
  <meta name="description" content="A demo store"> <!-- SEO Flaw: Meta desc too short (< 50 chars) -->
  <!-- SEO Flaw: Missing canonical link -->

  <!-- Performance Flaw: Synchronous render-blocking script -->
  <script src="https://cdn.example.com/analytics.js"></script>

  <style>
    body { font-family: sans-serif; margin: 40px; }
    .hero { background: #f0f4f8; padding: 30px; border-radius: 8px; }
  </style>
</head>
<body>
  <header>
    <h1>WebLens Deliberate Demo Target</h1>
    <!-- SEO Flaw: Heading hierarchy violation (h1 -> h4 skipping h2/h3) -->
    <h4>Welcome to our demo target</h4>
  </header>

  <main>
    <section class="hero">
      <h2>Featured Products</h2>
      <p>Discover our high performance components.</p>

      <!-- Accessibility Flaw: Image missing alt attribute -->
      <img src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8" width="300" height="200">

      <!-- Accessibility Flaw: Image with empty src and no alt -->
      <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f">
    </section>

    <section>
      <h2>Join Newsletter</h2>
      <form action="/subscribe" method="POST">
        <!-- Accessibility Flaw: Input without associated label or aria-label -->
        <input type="email" placeholder="Enter your email" name="user_email">
        
        <!-- Accessibility Flaw: Button without accessible name -->
        <button type="submit"><svg width="16" height="16"><circle cx="8" cy="8" r="8" fill="blue"/></svg></button>
      </form>
    </section>
  </main>
</body>
</html>`);
}
