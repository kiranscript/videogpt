# VideoGPT Studio setup and development

## Run locally

Use Node.js 22 or newer. The repository pins Node.js 24 in `next/.nvmrc`.

```sh
git clone https://github.com/kiranscript/videogpt.git
cd videogpt/next
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Templates, editing,
playback, and export work without an API key.

### Enable prompt generation

From `next/`, copy the environment template.

```sh
cp .env.example .env.local
```

Set `OPENROUTER_API_KEY` to your OpenRouter API key and `DEFAULT_MODEL` to an
OpenRouter model ID in `.env.local`, then restart the dev server. The API key
stays on the server.

## Development

The Next.js app lives in `next/`.

| Path within `next/` | Role |
| --- | --- |
| `src/components/studio/` | Editor, canvas, Properties, and timeline |
| `src/lib/project/` and `src/lib/workspace/` | Project format, templates, editing, undo, and browser storage |
| `src/lib/schema/` | Runtime schemas and TypeScript types |
| `src/lib/generation/` and `src/app/api/generate/` | Scene planning, generation, and the streaming API |
| `src/lib/rendering/` and `src/lib/export/` | Shared canvas renderer and browser encoders |
| `src/lib/evaluation/` | Generation evaluation cases and visual diagnostics |

Run the project checks from `next/`.

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

With the development server running, install Chromium and run the browser
regression tests.

```sh
npx playwright install chromium
npm run test:ui
```

Set `UI_BASE_URL` to test another server or `E2E_CHROMIUM_PATH` to use an
existing Chromium executable. The [UI review record](ui-review.md)
describes the interactions covered.

With OpenRouter configured, `npm run evaluate` runs eight generation cases and
writes project JSON, diagnostics, model identity, and timing to
`evaluation-artifacts/`.

## Deploy to Vercel

Set the Vercel Root Directory to `next`. To enable prompt generation, add
`OPENROUTER_API_KEY` and `DEFAULT_MODEL` to the project's environment variables.
