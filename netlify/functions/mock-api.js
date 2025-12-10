import { createLogger } from 'vite-plugin-mock-dev-server/server';
import mockData from '../../mock-data.js';

const logger = createLogger('mock-server', 'error');

export async function handler(event) {
  const { path } = event;
  const method = event.httpMethod;

  if (event.headers['upgrade'] === 'websocket') {
    return {
      statusCode: 101,
      body: 'WebSocket upgrade not supported in Netlify Functions'
    };
  }

  const matched = mockData.find(
    item => item.url === path && item.method === method
  );

  if (matched) {
    logger.info(`${method} ${path} -> 200`);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(matched.response)
    };
  }

  logger.error(`${method} ${path} -> 404`);
  return {
    statusCode: 404,
    body: JSON.stringify({ message: 'Not Found' })
  };
}
