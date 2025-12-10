import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import Mock from 'mockjs';
import mockData from '../../mock-data.js';

// 从Vite生成的mock数据中提取路由数组
const mockRoutes = mockData.default || [];

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('Request received:', {
    method: event.httpMethod,
    path: event.path,
    rawPath: event.rawPath,
    query: event.queryStringParameters
  });

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
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

  console.log('Cleaned path:', cleanPath);
  console.log('Mock routes count:', mockRoutes.length);

  // 查找匹配的 mock 路由
  const route = mockRoutes.find(r => {
    const pathMatch = r.url === cleanPath;
    const methodMatch = !r.method ||
      (Array.isArray(r.method) ? r.method.includes(event.httpMethod) :
       r.method.toUpperCase() === event.httpMethod);
    return pathMatch && methodMatch;
  });

  if (route) {
    console.log('Route found:', { url: route.url, method: route.method });
    const responseData = typeof route.response === 'function'
      ? route.response()
      : route.response;

    const mockedResponse = Mock.mock(responseData);
    console.log('Generated mock response');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(mockedResponse)
    };
  }

  console.log('Route not found for path:', cleanPath);
  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Mock route not found', requestedPath: cleanPath })
  };
};

export { handler };
