process.env.AWS_ENDPOINT_URL = 'http://127.0.0.1:5000';

import { expect, test, describe, beforeEach, afterEach } from 'vitest';

import { lambdaHandler } from '../../../src/handlers/registration/registerEmail';
import { startMoto, stopMoto } from '../../testUtils';

import { ChildProcess } from 'child_process';
import { Context as LambdaContext } from 'aws-lambda';
import { CreateTableCommand, DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

describe('Register query', () => {
  let moto: ChildProcess;
  const ddbClient = new DynamoDBClient();
  beforeEach(async () => {
    moto = await startMoto(5000);

    process.env.REGISTERED_QUERIES_TABLE = 'test-ddb';

    await ddbClient.send(
      new CreateTableCommand({
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          {
            AttributeName: 'PK',
            AttributeType: 'S',
          },
        ],
        TableName: process.env.REGISTERED_QUERIES_TABLE,
        KeySchema: [
          {
            AttributeName: 'PK',
            KeyType: 'HASH',
          },
        ],
      }),
    );
  });

  afterEach(() => {
    stopMoto(moto);
  });

  test('Valid email and query are saved into DDB', async () => {
    const mail = 'myemail@mail.com';
    await lambdaHandler({ email: mail, query: 'Save me money' }, {} as LambdaContext);

    // Check that item was created in DDB
    const response = await ddbClient.send(
      new GetItemCommand({
        TableName: process.env.REGISTERED_QUERIES_TABLE,
        Key: {
          PK: {
            S: mail,
          },
        },
      }),
    );

    expect(response.Item?.PK.S).toBe(mail);
    expect(response.Item?.query.S).toBe('Save me money');
  });

  test('Missing ddb env variable', async () => {
    delete process.env.REGISTERED_QUERIES_TABLE;
    const response = await lambdaHandler({ email: 'myemail@mail.com', query: 'Save me money' }, {} as LambdaContext);
    await expect(response.statusCode).toBe(500);
  });

  test('Email is not valid', async () => {
    const response = await lambdaHandler({ email: 'ddd', query: 'Save me money' }, {} as LambdaContext);
    await expect(response.statusCode).toBe(500);
  });
});
