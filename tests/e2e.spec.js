const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const EXTENSION_PATH = path.join(__dirname, '..');

test.describe('Dictionary Extension E2E — Random Wikipedia Page', () => {
  let context;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-gpu',
      ],
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('double-click a word on a random Wikipedia page shows tooltip', async () => {
    const page = await context.newPage();

    await page.goto('https://en.wikipedia.org/wiki/Special:Random', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const title = await page.title();
    console.log(`\n  Random Wikipedia page: ${title}`);
    console.log(`  URL: ${page.url()}`);

    // Wait for a paragraph that actually has visible text
    await page.waitForSelector('#mw-content-text p:not(.mw-empty-elt)', { timeout: 10000 });

    // Find a good word to double-click
    const targetWord = await page.evaluate(() => {
      const paragraphs = document.querySelectorAll('#mw-content-text p:not(.mw-empty-elt)');
      for (const p of paragraphs) {
        const text = p.textContent;
        if (text && text.trim().length > 50) {
          const words = text.match(/\b[a-z]{4,10}\b/g);
          if (words && words.length > 0) {
            return words[Math.min(3, words.length - 1)];
          }
        }
      }
      return null;
    });

    expect(targetWord).toBeTruthy();
    console.log(`  Target word: "${targetWord}"`);

    const wordBounds = await page.evaluate((word) => {
      const walker = document.createTreeWalker(
        document.querySelector('#mw-content-text'),
        NodeFilter.SHOW_TEXT,
      );
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const match = node.textContent.match(regex);
        if (match) {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + word.length);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    }, targetWord);

    expect(wordBounds).toBeTruthy();

    await page.mouse.dblclick(wordBounds.x, wordBounds.y);

    // Wait for any tooltip (found or not-found)
    const tooltip = await page.waitForSelector('.dict-ext-tooltip', { timeout: 5000 });
    expect(tooltip).toBeTruthy();

    const tooltipText = await tooltip.textContent();
    console.log(`  Tooltip content: "${tooltipText.substring(0, 120)}..."`);

    // The tooltip should contain either a definition or a not-found message
    const notFound = await page.$('.dict-ext-notfound');
    if (notFound) {
      const msg = await notFound.textContent();
      expect(msg).toContain('not found');
      console.log('  Word was not in dictionary (valid behavior for random words)');
    } else {
      const header = await page.$('.dict-ext-tooltip .dict-ext-header');
      expect(header).toBeTruthy();
      const defs = await page.$$('.dict-ext-tooltip .dict-ext-def');
      expect(defs.length).toBeGreaterThan(0);
      expect(defs.length).toBeLessThanOrEqual(3);
      console.log(`  Found ${defs.length} definition(s)`);
    }

    // Dismiss tooltip by clicking outside
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);
    const dismissed = await page.$('.dict-ext-tooltip');
    expect(dismissed).toBeNull();
    console.log('  Tooltip dismissed on click outside');

    await page.close();
  });

  test('double-click "planet" on Wikipedia Earth page shows definition', async () => {
    const page = await context.newPage();

    await page.goto('https://en.wikipedia.org/wiki/Earth', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for visible paragraph content
    await page.waitForSelector('#mw-content-text p:not(.mw-empty-elt)', {
      state: 'visible',
      timeout: 10000,
    });

    const wordBounds = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.querySelector('#mw-content-text'),
        NodeFilter.SHOW_TEXT,
      );
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const match = node.textContent.match(/\bplanet\b/i);
        if (match) {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + 6);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });

    expect(wordBounds).toBeTruthy();

    await page.mouse.dblclick(wordBounds.x, wordBounds.y);

    const tooltip = await page.waitForSelector('.dict-ext-tooltip', { timeout: 5000 });
    expect(tooltip).toBeTruthy();

    const wordEl = await page.$('.dict-ext-tooltip .dict-ext-word');
    const wordText = await wordEl.textContent();
    expect(wordText.toLowerCase()).toBe('planet');

    const defs = await page.$$('.dict-ext-tooltip .dict-ext-def');
    expect(defs.length).toBeGreaterThan(0);
    console.log(`  "planet" — ${defs.length} definition(s) shown`);

    // Check Wiktionary link
    const wikiLink = await page.$('.dict-ext-tooltip .dict-ext-link');
    expect(wikiLink).toBeTruthy();
    const href = await wikiLink.getAttribute('href');
    expect(href).toContain('wiktionary.org/wiki/planet');

    // Test Escape key dismissal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const tooltipAfterEsc = await page.$('.dict-ext-tooltip');
    expect(tooltipAfterEsc).toBeNull();
    console.log('  Tooltip dismissed on Escape');

    await page.close();
  });

  test('double-click a nonsense word shows not-found message', async () => {
    const page = await context.newPage();

    // Navigate to a real URL so the content script gets injected
    await page.goto('https://en.wikipedia.org/wiki/Earth', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForSelector('#mw-content-text', { timeout: 10000 });

    // Inject a nonsense word into the page
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.id = 'test-nonsense';
      div.style.cssText = 'font-size:20px; padding:50px; position:fixed; top:0; left:0; z-index:999999; background:white;';
      div.textContent = 'The word xyzzyplugh is not real.';
      document.body.appendChild(div);
    });

    // Find and double-click "xyzzyplugh"
    const wordBounds = await page.evaluate(() => {
      const div = document.getElementById('test-nonsense');
      const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const match = node.textContent.match(/xyzzyplugh/);
        if (match) {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + 10);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });

    expect(wordBounds).toBeTruthy();

    await page.mouse.dblclick(wordBounds.x, wordBounds.y);

    const tooltip = await page.waitForSelector('.dict-ext-tooltip', { timeout: 5000 });
    expect(tooltip).toBeTruthy();

    const notFound = await page.$('.dict-ext-notfound');
    expect(notFound).toBeTruthy();

    const msg = await notFound.textContent();
    expect(msg).toContain('xyzzyplugh');
    expect(msg).toContain('not found');
    console.log(`  Not-found message: "${msg}"`);

    await page.close();
  });
});
