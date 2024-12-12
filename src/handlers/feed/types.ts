export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  creator: string;
  description: string;
  categories: string[];
  content: string;
  guid: string;
}

export interface RSSFeed {
  items: RSSItem[];
  title: string;
  description: string;
}

interface XMLRSSChannel {
  title: string[];
  description: string[];
  lastBuildDate: string[];
  item: Array<{
    title: string[];
    link: string[];
    pubDate: string[];
    creator: string[];
    description: string[];
    category?: string[];
    encoded: string[];
    guid: Array<{
      _: string; // The actual guid text content
      $: {
        // The attributes
        isPermaLink: string;
      };
    }>;
  }>;
}

export interface XMLRSSResponse {
  rss: {
    channel: XMLRSSChannel[];
  };
}
