import { createEditorialArticleDraft } from '../src/lib/workflow/article-workflow.js';

async function runTestArticle() {
  console.log('🚀 Executing End-to-End Editorial Article Authoring Workflow...\n');

  const result = await createEditorialArticleDraft({
    topic: '5 Best Budget Gaming Mice Under ₹3,000 in India (2026 Edition)',
    slug: 'budget-gaming-mice-under-3000',
    articleType: 'buying-guide',
    category: 'gaming',
    subcategory: 'gaming-mice',
    tags: ['budget', 'under-3000', 'wireless', 'rgb'],
    author: 'shaaz',
    description: 'Looking for the best budget gaming mice under ₹3,000 in India? Compare top optical sensors, DPI, switches, and ergonomic builds.',
    products: [
      {
        name: 'Logitech G304 Lightspeed Wireless Gaming Mouse',
        brand: 'Logitech',
        asin: 'B07CGP569X',
        editorialBadge: 'Best Wireless Value',
        shortDescription: 'Hero 12K optical sensor with 250-hour battery life on a single AA battery.',
        bestFor: 'Wireless budget esports players',
        pros: ['Hero sensor with zero smoothing', 'Long battery life', 'Reliable 2.4GHz connection'],
        cons: ['AA battery adds slight rear weight'],
        priceVerification: 'unknown',
        availabilityVerification: 'unknown',
      },
      {
        name: 'Razer DeathAdder Essential Ergonomic Gaming Mouse',
        brand: 'Razer',
        asin: 'B0942VWD2Z',
        editorialBadge: 'Best Ergonomic Grip',
        shortDescription: 'Classic ergonomic silhouette with 6,400 DPI optical sensor and durable mechanical switches.',
        bestFor: 'Palm grip users wanting ergonomic support',
        pros: ['Iconic comfortable shape', 'Multi-award winning ergonomic form factor', 'Durable switches'],
        cons: ['Braided cable can feel slightly stiff'],
        priceVerification: 'unknown',
        availabilityVerification: 'unknown',
      },
      {
        name: 'HyperX Pulsefire Haste Ultra Lightweight Mouse',
        brand: 'HyperX',
        asin: 'B08MGBG4GQ',
        editorialBadge: 'Best Ultra-Lightweight',
        shortDescription: 'Honeycomb shell design weighing only 59 grams with TTC Golden dustproof switches.',
        bestFor: 'Fast-paced FPS shooters',
        pros: ['Ultra-light 59g weight', 'Smooth pure virgin-grade PTFE skates', 'Flexible HyperFlex cable'],
        cons: ['Open honeycomb shell requires dust care'],
        priceVerification: 'unknown',
        availabilityVerification: 'unknown',
      },
      {
        name: 'Cosmic Byte Hydra Wireless RGB Gaming Mouse',
        brand: 'Cosmic Byte',
        asin: 'B09T6Z5V8Q',
        editorialBadge: 'Best Dual-Mode RGB',
        shortDescription: 'Rechargeable wireless gaming mouse with PixArt sensor and custom software.',
        bestFor: 'Gamers wanting rechargeable wireless on a tight budget',
        pros: ['Built-in rechargeable battery', 'Dual-mode wireless/type-C wired', 'Vibrant RGB lighting'],
        cons: ['Software customization is basic'],
        priceVerification: 'unknown',
        availabilityVerification: 'unknown',
      },
      {
        name: 'SteelSeries Rival 3 Gaming Mouse',
        brand: 'SteelSeries',
        asin: 'B08176SM7C',
        editorialBadge: 'Best Build Quality',
        shortDescription: 'TrueMove Core optical sensor with 8,500 CPI and 60M click mechanical switches.',
        bestFor: 'Claw and fingertip grip gamers',
        pros: ['Crisp 60-million click switches', 'True 1-to-1 tracking sensor', 'Brilliant 3-zone RGB lighting'],
        cons: ['Rubber cable rather than paracord'],
        priceVerification: 'unknown',
        availabilityVerification: 'unknown',
      },
    ],
    bodySections: [
      {
        type: 'intro',
        content: 'Finding a responsive and durable gaming mouse under ₹3,000 in India does not mean sacrificing sensor accuracy or build quality. Modern budget sensors from PixArt and Logitech offer true 1:1 tracking without hardware acceleration or angle snapping. In this guide, our editorial team analyzes top gaming mice available in India across key parameters including switch longevity, cable flexibility, weight distribution, and software customization.',
      },
      {
        type: 'methodology',
        heading: 'Comparison Criteria & Selection Methodology',
        content: 'Recommendations are based on published sensor specifications, Indian market availability, verified brand warranty coverage, and ergonomic design considerations across grip styles.',
      },
      {
        type: 'buying-factors',
        heading: 'Key Factors for Indian Gamers',
        content: 'Ensure you consider your preferred grip style, whether you need wireless mobility or ultra-lightweight corded mobility, and the humidity resistance of the mouse switches in Indian climates.',
      },
    ],
  });

  console.log(`✅ Draft Created: ${result.draftPath}`);
  console.log(`📊 Publishable: ${result.isReadyForReview ? 'YES (Ready for Review)' : 'NO'}`);
  console.log('\n' + result.reviewSummary);
}

runTestArticle().catch((err) => {
  console.error('❌ Error executing test article workflow:', err);
  process.exit(1);
});
