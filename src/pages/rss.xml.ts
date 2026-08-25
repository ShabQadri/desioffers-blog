import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../config/site';

export async function GET(context: any) {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const sortedArticles = articles.sort(
    (a, b) => b.data.publishedDate.getTime() - a.data.publishedDate.getTime()
  );

  return rss({
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    site: context.site || SITE_CONFIG.url,
    items: sortedArticles.map((article) => ({
      title: article.data.title,
      pubDate: article.data.publishedDate,
      description: article.data.description,
      link: `/${article.slug}/`,
    })),
    customData: `<language>${SITE_CONFIG.locale}</language>`,
  });
}
