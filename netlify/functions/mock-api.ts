import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import Mock from 'mockjs';
import mockRoutes from '../../mock-data.js';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: ''
    };
  }

  // 解析请求路径（使用 rawPath 优先，移除函数前缀）
  const path = event.rawPath ? event.rawPath : (event.path || '');
  const cleanPath = decodeURIComponent(path.replace('/.netlify/functions/mock-api', '') || '/');

  // 查找匹配的 mock 路由
  const route = mockRoutes.find(r => {
    const pathMatch = r.url === cleanPath;
    const methodMatch = !r.method ||
      (Array.isArray(r.method) ? r.method.includes(event.httpMethod) :
       r.method.toUpperCase() === event.httpMethod);
    return pathMatch && methodMatch;
  });

  if (route) {
    const responseData = typeof route.response === 'function'
      ? route.response()
      : route.response;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(Mock.mock(responseData))
    };
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Mock route not found' })
  };
};

export { handler };
