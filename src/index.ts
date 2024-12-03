

// Convert xml2js callback to promise

// Define interfaces for the RSS feed structure


class AWSBlogFetcher {
  private readonly feedUrl: string;

  constructor(feedUrl: string = 'https://aws.amazon.com/blogs/aws/feed/') {
    this.feedUrl = feedUrl;
  }

  async fetchFeed(): Promise<RSSFeed> {
    try {
      const response = await axios.get(this.feedUrl);
      const parsedXml = (await parseXMLPromise(response.data)) as XMLRSSResponse;
      return this.transformRSSData(parsedXml);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch RSS feed: ${error.message}`);
      }
      throw error;
    }
  }

  private transformRSSData(data: XMLRSSResponse): RSSFeed {
    const channel = data.rss.channel[0];

    const items: RSSItem[] = channel.item.map((item) => ({
      title: item.title[0],
      link: item.link[0],
      pubDate: item['pubDate'][0],
      creator: item['dc:creator']?.[0] ?? '',
      description: item.description[0],
      contentEncoded: item['content:encoded']?.[0] ?? '',
      categories: item.category ?? [],
    }));

    return {
      items,
      title: channel.title[0],
      description: channel.description[0],
      lastBuildDate: channel.lastBuildDate[0],
    };
  }

  async getLatestPosts(count: number = 5): Promise<RSSItem[]> {
    const feed = await this.fetchFeed();
    return feed.items.slice(0, count);
  }
}

// Example usage
async function displayLatestAWSPosts() {
  const fetcher = new AWSBlogFetcher();

  try {
    const latestPosts = await fetcher.getLatestPosts(3);

    console.log('Latest AWS Blog Posts:');
    latestPosts.forEach((post, index) => {
      console.log(`\n${index + 1}. ${post.title}`);
      console.log(`Published: ${post.pubDate}`);
      console.log(`Link: ${post.link}`);
      console.log(`Author: ${post.creator}`);
      console.log(`Categories: ${post.categories.join(', ')}`);
      console.log('\nContent Preview:');
      console.log(post.contentEncoded);
    });
  } catch (error) {
    console.error('Error fetching AWS blog posts:', error);
  }
}

// Run the example
displayLatestAWSPosts().finally(() => {
  console.info('Done');
});
