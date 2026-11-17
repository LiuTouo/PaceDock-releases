# Website maintenance

This repository hosts release downloads and a small bilingual product site. It does not contain the PaceDock desktop application's source code. The website has no runtime dependencies or build step; only `docs/` is published.

## Preview and test

Use Node.js 20 or newer:

```sh
npm ci
npm run preview
```

Open <http://127.0.0.1:4173/PaceDock-releases/> or its `en/` page. The loopback-only preview intentionally includes the repository subpath used by GitHub Pages. Stop the preview before running tests; Playwright starts its own server.

```sh
# Install the isolated test browser first (all platforms).
npx playwright install --with-deps chromium
npm test
```

Local checks and CI both use Playwright's isolated Chromium, not your system browser. Playwright is a development-only dependency. Screenshots and traces are written under the ignored `test-results/` directory.

To run the same browser checks against the published website, set `SITE_URL` to the complete site URL **with a trailing slash**, then run `npm test`. The tests interact only with fictional demo data. The local-server-only tests are skipped for a remote site.

```sh
# Bash
SITE_URL=https://liutouo.github.io/PaceDock-releases/ npm test
```

## Content rules

- Keep `README.md` and `README.en.md`, and both HTML pages, equivalent in meaning. Shared styling and demo behavior live under `docs/assets/`.
- Keep download links on `/releases/latest`; do not hardcode desktop version numbers or versioned asset names.
- Label the browser demonstration as fictional. It performs no GPU, driver, registry, or network operations.
- Do not claim performance gains, statistical significance, or anti-cheat compatibility. The synthetic-load ranking and the "close" heuristic are display aids, not certifications.
- Do not publish private source code, internal release scripts or credentials, real local paths, or screenshots of personal data.
- Preserve existing release assets and updater manifests. A website change must not produce a new desktop version or tag.
- The site uses local images and system fonts. Do not add third-party trackers, forms, remote scripts, or font services.

## Deployment

The `Website checks and Pages` workflow tests pull requests. Pushes to `main` and manual runs on `main` deploy only after tests pass. The deployment uses GitHub's Pages actions, the `github-pages` environment, and job-scoped `pages: write` / `id-token: write` permissions. No personal access token is required.

The repository's **Settings → Pages → Source** must be **GitHub Actions**. Upload only `docs/`, never the repository root or desktop build output.

Before publishing, verify both languages, keyboard interaction, reduced motion, no-JavaScript fallback, and mobile layouts. Afterwards, repeat the checks against the public URL and confirm the download link still leads to the existing latest release.
