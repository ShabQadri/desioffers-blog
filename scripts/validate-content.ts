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
  
  // Extract Category (supports quoted or unquoted)
  const catMatch = content.match(/^category:\s*["']?([^"'\r\n#]+)["']?/m);
  if (!catMatch || !catMatch[1]?.trim()) {
    console.error(`❌ [${file}]: Missing mandatory primary category`);
    errorsCount++;
  } else {
    const cat = catMatch[1].trim();
    if (!categorySlugs.has(cat)) {
      console.error(`❌ [${file}]: Invalid category "${cat}". Must exist in src/content/categories/`);
      errorsCount++;
    }
  }

  // Extract Subcategory (supports quoted or unquoted)
  const subMatch = content.match(/^subcategory:\s*["']?([^"'\r\n#]+)["']?/m);
  if (subMatch && subMatch[1]?.trim() && catMatch) {
    const sub = subMatch[1].trim();
    const parentCat = subcategoryMap.get(sub);
    const cat = catMatch[1].trim();
    if (!parentCat) {
      console.error(`❌ [${file}]: Unknown subcategory "${sub}"`);
      errorsCount++;
    } else if (parentCat !== cat) {
      console.error(`❌ [${file}]: Subcategory "${sub}" belongs to "${parentCat}", not "${cat}"`);
      errorsCount++;
    }
  }

  // Extract Tags (supports inline [tag1, tag2] or multi-line YAML list)
  let rawTags: string[] = [];
  const inlineTagsMatch = content.match(/^tags:\s*\[(.*?)\]/m);
  if (inlineTagsMatch) {
    rawTags = inlineTagsMatch[1].split(',').map(t => t.replace(/["'\s]/g, '')).filter(Boolean);
  } else {
    const listTagsMatch = content.match(/^tags:\s*\r?\n((?:\s*-\s*[^\r\n]+\r?\n?)+)/m);
    if (listTagsMatch) {
      rawTags = listTagsMatch[1]
        .split(/\r?\n/)
        .map(line => line.replace(/^\s*-\s*/, '').replace(/["'\s]/g, '').trim())
        .filter(Boolean);
    }
  }

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
});

if (errorsCount > 0) {
  console.error(`\n❌ Taxonomy Validation Failed with ${errorsCount} errors.`);
  process.exit(1);
} else {
  console.log(`✅ All ${articleFiles.length} buying guides passed Taxonomy & Schema Validation successfully!\n`);
}
