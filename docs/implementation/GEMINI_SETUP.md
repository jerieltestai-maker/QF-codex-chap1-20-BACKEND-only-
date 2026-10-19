# Gemini comparison advice

Local integration verified on 18 October 2026 with one fictional two-quote comparison using **gemini-3.5-flash-lite**. The owner selected Gemini and saved the key locally at a hidden prompt. No real job or personal data was used in that check.

Use this command from the project PowerShell terminal:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\setup-gemini.ps1
```

The execution-policy option applies only to that process. Wait for the hidden key prompt before pasting a key. The script writes work/secrets/gemini-api-key, restricts its Windows directory to the current account, and puts only provider/model/key-file settings in the ignored .env file. Never put a key in chat, source code, a browser field or a normal shell prompt. Revoke and replace any accidentally displayed key.

Restart the local API after configuration. Run `pnpm exec tsx tools/check-gemini.ts` for one small fictional live check. It prints success/model only; errors do not echo provider bodies or credentials. Ordinary automated tests mock the provider. To return to factual local advice, set ADVICE_PROVIDER=local and restart. Missing keys with ADVICE_PROVIDER=gemini fail startup rather than silently misconfigure the server.

The default model is Gemini 3.5 Flash-Lite. Google's published standard text pricing at verification was USD 0.30 per million input tokens and USD 2.50 per million output tokens; verify current billing before budgeting. At those rates, an illustrative 2,000-input/100-output-token call costs about USD 0.00085, excluding taxes and other services. The actual cost depends on usage. [Model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [pricing](https://ai.google.dev/gemini-api/docs/pricing).

The adapter sends compact structured facts rather than mass raw documents: anonymous candidate IDs, prices, availability/duration choices and approved score/source counts. No names, job/estate identifiers, free-text observations, referee contacts, files or private notes are sent. Requests use Google's stable v1 Interactions endpoint with store=false, no tools, minimal thinking and at most 256 output tokens. See [Interactions documentation](https://ai.google.dev/gemini-api/docs/interactions-overview).

Costs are bounded by explicit user requests, a maximum of 100 candidates/32 KiB input, a 15-second timeout, a 64 KiB response cap, no automatic provider retries, shared concurrent evaluations and reuse of saved results for unchanged evidence/provider/context. No preference or fewer than two candidates makes no provider call. New evidence may require a new explicit request. This is not a project-wide billing quota; configure account spending controls in Google separately.

The provider returns IDs/citations only. The backend validates them against the current comparison, rejects unsupported/stale advice and writes factual explanations itself. Unsupported priorities or missing comparable facts withhold a winner. A provider failure preserves local comparison/manual choice. Current price and availability are assessed separately from historical reputation.

This integration covers comparison advice, not arbitrary bulk-data ingestion. A later bulk-processing feature needs its own data minimization, batching, cost and accuracy checks. No paid fallback model or automatic upgrade is configured.
