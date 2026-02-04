import type { RSSSource } from '@/types';

/**
 * Curated RSS sources organized by category and tier.
 * Tier 1 = wire services (highest trust)
 * Tier 2 = industry verticals
 * Tier 3 = business/finance
 * Tier 4 = niche/domain
 * Tier 5 = aggregator fallback
 */
export const RSS_SOURCES: RSSSource[] = [
  // ── Tier 1: Wire Services ──
  { name: 'BBC News - World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'General', tier: 1 },
  { name: 'BBC News - Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Technology', tier: 1 },
  { name: 'BBC News - Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'Business', tier: 1 },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', category: 'General', tier: 1 },
  { name: 'The Hill', url: 'https://thehill.com/homenews/feed/', category: 'General', tier: 1 },

  // ── Tier 2: Industry Verticals ──
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Technology', tier: 2 },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Technology', tier: 2 },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Technology', tier: 2 },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'Technology', tier: 2 },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'AI/ML', tier: 2 },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/', category: 'Technology', tier: 2 },
  { name: 'Axios', url: 'https://api.axios.com/feed/', category: 'General', tier: 2 },

  // ── Tier 3: Business & Finance ──
  { name: 'The Economist', url: 'https://www.economist.com/latest/rss.xml', category: 'Business', tier: 3 },
  { name: 'Bloomberg Markets', url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Finance', tier: 3 },
  { name: 'Forbes - Business', url: 'https://www.forbes.com/business/feed/', category: 'Business', tier: 3 },
  { name: 'MarketWatch', url: 'https://www.marketwatch.com/rss/topstories', category: 'Finance', tier: 3 },
  { name: 'WSJ - Markets', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', category: 'Finance', tier: 3 },
  { name: 'HBR', url: 'https://feeds.harvardbusiness.org/harvardbusiness', category: 'Leadership', tier: 3 },

  // ── Tier 4: Niche / Domain ──
  { name: 'Hacker News (Best)', url: 'https://hnrss.org/best', category: 'Technology', tier: 4 },
  { name: 'arXiv - CS.AI', url: 'https://rss.arxiv.org/rss/cs.AI', category: 'AI/ML', tier: 4 },
  { name: 'Nature - Latest Research', url: 'https://www.nature.com/nature.rss', category: 'Science', tier: 4 },
  { name: 'Healthcare IT News', url: 'https://www.healthcareitnews.com/feed', category: 'Healthcare', tier: 4 },
  { name: 'CleanTechnica', url: 'https://cleantechnica.com/feed/', category: 'Climate', tier: 4 },
  { name: 'Finextra', url: 'https://www.finextra.com/rss/headlines.aspx', category: 'Fintech', tier: 4 },
  { name: 'DeepMind Blog', url: 'https://deepmind.com/blog/feed/basic/', category: 'AI/ML', tier: 4 },

  // ── Tier 5: Aggregators (fallback) ──
  { name: 'Google News - Top', url: 'https://news.google.com/rss', category: 'General', tier: 5 },
  { name: 'Google News - Technology', url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB', category: 'Technology', tier: 5 },
  { name: 'Google News - Business', url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB', category: 'Business', tier: 5 },

  // ── Podcasts ──
  { name: 'HBR IdeaCast', url: 'https://feeds.harvardbusiness.org/harvardbusiness/ideacast', category: 'Leadership', tier: 3, type: 'podcast' },
  { name: 'a]6z Podcast', url: 'https://a16z.simplecast.com/rss', category: 'Technology', tier: 2, type: 'podcast' },
  { name: 'The Vergecast', url: 'https://feeds.megaphone.fm/vergecast', category: 'Technology', tier: 2, type: 'podcast' },
  { name: 'Lex Fridman Podcast', url: 'https://lexfridman.com/feed/podcast/', category: 'AI/ML', tier: 3, type: 'podcast' },
  { name: 'Acquired', url: 'https://acquired.libsyn.com/rss', category: 'Business', tier: 2, type: 'podcast' },
  { name: 'All-In Podcast', url: 'https://feeds.megaphone.fm/all-in-with-chamath-jason-sacks-friedberg', category: 'Technology', tier: 2, type: 'podcast' },
  { name: 'How I Built This', url: 'https://feeds.npr.org/510313/podcast.xml', category: 'Business', tier: 2, type: 'podcast' },
  { name: 'Masters of Scale', url: 'https://rss.art19.com/masters-of-scale', category: 'Leadership', tier: 3, type: 'podcast' },
];

/**
 * Map interest tags to relevant source categories.
 * Used to filter sources based on user preferences.
 */
export const INTEREST_TO_CATEGORIES: Record<string, string[]> = {
  'AI/ML': ['AI/ML', 'Technology'],
  'Technology': ['Technology'],
  'Leadership': ['Leadership', 'Strategy'],
  'Fintech': ['Fintech', 'Finance'],
  'Healthcare': ['Healthcare'],
  'Climate': ['Climate', 'Science'],
  'Education': ['Education'],
  'Finance': ['Finance', 'Fintech'],
  'Startups': ['Technology', 'Finance'],
  'Product Management': ['Technology', 'Strategy'],
  'Strategy': ['Strategy', 'Leadership'],
  'Science': ['Science'],
  'Policy & Regulation': ['General'],
  'Marketing': ['Strategy', 'Technology'],
  'Neuroscience': ['Science', 'Healthcare'],
  'Remote Work': ['Leadership', 'Technology'],
  'Cybersecurity': ['Technology'],
  'E-commerce': ['Technology', 'Business'],
  'Media & Entertainment': ['General', 'Technology'],
  'Real Estate': ['Finance', 'Business'],
};

/**
 * Suggested interest tags for the onboarding picker.
 */
export const SUGGESTED_INTERESTS = [
  'AI/ML', 'Technology', 'Leadership', 'Fintech', 'Healthcare',
  'Climate', 'Education', 'Finance', 'Startups', 'Product Management',
  'Strategy', 'Science', 'Policy & Regulation', 'Marketing',
  'Neuroscience', 'Remote Work', 'Cybersecurity', 'E-commerce',
  'Media & Entertainment', 'Real Estate', 'SaaS', 'Supply Chain',
  'Mental Health', 'Space', 'Crypto/Web3', 'Biotech',
];

/**
 * Industry options for onboarding.
 */
export const INDUSTRIES = [
  'Technology', 'Healthcare', 'Financial Services', 'Education',
  'Media & Entertainment', 'Consumer Products', 'Energy',
  'Manufacturing', 'Real Estate', 'Government', 'Nonprofit',
  'Professional Services', 'Retail', 'Transportation',
  'Telecommunications', 'Agriculture', 'Legal', 'Other',
];

/**
 * Seniority levels.
 */
export const SENIORITY_LEVELS = [
  { value: 'IC', label: 'Individual Contributor' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Director', label: 'Director' },
  { value: 'VP', label: 'VP / SVP' },
  { value: 'C-Suite', label: 'C-Suite' },
  { value: 'Founder', label: 'Founder / Co-Founder' },
];
