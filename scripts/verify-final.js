async function inspectRenderedLinks() {
  const res = await fetch('http://localhost:4321/best-wireless-neckbands-under-2000/');
  const html = await res.text();

  console.log('\n--- SECTION ORDER INSPECTION ---');
  const posHero = html.indexOf('class="article-hero-image"');
  const posQuickPicks = html.indexOf('class="quick-picks-section"');
  const posProducts = html.indexOf('id="recommended-products"');
  const posComparisonTable = html.indexOf('Specification Comparison Table');
  const posEditorial = html.indexOf('Detailed Editorial Breakdown of Top 5 Picks');
  const posWhyChoose = html.indexOf('Why Choose a Neckband Over TWS Earbuds?');
  const posHowToChoose = html.indexOf('How to Choose the Best Wireless Neckband Under ₹2,000');
  const posMethodology = html.indexOf('class="methodology-card"');
  const posFaq = html.indexOf('class="faq-section-block"');
  const posTags = html.indexOf('class="article-tags-section"');

  console.log('1. Hero Image pos:        ', posHero);
  console.log('2. Quick Picks pos:       ', posQuickPicks);
  console.log('3. Product Cards pos:     ', posProducts);
  console.log('4. Comparison Table pos:  ', posComparisonTable);
  console.log('5. Detailed Breakdown pos:', posEditorial);
  console.log('6. Why Neckbands pos:     ', posWhyChoose);
  console.log('7. How to Choose pos:     ', posHowToChoose);
  console.log('8. Methodology Card pos:  ', posMethodology);
  console.log('9. FAQ Accordion pos:     ', posFaq);
  console.log('10. Article Tags pos:     ', posTags);

  const isOrdered = posHero < posQuickPicks &&
                    posQuickPicks < posProducts &&
                    posProducts < posComparisonTable &&
                    posComparisonTable < posEditorial &&
                    posEditorial < posWhyChoose &&
                    posWhyChoose < posHowToChoose &&
                    posHowToChoose < posMethodology &&
                    posMethodology < posFaq &&
                    posFaq < posTags;

  console.log('\n✅ All sections rendered in EXACT requested order:', isOrdered ? 'YES (PERFECT)' : 'NO');

  console.log('\n--- PRODUCT CARD AMAZON CTA BUTTONS ---');
  const buttonMatches = [...html.matchAll(/<a[^>]+class="[^"]*product-cta-btn[^"]*"[^>]*>/g)];
  console.log(`Found ${buttonMatches.length} product CTA buttons.`);

  buttonMatches.forEach((m, idx) => {
    const fullTag = m[0];
    const hrefMatch = fullTag.match(/href="([^"]+)"/);
    const relMatch = fullTag.match(/rel="([^"]+)"/);
    console.log(`\nProduct #${idx + 1}:`);
    console.log(`- href: ${hrefMatch ? hrefMatch[1] : 'NOT FOUND'}`);
    console.log(`- rel:  ${relMatch ? relMatch[1] : 'NOT FOUND'}`);
    console.log(`- contains smartdesioffers-21: ${hrefMatch && hrefMatch[1].includes('smartdesioffers-21') ? 'YES' : 'NO'}`);
  });

  console.log('\n--- QUICK PICKS AMAZON LINKS ---');
  const qpMatches = [...html.matchAll(/<a[^>]+class="[^"]*pick-amazon-link[^"]*"[^>]*>/g)];
  console.log(`Found ${qpMatches.length} quick pick Amazon links.`);
  qpMatches.forEach((m, idx) => {
    const fullTag = m[0];
    const hrefMatch = fullTag.match(/href="([^"]+)"/);
    console.log(`Quick Pick #${idx + 1} href: ${hrefMatch ? hrefMatch[1] : 'NOT FOUND'}`);
    console.log(`- contains smartdesioffers-21: ${hrefMatch && hrefMatch[1].includes('smartdesioffers-21') ? 'YES' : 'NO'}`);
  });
  console.log('\n--- PRODUCTION BUILD (dist/) INSPECTION ---');
  const fs = await import('node:fs');
  const prodHtml = fs.readFileSync('dist/best-tws-earbuds-under-2000/index.html', 'utf8');
  const prodMatches = [...prodHtml.matchAll(/href="([^"]*amazon\.in[^"]*)"/g)];
  console.log(`Found ${prodMatches.length} Amazon links in dist/best-tws-earbuds-under-2000/index.html.`);
  prodMatches.slice(0, 3).forEach((m, idx) => {
    console.log(`Production sample #${idx + 1}: ${m[1]}`);
    console.log(`- contains smartdesioffers-21: ${m[1].includes('smartdesioffers-21') ? 'YES' : 'NO'}`);
  });
}

inspectRenderedLinks().catch(console.error);
