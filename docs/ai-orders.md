# AI craving orders (Bedrock + Lambda Function URL)

`aws/ai-orders/index.mjs` takes a POST with `{ lessonId, stall, count, brief, vocabulary, examples }` and returns `{ orders: [{ q, a, stages?, friend? }] }`. It calls the Bedrock Converse API with a forced tool call, then drops any order whose tokens are not in the given vocabulary or that mentions pork, lard or alcohol.

All steps use the AWS Console, region **Asia Pacific (Singapore) ap-southeast-1**.

## 1. Enable the model in Bedrock

1. Bedrock console > **Model access** > enable an Anthropic Claude Haiku model (fill in the Anthropic use-case form if asked).
2. Bedrock > **Cross-region inference** (Inference profiles). Copy the ID of a Haiku profile that lists Singapore, for example `apac.anthropic.claude-3-haiku-20240307-v1:0` or a newer `apac.anthropic.claude-...haiku...` one. This is `MODEL_ID`.

## 2. Create the Lambda

1. Lambda > **Create function** > Author from scratch, name `kopi-ai-orders`, runtime **Node.js 22.x**, arm64 is fine.
2. In the code editor, rename `index.js` to `index.mjs`, paste `aws/ai-orders/index.mjs`, **Deploy**. Handler stays `index.handler`. No packages needed; the AWS SDK v3 is built into the runtime.
3. Configuration > General: **Timeout 15 s**, memory 256 MB.
4. Configuration > Environment variables:

| Key               | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| `MODEL_ID`        | the inference profile ID from step 1                               |
| `ALLOWED_ORIGINS` | `https://main.d225gi8pmcmeb4.amplifyapp.com,http://127.0.0.1:5173` |

## 3. IAM permission

Configuration > Permissions > click the execution role > **Add permissions > Create inline policy** (JSON):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:ap-southeast-1:<ACCOUNT_ID>:inference-profile/<MODEL_ID>",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
      ]
    }
  ]
}
```

An APAC inference profile routes to several APAC regions, so the foundation-model resource needs the `*` region. The Converse API is authorised by `bedrock:InvokeModel`.

## 4. Function URL

1. Configuration > **Function URL** > Create, auth type **NONE**.
2. CORS: either leave it off (the code already answers `OPTIONS` and sets `Access-Control-Allow-Origin` from `ALLOWED_ORIGINS`), or turn it on with the same two origins, method `POST`, header `content-type`. If you turn it on, the Function URL handles CORS and the code headers are ignored for preflight; do not use both with different origin lists.
3. **Cost risk:** auth NONE means anyone with the URL can call Bedrock on your bill. CORS does not stop curl. Cap it with Configuration > Concurrency > **Reserved concurrency = 5**, and set an AWS Budgets alert.

## 5. Wire the game

Add to `.env.local` in the repo root, then rebuild (`npm run build`) and redeploy the Amplify zip:

```
VITE_AI_URL=https://<id>.lambda-url.ap-southeast-1.on.aws/
```

## Local test

With AWS credentials that have the permission above:

```
MODEL_ID=apac.anthropic.claude-3-haiku-20240307-v1:0 node aws/ai-orders/local-test.mjs
```

This needs `@aws-sdk/client-bedrock-runtime` resolvable locally (`npm i -D @aws-sdk/client-bedrock-runtime` if it is not already installed). In the Lambda console you can instead use **Test** with an event whose `body` is the JSON string and `requestContext.http.method` is `POST`.
