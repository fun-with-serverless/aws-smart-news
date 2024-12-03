import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { RSSFeed, RSSItem, XMLRSSResponse } from '../types';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const parseXMLPromise = promisify(parseString);
const AWS_RSS_FEED = 'https://aws.amazon.com/blogs/aws/feed/';
const s3Client = new S3Client();

export const LATEST_ITEM_KEY = 'latestItem.json';

export const lambdaHandler = async () => {
  const kbBucket = process.env.S3_KB_BUCKET;

  if (!kbBucket) {
    throw new Error('S3_KB_BUCKET environment variable not set');
  }
  const items = await fetchFeed();
  const latestSavedItem = await getLatestSavedItem(s3Client, kbBucket);
  items.items
    .filter((item) => new Date(item.pubDate) > latestSavedItem.pubDate)
    .forEach(async (item) => await saveItem(item, s3Client, kbBucket));
  await saveLatestSavedItemMeta(items, s3Client, kbBucket);
};

const fetchFeed = async (): Promise<RSSFeed> => {
  try {
    const response = await axios.get(AWS_RSS_FEED);
    const parsedXml = (await parseXMLPromise(response.data)) as XMLRSSResponse;
    return transformRSSData(parsedXml);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch RSS feed: ${error.message}`);
    }
    throw error;
  }
};

async function getLatestSavedItem(s3Client: S3Client, bucketName: string): Promise<LatestItem> {
  const defaultItem = {
    pubDate: new Date(0),
  };

  try {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: LATEST_ITEM_KEY }));
    const body = await response.Body?.transformToString('utf8');
    if (!body) {
      return defaultItem;
    }
    return parseLatestItem(body);
  } catch (error) {
    if ((error as { name?: string }).name === 'NoSuchKey') {
      return defaultItem;
    }
    throw error;
  }
}

async function saveLatestSavedItemMeta(feed: RSSFeed, s3Client: S3Client, bucketName: string): Promise<void> {
  const latestItem = feed.items.reduce((latest, current) => (new Date(current.pubDate) > new Date(latest.pubDate) ? current : latest));
  const params = {
    Bucket: bucketName,
    Key: LATEST_ITEM_KEY,
    Body: JSON.stringify({ pubDate: latestItem.pubDate }),
  };
  await s3Client.send(new PutObjectCommand(params));
}

const transformRSSData = (data: XMLRSSResponse): RSSFeed => {
  const channel = data.rss.channel[0];

  const items: RSSItem[] = channel.item.map((item) => ({
    title: item.title[0].trim(),
    link: item.link[0].trim(),
    pubDate: item['pubDate'][0].trim(),
    creator: item.creator?.[0].trim() ?? '',
    description: item.description[0].trim(),
    content: item.encoded?.[0].trim() ?? '',
    categories: item.category?.map((item) => item.trim()) ?? [],
    guid: item.guid[0]._.trim(),
  }));

  return {
    items,
    title: channel.title[0],
    description: channel.description[0],
  };
};
async function saveItem(item: RSSItem, s3Client: S3Client, bucketName: string): Promise<void> {
  const params = {
    Bucket: bucketName,
    Key: `rss-feed/${item.guid}.json`,
    Body: JSON.stringify(item),
  };
  await s3Client.send(new PutObjectCommand(params));
}

export interface LatestItem {
  pubDate: Date;
}

export const parseLatestItem = (body: string): LatestItem => {
  return JSON.parse(body, (key, value) => (key === 'pubDate' ? new Date(value) : value));
};
