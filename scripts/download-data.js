#!/usr/bin/env node

/**
 * Download pre-built WordWorkshop dictionary data from the latest GitHub release.
 *
 * This is the fastest way to get data/ set up locally (~30 seconds vs ~10 minutes
 * for building from Wiktionary source).
 *
 * Usage:
 *   node scripts/download-data.js
 *
 * What it does:
 *   1. Fetches the latest release from GitHub
 *   2. Downloads dictionary-data.tar.gz from the release assets
 *   3. Extracts data/*.json into the project's data/ directory
 *
 * Requires:
 *   - Node.js 18+
 *   - `tar` command available (macOS, Linux, Windows 10+)
 *
 * If no release with dictionary data exists yet, run the full pipeline instead:
 *   node scripts/prepare-wiktionary.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = 'aetiss/dictionary_browser_extension';
const ASSET_NAME = 'dictionary-data.tar.gz';
const OUT_DIR = path.join(__dirname, '..', 'data');
const API_BASE = 'https://api.github.com';

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function get(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'wordworkshop-download-data/1.0',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...extraHeaders,
      },
    };

    https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(get(res.headers.location, extraHeaders));
        res.resume();
        return;
      }

      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    function attempt(targetUrl) {
      const file = fs.createWriteStream(destPath);

      https.get(targetUrl, { headers: { 'User-Agent': 'wordworkshop-download-data/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          try { fs.unlinkSync(destPath); } catch {}
          attempt(res.headers.location);
          res.resume();
          return;
        }

        if (res.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(destPath); } catch {}
          reject(new Error(`HTTP ${res.statusCode} downloading asset`));
          res.resume();
          return;
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        let lastPct = -1;

        res.on('data', (chunk) => {
          received += chunk.length;
          if (total > 0) {
            const pct = Math.floor((received / total) * 100);
            if (pct !== lastPct && pct % 10 === 0) {
              process.stdout.write(`  ${pct}%\r`);
              lastPct = pct;
            }
          }
        });

        res.pipe(file);
        file.on('finish', () => {
          file.close();
          process.stdout.write('  100%\n');
          resolve();
        });
        file.on('error', (err) => {
          try { fs.unlinkSync(destPath); } catch {}
          reject(err);
        });
      }).on('error', (err) => {
        try { fs.unlinkSync(destPath); } catch {}
        reject(err);
      });
    }

    attempt(url);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('WordWorkshop — Download Pre-built Dictionary Data');
  console.log('==================================================');
  console.log(`Repository: ${REPO}\n`);

  // Step 1: fetch latest release metadata
  process.stdout.write('Fetching latest release info... ');
  const { status, body } = await get(`${API_BASE}/repos/${REPO}/releases/latest`);

  if (status === 404) {
    throw new Error(
      'No releases found for this repository.\n\n' +
      'Build data locally instead:\n' +
      '  node scripts/prepare-wiktionary.js',
    );
  }
  if (status !== 200) {
    throw new Error(`GitHub API returned HTTP ${status}. Check your network connection.`);
  }

  const release = JSON.parse(body);
  console.log(`found ${release.tag_name} (${release.name || release.tag_name})`);

  // Step 2: find the dictionary data asset
  const asset = (release.assets || []).find((a) => a.name === ASSET_NAME);

  if (!asset) {
    throw new Error(
      `Release ${release.tag_name} does not include a "${ASSET_NAME}" asset.\n\n` +
      'This asset is published automatically by the data-release CI workflow when a\n' +
      'new GitHub release is created. It may not have been built for this release yet.\n\n' +
      'Build data locally instead:\n' +
      '  node scripts/prepare-wiktionary.js',
    );
  }

  const sizeMB = (asset.size / 1024 / 1024).toFixed(1);
  console.log(`Asset: ${ASSET_NAME}  (${sizeMB} MB)`);

  // Step 3: download
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpFile = path.join(OUT_DIR, '..', ASSET_NAME);

  console.log(`\nDownloading...`);
  await downloadFile(asset.browser_download_url, tmpFile);

  // Step 4: extract
  console.log('Extracting...');
  const projectRoot = path.join(__dirname, '..');
  try {
    execSync(`tar -xzf "${tmpFile}" -C "${projectRoot}"`, { stdio: 'pipe' });
  } catch (err) {
    throw new Error(`tar extraction failed: ${err.message}\n\nMake sure "tar" is installed.`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }

  // Step 5: verify
  const jsonFiles = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json'));
  if (jsonFiles.length === 0) {
    throw new Error('Extraction succeeded but data/ contains no JSON files. The release asset may be corrupt.');
  }

  console.log(`\nDone! ${jsonFiles.length} letter files in data/`);
  console.log('You can now load the extension in your browser.');
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
