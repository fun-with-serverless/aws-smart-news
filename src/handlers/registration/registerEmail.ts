import { parser } from '@aws-lambda-powertools/parser/middleware';
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import crypto from 'crypto';
import middy from '@middy/core';
import { EmailRegistration, emailRegistrationSchema } from './schema';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import httpErrorHandler from '@middy/http-error-handler';
import { LambdaFunctionURLResult } from 'aws-lambda';

const logger = new Logger();
const client = new DynamoDBClient();

export const lambdaHandler = middy<{TResult: LambdaFunctionURLResult}>()
  .use(parser({ schema: emailRegistrationSchema }))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpErrorHandler({ logger: (error) => logger.error(error.message, error) }))
  .handler(handler);

async function handler(event: EmailRegistration) {
  const tableName = process.env.REGISTERED_QUERIES_TABLE;
  if (!tableName) {
    throw new Error('REGISTERED_QUERIES_TABLE is not defined');
  }
  const { email, query } = event;

  await saveToDDB(email, query, tableName);
}

async function saveToDDB(email: string, query: string, tableName: string) {
  const randomIdentifier = crypto.randomUUID();
  logger.info('Saving email to DDB', { email, query });
  const command = new PutItemCommand({
    TableName: tableName,
    Item: {
      PK: { S: email },
      randomIdentifier: { S: randomIdentifier },
      query: { S: query },
      verified: { BOOL: false },
      createdAt: { S: new Date().toISOString() },
    },
  });
  await client.send(command);
}
