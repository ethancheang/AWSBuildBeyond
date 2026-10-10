// Run: MODEL_ID=apac.anthropic.claude-3-haiku-20240307-v1:0 ALLOWED_ORIGINS=http://127.0.0.1:5173 node aws/ai-orders/local-test.mjs
// Needs AWS credentials (env vars or ~/.aws) with bedrock:InvokeModel in ap-southeast-1.
import { handler } from './index.mjs';

const body = {
  lessonId: 'drinks',
  stall: 'Kopi stall',
  count: 2,
  brief: 'Morning and afternoon drink cravings.',
  vocabulary: [
    { term: 'kopi', category: 'base', meaning: 'coffee with condensed milk' },
    { term: 'teh', category: 'base', meaning: 'tea with condensed milk' },
    { term: 'milo', category: 'base', meaning: 'chocolate malt drink' },
    { term: 'O', category: 'milk', meaning: 'no milk' },
    { term: 'C', category: 'milk', meaning: 'evaporated milk' },
    { term: 'kosong', category: 'sugar', meaning: 'no sugar' },
    { term: 'siew dai', category: 'sugar', meaning: 'less sugar' },
    { term: 'ga dai', category: 'sugar', meaning: 'more sugar' },
    { term: 'peng', category: 'temp', meaning: 'iced' },
    { term: 'gau', category: 'strength', meaning: 'strong' },
  ],
  examples: [
    {
      q: 'You want a strong black coffee, no sugar, iced.',
      a: ['kopi', 'O', 'kosong', 'gau', 'peng'],
    },
    {
      q: 'You want tea with evaporated milk and less sugar.',
      a: ['teh', 'C', 'siew dai'],
    },
  ],
};

const res = await handler({
  requestContext: { http: { method: 'POST' } },
  headers: { origin: 'http://127.0.0.1:5173' },
  body: JSON.stringify(body),
});
console.log(res.statusCode, res.headers);
console.log(JSON.stringify(JSON.parse(res.body), null, 2));
