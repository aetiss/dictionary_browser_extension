const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function createMockDOM() {
  const elements = {};
  const createElement = (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      className: '',
      textContent: '',
      innerHTML: '',
      children: [],
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); },
      },
      appendChild(child) { this.children.push(child); },
      setAttribute(k, v) { el[`_attr_${k}`] = v; },
      getAttribute(k) { return el[`_attr_${k}`]; },
    };
    return el;
  };

  const mockDocument = {
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = createElement('div');
        elements[id].id = id;
      }
      return elements[id];
    },
    createElement,
  };

  return { mockDocument, elements };
}

function loadUtil(mockLocalStorage) {
  const code = fs.readFileSync(
    path.join(__dirname, '..', 'browserAction', 'util.js'),
    'utf-8',
  );
  const { mockDocument, elements } = createMockDOM();

  const wrappedCode = `
    ${code}
    __exports = { hasWhiteSpace, validateKeyword, checkCache, setCache, setDefinition, setMsg };
  `;
  const context = {
    globalThis: {
      browser: {
        storage: { local: mockLocalStorage },
      },
    },
    LocalStorage: mockLocalStorage,
    document: mockDocument,
    console,
    Set,
    Object,
    __exports: {},
  };
  vm.createContext(context);
  vm.runInContext(wrappedCode, context);
  return { ctx: context.__exports, elements };
}

