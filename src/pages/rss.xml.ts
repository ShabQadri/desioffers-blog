import rss from '@astrojs/rss';
import { getCollection, type CollectionEntry } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_CONFIG } from '../config/site';

export async function GET(context: APIContext) {
  const articles: CollectionEntry<'articles'>[] = await getCollection(
    'articles',
    ({ data }: CollectionEntry<'articles'>) => !data.draft
  );
  const sortedArticles = articles.sort(
    (a: CollectionEntry<'articles'>, b: CollectionEntry<'articles'>) =>
      b.data.publishedDate.getTime() - a.data.publishedDate.getTime()
  );

  return rss({
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    site: context.site?.toString() || SITE_CONFIG.url,
    items: sortedArticles.map((article: CollectionEntry<'articles'>) => ({
      title: article.data.title,
      pubDate: article.data.publishedDate,
      description: article.data.description,
      link: `/${article.slug}/`,
    })),
    customData: `<language>${SITE_CONFIG.locale}</language>`,
  });
}
