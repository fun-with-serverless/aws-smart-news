import { startMoto, stopMoto } from './../testUtils';
import { lambdaHandler, LATEST_ITEM_KEY, parseLatestItem } from '../../src/handlers/feedReader';
import axios, { AxiosError } from 'axios';

import { S3Client, GetObjectCommand, CreateBucketCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { ChildProcess } from 'child_process';

const FEED_SNIPPET = `
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<rss xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:slash="http://purl.org/rss/1.0/modules/slash/" xmlns:sy="http://purl.org/rss/1.0/modules/syndication/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" version="2.0">
	<channel>
		<title>
			AWS News Blog
		</title>
		<link href="https://aws.amazon.com/blogs/aws/feed/" rel="self" type="application/rss+xml" />
		<link>
			https://aws.amazon.com/blogs/aws/
		</link>
		<description>
			Announcements, Updates, and Launches
		</description>
		<item>
			<title>
				Amazon FSx for Lustre increases throughput to GPU instances by up to 12x
			</title>
			<link>
				https://aws.amazon.com/blogs/aws/amazon-fsx-for-lustre-unlocks-full-network-bandwidth-and-gpu-performance/
			</link>
			<creator>
				<![CDATA[Danilo Poccia]]>
			</creator>
			<pubDate>
				Wed, 27 Nov 2024 22:13:37 +0000
			</pubDate>
			<category>
				<![CDATA[Amazon FSx]]>
			</category>
			<category>
				<![CDATA[Amazon FSx for Lustre]]>
			</category>
			<guid isPermaLink="false">
				2b2f34f261d66fc71bf826f5410519524152023d
			</guid>
			<description>
				Amazon FSx for Lustre now features Elastic Fabric Adapter and NVIDIA GPUDirect Storage for up to 12x higher throughput to GPUs, unlocking new possibilities in deep learning, autonomous vehicles, and HPC workloads.
			</description>
			<encoded>
				&lt;p&gt;Hello AWS&lt;/p&gt;
			</encoded>
		</item>
	</channel>
</rss>
`;
describe('Feed Reader', () => {
  let moto: ChildProcess;
  const s3Client = new S3Client();
  beforeEach(async () => {
    moto = await startMoto();
    const axiosGetMock = jest.fn();
    axios.get = axiosGetMock;

    axiosGetMock.mockResolvedValue({ data: FEED_SNIPPET });

    process.env.S3_KB_BUCKET = 'test-bucket';

    await s3Client.send(new CreateBucketCommand({ Bucket: 'test-bucket' }));
  });

  afterEach(() => {
    stopMoto(moto);
  });

  test('Fetch feed and save item in S3', async () => {
    await lambdaHandler();

    // Check that latestItem.json was saved
    const response = await s3Client.send(new GetObjectCommand({ Bucket: 'test-bucket', Key: LATEST_ITEM_KEY }));
    const body = await response.Body?.transformToString();
    expect(body).toBeDefined();
    expect(body && parseLatestItem(body)).toEqual({
      pubDate: new Date('Wed, 27 Nov 2024 22:13:37 +0000'),
    });

    // Check that item was saved in S3
    const itemResponse = await s3Client.send(
      new GetObjectCommand({ Bucket: 'test-bucket', Key: 'rss-feed/2b2f34f261d66fc71bf826f5410519524152023d.json' }),
    );
    const itemBody = await itemResponse.Body?.transformToString();
    expect(itemBody && JSON.parse(itemBody)).toEqual({
      title: 'Amazon FSx for Lustre increases throughput to GPU instances by up to 12x',
      link: 'https://aws.amazon.com/blogs/aws/amazon-fsx-for-lustre-unlocks-full-network-bandwidth-and-gpu-performance/',
      pubDate: 'Wed, 27 Nov 2024 22:13:37 +0000',
      creator: 'Danilo Poccia',
      description:
        'Amazon FSx for Lustre now features Elastic Fabric Adapter and NVIDIA GPUDirect Storage for up to 12x higher throughput to GPUs, unlocking new possibilities in deep learning, autonomous vehicles, and HPC workloads.',
      categories: ['Amazon FSx', 'Amazon FSx for Lustre'],
      content: '<p>Hello AWS</p>',
      guid: '2b2f34f261d66fc71bf826f5410519524152023d',
    });
  });

  test('Fetch feed nothing is new', async () => {
    const params = {
      Bucket: 'test-bucket',
      Key: LATEST_ITEM_KEY,
      Body: JSON.stringify({ pubDate: new Date('Wed, 27 Nov 2024 22:13:37 +0000') }),
    };
    await s3Client.send(new PutObjectCommand(params));

    await lambdaHandler();

    // Check that latestItem.json did not change
    const getObj = await s3Client.send(new GetObjectCommand({ Bucket: 'test-bucket', Key: LATEST_ITEM_KEY }));
    const body = await getObj.Body?.transformToString();
    expect(body && parseLatestItem(body)).toEqual({
      pubDate: new Date('Wed, 27 Nov 2024 22:13:37 +0000'),
    });

    // Check that no item was saved in S3
    const listObj = await s3Client.send(new ListObjectsV2Command({ Bucket: 'test-bucket', Prefix: 'rss-feed' }));

    expect(listObj.Contents).toBeUndefined();
  });

  test('Failed fetching rss feed', async () => {
    axios.get = jest.fn().mockRejectedValue(new AxiosError());
    await expect(lambdaHandler()).rejects.toThrow();
  });
  test('Missing bucket env variable', async () => {
    delete process.env.S3_KB_BUCKET
    await expect(lambdaHandler()).rejects.toThrow();
  });
});