describe('util.js', () => {
  describe('validateKeyword', () => {
    let ctx;

    beforeEach(() => {
      const mock = { get: async () => ({}), set: () => {} };
      ({ ctx } = loadUtil(mock));
    });

    it('returns true for single word', () => {
      assert.equal(ctx.validateKeyword('hello'), true);
    });

    it('returns false for words with spaces', () => {
      assert.equal(ctx.validateKeyword('hello world'), false);
    });

    it('returns true for hyphenated words', () => {
      assert.equal(ctx.validateKeyword('well-known'), true);
    });

    it('returns true for empty string', () => {
      assert.equal(ctx.validateKeyword(''), true);
    });

    it('returns false for tab characters', () => {
      assert.equal(ctx.validateKeyword('hello\tworld'), false);
    });
  });

  describe('checkCache', () => {
    it('returns null when cache is empty', async () => {
      const mock = { get: async () => ({}), set: () => {} };
      const { ctx } = loadUtil(mock);

      const result = await ctx.checkCache('hello');
      assert.equal(result, null);
    });

    it('returns cached entry when word exists', async () => {
      const cachedEntry = {
        originalSearch: 'hello',
        definition: { word: 'hello', meanings: [] },
        stemInfo: null,
      };
      const mock = {
        get: async () => ({ recentWords: [cachedEntry] }),
        set: () => {},
      };
      const { ctx } = loadUtil(mock);

      const result = await ctx.checkCache('hello');
      assert.deepEqual(result, cachedEntry);
    });

    it('matches case-insensitively', async () => {
      const cachedEntry = {
        originalSearch: 'hello',
        definition: { word: 'hello', meanings: [] },
        stemInfo: null,
      };
      const mock = {
        get: async () => ({ recentWords: [cachedEntry] }),
        set: () => {},
      };
      const { ctx } = loadUtil(mock);

      const result = await ctx.checkCache('HELLO');
      assert.deepEqual(result, cachedEntry);
    });

    it('returns null when word is not in cache', async () => {
      const cachedEntry = {
        originalSearch: 'world',
        definition: { word: 'world', meanings: [] },
        stemInfo: null,
      };
      const mock = {
        get: async () => ({ recentWords: [cachedEntry] }),
        set: () => {},
      };
      const { ctx } = loadUtil(mock);

      const result = await ctx.checkCache('hello');
      assert.equal(result, null);
    });
  });

  describe('setCache', () => {
    it('adds new word to cache with stemInfo', async () => {
      let stored = null;
      const mock = {
        get: async () => ({ recentWords: [] }),
        set: (data) => { stored = data; },
      };
      const { ctx } = loadUtil(mock);

      const entry = { word: 'hello', meanings: [] };
      const stemInfo = { from: 'hellos', to: 'hello' };
      await ctx.setCache('Hello', entry, stemInfo);

      assert.equal(stored.recentWords.length, 1);
      assert.equal(stored.recentWords[0].originalSearch, 'hello');
      assert.deepEqual(stored.recentWords[0].definition, entry);
      assert.deepEqual(stored.recentWords[0].stemInfo, stemInfo);
    });

    it('stores null stemInfo when not provided', async () => {
      let stored = null;
      const mock = {
        get: async () => ({ recentWords: [] }),
        set: (data) => { stored = data; },
      };
      const { ctx } = loadUtil(mock);

      await ctx.setCache('Hello', { word: 'hello', meanings: [] });

      assert.equal(stored.recentWords[0].stemInfo, null);
    });

    it('evicts oldest entry when cache is full (20 words)', async () => {
      const existing = Array.from({ length: 20 }, (_, i) => ({
        originalSearch: `word${i}`,
        definition: { word: `word${i}`, meanings: [] },
        stemInfo: null,
      }));
      let stored = null;
      const mock = {
        get: async () => ({ recentWords: existing }),
        set: (data) => { stored = data; },
      };
      const { ctx } = loadUtil(mock);

      await ctx.setCache('newword', { word: 'newword', meanings: [] });

      assert.equal(stored.recentWords.length, 20);
      assert.equal(stored.recentWords[0].originalSearch, 'newword');
      assert.equal(
        stored.recentWords.find((w) => w.originalSearch === 'word19'),
        undefined,
      );
    });

    it('initializes recentWords if missing', async () => {
      let stored = null;
      const mock = {
        get: async () => ({}),
        set: (data) => { stored = data; },
      };
      const { ctx } = loadUtil(mock);

      await ctx.setCache('test', { word: 'test', meanings: [] });

      assert.equal(stored.recentWords.length, 1);
    });
  });

  describe('setDefinition', () => {
    it('populates DOM elements with entry data', () => {
      const mock = { get: async () => ({}), set: () => {} };
      const { ctx, elements } = loadUtil(mock);

      const entry = {
        word: 'brilliant',
        meanings: [
          { def: 'very bright', speech_part: 'adjective', example: 'a brilliant light' },
          { def: 'exceptionally talented', speech_part: 'adjective' },
        ],
      };

      ctx.setDefinition(entry);

      const keyword = elements['keyword'];
      const pos = elements['pos'];
      const result = elements['result'];
      const emptyState = elements['empty-state'];

      assert.equal(keyword.textContent, 'brilliant');
      assert.equal(pos.textContent, 'adjective');
      assert.ok(!result.classList.contains('hidden'));
      assert.ok(emptyState.classList.contains('hidden'));
    });

    it('shows stem notice when stemInfo provided', () => {
      const mock = { get: async () => ({}), set: () => {} };
      const { ctx, elements } = loadUtil(mock);

      const entry = {
        word: 'cat',
        meanings: [{ def: 'a small animal', speech_part: 'noun' }],
      };
      const stemInfo = { from: 'cats', to: 'cat' };

      ctx.setDefinition(entry, stemInfo);

      const stemNotice = elements['stem-notice'];
      assert.ok(!stemNotice.classList.contains('hidden'));
      assert.equal(stemNotice.textContent, 'cats \u2192 cat');
    });

    it('hides stem notice when no stemInfo', () => {
      const mock = { get: async () => ({}), set: () => {} };
      const { ctx, elements } = loadUtil(mock);

      const entry = {
        word: 'hello',
        meanings: [{ def: 'a greeting', speech_part: 'noun' }],
      };

      ctx.setDefinition(entry);

      const stemNotice = elements['stem-notice'];
      assert.ok(stemNotice.classList.contains('hidden'));
    });

    it('sets wiktionary source link', () => {
      const mock = { get: async () => ({}), set: () => {} };
      const { ctx, elements } = loadUtil(mock);

      const entry = {
        word: 'test',
        meanings: [{ def: 'a trial', speech_part: 'noun' }],
      };

      ctx.setDefinition(entry);

      const sourceLink = elements['source-link'];
      assert.equal(sourceLink._attr_href, 'https://en.wiktionary.org/wiki/test');
    });

    it('groups meanings by speech_part', () => {
      const mock = { get: async () => ({}), set: () => {} };
      const { ctx, elements } = loadUtil(mock);

      const entry = {
        word: 'run',
        meanings: [
          { def: 'to move quickly', speech_part: 'verb' },
          { def: 'a period of running', speech_part: 'noun' },
          { def: 'to operate', speech_part: 'verb' },
        ],
      };

      ctx.setDefinition(entry);

      const resultText = elements['text-result'];
      const sectionLabels = resultText.children
        .filter((c) => c.className === 'section-pos')
        .map((c) => c.textContent);
      assert.deepEqual(sectionLabels, ['verb', 'noun']);
    });
  });

  describe('setMsg', () => {
    it('shows error state and hides result', () => {
      const mock = { get: async () => ({}), set: () => {} };
      const { ctx, elements } = loadUtil(mock);

      ctx.setMsg('Word not found');

      assert.ok(elements['result'].classList.contains('hidden'));
      assert.ok(elements['empty-state'].classList.contains('hidden'));
      assert.ok(!elements['error-state'].classList.contains('hidden'));
      assert.equal(elements['error-state'].textContent, 'Word not found');
    });
  });
});
