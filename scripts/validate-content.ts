import fs from 'fs';
import path from 'path';

console.log('🔍 Running DesiOffers Content & Taxonomy Integrity Validation...\n');

const rootDir = process.cwd();
const articlesDir = path.join(rootDir, 'src', 'content', 'articles');
const categoriesDir = path.join(rootDir, 'src', 'content', 'categories');
const subcategoriesDir = path.join(rootDir, 'src', 'content', 'subcategories');
const tagsDir = path.join(rootDir, 'src', 'content', 'tags');

// Load Categories
const categoryFiles = fs.readdirSync(categoriesDir).filter(f => f.endsWith('.json'));
const categorySlugs = new Set(categoryFiles.map(f => JSON.parse(fs.readFileSync(path.join(categoriesDir, f), 'utf-8')).slug));

// Load Subcategories
const subcategoryFiles = fs.readdirSync(subcategoriesDir).filter(f => f.endsWith('.json'));
const subcategoryMap = new Map();
subcategoryFiles.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(subcategoriesDir, f), 'utf-8'));
  subcategoryMap.set(data.slug, data.category);
});

// Load Tags
const tagFiles = fs.readdirSync(tagsDir).filter(f => f.endsWith('.json'));
const tagSlugs = new Set(tagFiles.map(f => JSON.parse(fs.readFileSync(path.join(tagsDir, f), 'utf-8')).slug));

// Validate Articles
const articleFiles = fs.readdirSync(articlesDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
let errorsCount = 0;

articleFiles.forEach(file => {
  const content = fs.readFileSync(path.join(articlesDir, file), 'utf-8');
  
  // Extract Category
  const catMatch = content.match(/category:\s*"([^"]+)"/);
  if (!catMatch) {
    console.error(`❌ [${file}]: Missing mandatory primary category`);
    errorsCount++;
  } else {
    const cat = catMatch[1];
    if (!categorySlugs.has(cat)) {
      console.error(`❌ [${file}]: Invalid category "${cat}". Must exist in src/content/categories/`);
      errorsCount++;
    }
  }

  // Extract Subcategory
  const subMatch = content.match(/subcategory:\s*"([^"]+)"/);
  if (subMatch && catMatch) {
    const sub = subMatch[1];
    const parentCat = subcategoryMap.get(sub);
    if (!parentCat) {
      console.error(`❌ [${file}]: Unknown subcategory "${sub}"`);
      errorsCount++;
    } else if (parentCat !== catMatch[1]) {
      console.error(`❌ [${file}]: Subcategory "${sub}" belongs to "${parentCat}", not "${catMatch[1]}"`);
      errorsCount++;
    }
  }

  // Extract Tags
  const tagsMatch = content.match(/tags:\s*\[(.*?)\]/);
  if (tagsMatch) {
    const rawTags = tagsMatch[1].split(',').map(t => t.replace(/["'\s]/g, '')).filter(Boolean);
    if (rawTags.length > 6) {
      console.error(`❌ [${file}]: Tag count exceeds maximum limit of 6 (found ${rawTags.length})`);
      errorsCount++;
    }
    rawTags.forEach(t => {
      if (!tagSlugs.has(t)) {
        console.error(`❌ [${file}]: Tag "${t}" not found in Controlled Tag Registry (src/content/tags/)`);
        errorsCount++;
      }
    });
  }
});

if (errorsCount > 0) {
  console.error(`\n❌ Taxonomy Validation Failed with ${errorsCount} errors.`);
  process.exit(1);
} else {
  console.log(`✅ All ${articleFiles.length} buying guides passed Taxonomy & Schema Validation successfully!\n`);
}
