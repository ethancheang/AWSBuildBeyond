# AI craving orders (OpenAI API + Lambda Function URL)

`aws/ai-orders/index.mjs` takes a POST with `{ lessonId, stall, count, brief, vocabulary, examples }` and returns `{ orders: [{ q, a, stages?, friend? }] }`. It calls the OpenAI Chat Completions API (`gpt-5-mini` by default) with a forced tool call, then drops any order whose tokens are not in the given vocabulary or that mentions pork, lard or alcohol. The game checks every order again and falls back to authored orders on any error.

## 1. Get an OpenAI API key

At [platform.openai.com](https://platform.openai.com), check your credit under **Billing**, set a monthly budget under **Limits**, then **API keys > Create new secret key**. Copy it once; it is shown only at creation.

## 2. Create the Lambda (AWS Console, Asia Pacific (Singapore))

1. Lambda > **Create function** > Author from scratch, name `kopi-ai-orders`, runtime **Node.js 22.x**.
2. **Upload from > .zip file**: upload `kopi-that-ai-lambda.zip` (built from `aws/ai-orders` with `npm install` then zipping `index.mjs`, `package.json` and `node_modules`). Handler stays `index.handler`.
3. Configuration > General: **Timeout 15 s**, memory 256 MB.
4. Configuration > Environment variables:

| Key               | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| `OPENAI_API_KEY`  | your key from step 1                                               |
| `ALLOWED_ORIGINS` | `https://main.d225gi8pmcmeb4.amplifyapp.com,http://127.0.0.1:5173` |
| `MODEL_ID`        | optional; defaults to `gpt-5-mini`                                 |

No IAM changes are needed.

## 3. Function URL

1. Configuration > **Function URL** > Create, auth type **NONE**. Leave its CORS setting off; the code answers `OPTIONS` and sets `Access-Control-Allow-Origin` from `ALLOWED_ORIGINS`.
2. **Cost risk:** anyone with the URL can spend your OpenAI credit; CORS does not stop curl. Set Configuration > Concurrency > **Reserved concurrency = 5** and keep the OpenAI budget low.

## 4. Wire the game

Add to `.env.local` in the repo root, then rebuild (`npm run build`) and redeploy the Amplify zip:

```
VITE_AI_URL=https://<id>.lambda-url.ap-southeast-1.on.aws/
```

## Local test

```
cd aws/ai-orders && npm install && cd ../..
OPENAI_API_KEY=<key> node aws/ai-orders/local-test.mjs
```
