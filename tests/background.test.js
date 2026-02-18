const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function loadBackground(mockApi, mockFetch) {
  const code = fs.readFileSync(
    path.join(__dirname, '..', 'background.js'),
    'utf-8',
  );
  const context = {
    globalThis: { browser: mockApi },
    fetch: mockFetch,
    console,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

describe('background.js', () => {
  describe('getLetterFile', () => {
    let ctx;

    beforeEach(() => {
      const mockApi = {
        runtime: {
          getURL: (p) => `chrome-extension://abc/${p}`,
          onMessage: { addListener: () => {} },
        },
      };
      ctx = loadBackground(mockApi, async () => ({
        json: async () => ({}),
      }));
    });

    it('returns the first letter for lowercase words', () => {
      assert.equal(ctx.getLetterFile('hello'), 'h');
      assert.equal(ctx.getLetterFile('apple'), 'a');
      assert.equal(ctx.getLetterFile('zebra'), 'z');
    });

    it('returns the first letter for uppercase words', () => {
      assert.equal(ctx.getLetterFile('Hello'), 'h');
      assert.equal(ctx.getLetterFile('APPLE'), 'a');
    });

    it('returns misc for non-alpha characters', () => {
      assert.equal(ctx.getLetterFile('123'), 'misc');
      assert.equal(ctx.getLetterFile('-test'), 'misc');
      assert.equal(ctx.getLetterFile('!bang'), 'misc');
    });
  });

  describe('lookupWord', () => {
    it('returns entry when word exists', async () => {
      const mockData = {
        hello: {
          word: 'hello',
          meanings: [{ def: 'a greeting', speech_part: 'noun' }],
        },
      };
      const mockApi = {
        runtime: {
          getURL: (p) => `chrome-extension://abc/${p}`,
          onMessage: { addListener: () => {} },
        },
      };
      const mockFetch = async () => ({ json: async () => mockData });
      const ctx = loadBackground(mockApi, mockFetch);

      const entry = await ctx.lookupWord('hello');
      assert.deepEqual(entry, mockData.hello);
    });

    it('returns null when word does not exist', async () => {
      const mockApi = {
        runtime: {
          getURL: (p) => `chrome-extension://abc/${p}`,
          onMessage: { addListener: () => {} },
        },
      };
      const mockFetch = async () => ({ json: async () => ({}) });
      const ctx = loadBackground(mockApi, mockFetch);

      const entry = await ctx.lookupWord('nonexistentword');
      assert.equal(entry, null);
    });

    it('normalizes word to lowercase', async () => {
      const mockData = {
        hello: {
          word: 'hello',
          meanings: [{ def: 'a greeting', speech_part: 'noun' }],
        },
      };
      const mockApi = {
        runtime: {
          getURL: (p) => `chrome-extension://abc/${p}`,
          onMessage: { addListener: () => {} },
        },
      };
      const mockFetch = async () => ({ json: async () => mockData });
      const ctx = loadBackground(mockApi, mockFetch);

      const entry = await ctx.lookupWord('HELLO');
      assert.deepEqual(entry, mockData.hello);
    });

    it('returns null for empty string', async () => {
      const mockApi = {
        runtime: {
          getURL: (p) => `chrome-extension://abc/${p}`,
          onMessage: { addListener: () => {} },
        },
      };
      const mockFetch = async () => ({ json: async () => ({}) });
      const ctx = loadBackground(mockApi, mockFetch);

      assert.equal(await ctx.lookupWord(''), null);
    });

    it('returns null for multi-word input', async () => {
      const mockApi = {
        runtime: {
          getURL: (p) => `chrome-extension://abc/${p}`,
          onMessage: { addListener: () => {} },
        },
      };
      const mockFetch = async () => ({ json: async () => ({}) });
      const ctx = loadBackground(mockApi, mockFetch);

      assert.equal(await ctx.lookupWord('two words'), null);
    });

    it('caches letter data and reuses it', async () => {
      let fetchCount = 0;
      const mockData = {
        hello: { word: 'hello', meanings: [] },
        happy: { word: 'happy', meanings: [] },
      };
      const mockApi = {
        runtime: {
          getURL: (p) => `chrome-extension://abc/${p}`,
          onMessage: { addListener: () => {} },
        },
      };
      const mockFetch = async () => {
        fetchCount++;
        return { json: async () => mockData };
      };
      const ctx = loadBackground(mockApi, mockFetch);

      await ctx.lookupWord('hello');
      await ctx.lookupWord('happy');
      assert.equal(fetchCount, 1, 'should only fetch h.json once');
    });
  });

  describe('onMessage listener', () => {
    it('responds to lookup action', async () => {
      const mockData = {
        test: { word: 'test', meanings: [{ def: 'a trial', speech_part: 'noun' }] },
      };
      let messageListener;
      const mockApi = {
        runtime: {
          getURL: (p) => `chrome-extension://abc/${p}`,
          onMessage: {
            addListener: (fn) => { messageListener = fn; },
          },
        },
      };
      const mockFetch = async () => ({ json: async () => mockData });
      loadBackground(mockApi, mockFetch);

      const result = await new Promise((resolve) => {
        const returnValue = messageListener(
          { action: 'lookup', word: 'test' },
          {},
          resolve,
        );
        assert.equal(returnValue, true, 'should return true for async');
      });

      assert.deepEqual(JSON.parse(JSON.stringify(result)), { entry: mockData.test });
    });

    it('ignores messages without lookup action', () => {
      let messageListener;
      const mockApi = {
        runtime: {
          getURL: (p) => `chrome-extension://abc/${p}`,
          onMessage: {
            addListener: (fn) => { messageListener = fn; },
          },
        },
      };
      const mockFetch = async () => ({ json: async () => ({}) });
      loadBackground(mockApi, mockFetch);

      const result = messageListener({ action: 'other' }, {}, () => {});
      assert.equal(result, undefined);
    });
  });
});
