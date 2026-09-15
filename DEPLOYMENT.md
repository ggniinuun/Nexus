# Run And Deploy Advaita

## Local

Use Node.js 20 or newer. In the project folder, run:

```text
node serve.mjs
```

Open http://127.0.0.1:5173/. If that port is busy, run `node serve.mjs 5174` and open port 5174 instead. Stop with Ctrl+C. No npm install, build step, API key or network connection is needed after extraction. All JavaScript libraries, icons and fonts are included.

Python 3 is an alternative: `python -m http.server 5173 --bind 127.0.0.1` from the project folder. Do not open index.html by double-clicking: browser modules need HTTP.

## Existing GitHub Pages Site

Use **Advaita-GitHub-Pages.zip**, not the complete private archive.

1. Extract it. It contains one folder, `advaita`, with index.html, all source files and all assets.
2. In your existing GitHub repository, open **Settings > Pages** and note the current publishing source. Keep the existing domain and publishing settings.
3. If the source is a branch with `/ (root)`, add the `advaita` folder to that branch's root. If it uses `/docs`, add it as `docs/advaita`. Commit and push, or use GitHub's **Add file > Upload files** to upload the extracted folder and commit. Upload files, not the ZIP itself. Keep folder names and nesting intact.
4. If the source is GitHub Actions, include the `advaita` folder in the static output your existing workflow publishes. For frameworks this is commonly a `public` folder, but use your project's existing output convention. Do not replace its workflow just to add Advaita.
5. After the Pages deployment succeeds, open your existing site's URL with `/advaita/` appended. A project site such as `https://USERNAME.github.io/REPOSITORY/` becomes `https://USERNAME.github.io/REPOSITORY/advaita/`. A custom domain becomes `https://example.com/advaita/`.

Do not replace the site's current index.html, CNAME or other pages. Advaita's relative paths support the subfolder. Its nested .nojekyll file is included for standalone static hosting; do not add a new root .nojekyll to an existing Jekyll site, because that would change how the existing site builds.

Official references: [Configure a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [Create a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Take Your Data With You

Your existing browser entries were exported into the private archive under `private-backup/`. On the deployed app, open your profile > Import memories, choose that `advaita-private-*.json` file and press **Restore backup**. This reads the file locally in your browser; it does not upload it to GitHub. Existing matching entries are kept.

Alternatively, import `project/private/context.json` from the private archive using the same control, then choose **Import personal context**. This restores the nine curated memories and personal study suggestions, not your complete activity history.

Each browser/device stores its own entries. Export a fresh backup before switching devices or clearing storage. A GitHub Pages address is public; never commit the complete private ZIP, the original Claude ZIPs, exported backups or the private folder. The public release intentionally disables automatic private-context loading.

## iPhone

Open the deployed HTTPS link in Safari. Optionally use Share > Add to Home Screen. Import your private backup in that same browser/app context. There is no native HealthKit access, push notification service, cross-device sync or service-worker offline cache in this build.

## Troubleshooting

- 404: confirm the extracted folder is in the actual publishing source/output and the URL ends in `/advaita/`.
- Missing sculpture or icons: preserve the vendor and fonts folders; check that the Pages deployment finished. A modern WebGL2-capable browser is required for the sculpture.
- Missing personal entries: localhost and GitHub Pages use different storage. Restore a backup on the new origin.
- No automatic AI response: this release has local capture and planning rules; external AI and account integrations remain unconnected.
