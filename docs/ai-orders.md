# AI craving orders (Anthropic API + Lambda Function URL)

`aws/ai-orders/index.mjs` takes a POST with `{ lessonId, stall, count, brief, vocabulary, examples }` and returns `{ orders: [{ q, a, stages?, friend? }] }`. It calls the Anthropic Messages API (Claude Haiku 5.5 by default) with a forced tool call, then drops any order whose tokens are not in the given vocabulary or that mentions pork, lard or alcohol. The game checks every order again and falls back to authored orders on any error.

## 1. Get an Anthropic API key

At [console.anthropic.com](https://console.anthropic.com), add credit under **Billing**, set a monthly spend limit, then **API keys > Create key**. Copy it once; it is shown only at creation.

## 2. Create the Lambda (AWS Console, Asia Pacific (Singapore))

1. Lambda > **Create function** > Author from scratch, name `kopi-ai-orders`, runtime **Node.js 22.x**.
2. **Upload from > .zip file**: upload `kopi-that-ai-lambda.zip` (built from `aws/ai-orders` with `npm install` then zipping `index.mjs`, `package.json` and `node_modules`). Handler stays `index.handler`.
3. Configuration > General: **Timeout 15 s**, memory 256 MB.
4. Configuration > Environment variables:

| Key                 | Value                                                              |
| ------------------- | ------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | your key from step 1                                               |
| `ALLOWED_ORIGINS`   | `https://main.d225gi8pmcmeb4.amplifyapp.com,http://127.0.0.1:5173` |
| `MODEL_ID`          | optional; defaults to `claude-haiku-5-5`                           |

No IAM changes are needed.

## 3. Function URL

1. Configuration > **Function URL** > Create, auth type **NONE**. Leave its CORS setting off; the code answers `OPTIONS` and sets `Access-Control-Allow-Origin` from `ALLOWED_ORIGINS`.
2. **Cost risk:** anyone with the URL can spend your Anthropic credit; CORS does not stop curl. Set Configuration > Concurrency > **Reserved concurrency = 5** and keep the Anthropic spend limit low.

## 4. Wire the game

Add to `.env.local` in the repo root, then rebuild (`npm run build`) and redeploy the Amplify zip:

```
VITE_AI_URL=https://<id>.lambda-url.ap-southeast-1.on.aws/
```

## Local test

```
cd aws/ai-orders && npm install && cd ../..
ANTHROPIC_API_KEY=<key> node aws/ai-orders/local-test.mjs
```
