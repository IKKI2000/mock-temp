import { createServer } from 'node:http';
import connect from 'connect';
import corsMiddleware from 'cors';
import { baseMiddleware, createLogger, mockWebSocket } from 'vite-plugin-mock-dev-server/server';
import mockData from '../../mock-data.js';

// 创建一个与你的 index.js 类似的 app，但不对外监听端口
const app = connect();
const logger = createLogger('mock-server', 'error');
const proxies = ["/admin-api/"];
const wsProxies = [];
const cookiesOptions = {};
const bodyParserOptions = {};
const priority = {};
const compiler = { mockData };

// 应用中间件 - 这部分与你原来的 index.js 完全一致
app.use(corsMiddleware());
app.use(baseMiddleware(compiler, {
  formidableOptions: { multiples: true },
  proxies,
  priority,
  cookiesOptions,
  bodyParserOptions,
  logger,
}));

// 导出 Netlify Function 要求的 handler 函数
export const handler = async (event, context) => {
  // 1. 创建一个模拟的 HTTP Request 对象 (IncomingMessage)
  const req = new Stream.Readable({
    read() {}
  });
  req.url = event.path;
  req.method = event.httpMethod;
  req.headers = event.headers || {};
  req.rawHeaders = [];
  for (const [key, value] of Object.entries(req.headers)) {
    req.rawHeaders.push(key, value);
  }

  // 如果有请求体，将其添加到 req 中
  if (event.body) {
    req.push(event.body);
    req.push(null); // 表示数据结束
  }

  // 2. 创建一个模拟的 HTTP Response 对象 (ServerResponse)
  const res = new Stream.Writable({
    write(chunk, encoding, callback) {
      if (!this.body) this.body = [];
      this.body.push(chunk);
      callback();
    }
  });
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (key, value) => { res.headers[key.toLowerCase()] = value; };
  res.getHeader = (key) => res.headers[key.toLowerCase()];
  res.removeHeader = (key) => { delete res.headers[key.toLowerCase()]; };
  res.writeHead = (statusCode, headers) => {
    res.statusCode = statusCode;
    if (headers) {
      Object.assign(res.headers, headers);
    }
  };
  const responsePromise = new Promise((resolve) => {
    res.end = (data) => {
      if (data) {
        if (!res.body) res.body = [];
        res.body.push(Buffer.from(data));
      }
      // 收集完整的响应体
      const body = res.body ? Buffer.concat(res.body).toString() : '';
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: body
      });
    };
  });

  // 3. 将 req 和 res 交给 connect app 处理
  app(req, res);

  // 4. 等待处理完成并返回 Netlify 要求的格式
  return responsePromise;
};

// 为了支持 Stream 对象，我们需要引入 stream 模块
import * as Stream from 'stream';
