const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function createMockDOM() {
  const eventListeners = {};
  const bodyChildren = [];

  const createElement = (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      className: '',
      textContent: '',
      href: '',
      target: '',
      style: {},
      children: [],
      appendChild(child) { this.children.push(child); },
      contains(other) {
        return this.children.includes(other);
      },
      remove() {
        // Remove from body's children array
        const idx = bodyChildren.indexOf(el);
        if (idx >= 0) bodyChildren.splice(idx, 1);
      },
      getBoundingClientRect() {
        return { top: 0, bottom: 20, left: 0, right: 100, width: 100, height: 20 };
      },
    };
    return el;
  };

  const mockDocument = {
    createElement,
    body: {
      children: bodyChildren,
      appendChild(child) { bodyChildren.push(child); },
    },
    addEventListener(event, handler, opts) {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(handler);
    },
  };

  return { mockDocument, eventListeners, bodyChildren };
}

function loadContent(mockApi) {
  const code = fs.readFileSync(
    path.join(__dirname, '..', 'content.js'),
    'utf-8',
  );
  const { mockDocument, eventListeners, bodyChildren } = createMockDOM();

  const mockWindow = {
    getSelection: () => ({
      toString: () => 'hello',
      rangeCount: 1,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({
          top: 100, bottom: 120, left: 50, right: 150,
        }),
      }),
    }),
    scrollY: 0,
    scrollX: 0,
    innerWidth: 1024,
  };

  const wrappedCode = `
    ${code}
    __exports = { createTooltip, showNotFound, removeTooltip, getSelectedText };
    __state = { get currentTooltip() { return currentTooltip; } };
  `;

  const context = {
    globalThis: { browser: mockApi },
    window: mockWindow,
    document: mockDocument,
    console,
    __exports: {},
    __state: {},
  };
  vm.createContext(context);
  vm.runInContext(wrappedCode, context);
  return { ctx: context.__exports, state: context.__state, eventListeners, bodyChildren };
}

describe('content.js', () => {
  describe('createTooltip', () => {
    it('creates a tooltip with word and definitions', () => {
      const mockApi = {
        runtime: {
          sendMessage: async () => ({}),
          onMessage: { addListener: () => {} },
        },
      };
      const { ctx, bodyChildren } = loadContent(mockApi);

      const entry = {
        word: 'hello',
        meanings: [
          { def: 'a greeting', speech_part: 'noun', example: 'Hello there!' },
          { def: 'to say hello', speech_part: 'verb' },
        ],
      };
      const rect = { bottom: 100, left: 50 };

      ctx.createTooltip(entry, rect);

      assert.equal(bodyChildren.length, 1);
      const tooltip = bodyChildren[0];
      assert.equal(tooltip.className, 'dict-ext-tooltip');

      // Header should contain word
      const header = tooltip.children[0];
      assert.equal(header.className, 'dict-ext-header');
      assert.equal(header.children[0].textContent, 'hello');
      assert.equal(header.children[1].textContent, 'noun');
    });

    it('limits definitions to 3', () => {
      const mockApi = {
        runtime: {
          sendMessage: async () => ({}),
          onMessage: { addListener: () => {} },
        },
      };
      const { ctx, bodyChildren } = loadContent(mockApi);

      const entry = {
        word: 'test',
        meanings: [
          { def: 'def1', speech_part: 'noun' },
          { def: 'def2', speech_part: 'noun' },
          { def: 'def3', speech_part: 'noun' },
          { def: 'def4', speech_part: 'noun' },
          { def: 'def5', speech_part: 'noun' },
        ],
      };

      ctx.createTooltip(entry, { bottom: 100, left: 50 });

      const tooltip = bodyChildren[0];
      const defs = tooltip.children[1]; // ol element
      assert.equal(defs.children.length, 3);
    });

    it('includes example when present', () => {
      const mockApi = {
        runtime: {
          sendMessage: async () => ({}),
          onMessage: { addListener: () => {} },
        },
      };
      const { ctx, bodyChildren } = loadContent(mockApi);

      const entry = {
        word: 'hello',
        meanings: [{ def: 'a greeting', speech_part: 'noun', example: 'Say hello!' }],
      };

      ctx.createTooltip(entry, { bottom: 100, left: 50 });

      const tooltip = bodyChildren[0];
      const defs = tooltip.children[1];
      const firstDef = defs.children[0];
      // Should have an example child
      const exampleEl = firstDef.children[0];
      assert.equal(exampleEl.className, 'dict-ext-example');
      assert.equal(exampleEl.textContent, '"Say hello!"');
    });
  });

  describe('removeTooltip', () => {
    it('removes existing tooltip', () => {
      const mockApi = {
        runtime: {
          sendMessage: async () => ({}),
          onMessage: { addListener: () => {} },
        },
      };
      const { ctx, state, bodyChildren } = loadContent(mockApi);

      ctx.createTooltip(
        { word: 'test', meanings: [{ def: 'x', speech_part: 'noun' }] },
        { bottom: 100, left: 50 },
      );
      assert.equal(bodyChildren.length, 1);

      ctx.removeTooltip();
      assert.equal(bodyChildren.length, 0);
      assert.equal(state.currentTooltip, null);
    });

    it('does nothing when no tooltip exists', () => {
      const mockApi = {
        runtime: {
          sendMessage: async () => ({}),
          onMessage: { addListener: () => {} },
        },
      };
      const { ctx, state } = loadContent(mockApi);

      ctx.removeTooltip(); // should not throw
      assert.equal(state.currentTooltip, null);
    });
  });

  describe('showNotFound', () => {
    it('shows not-found message', () => {
      const mockApi = {
        runtime: {
          sendMessage: async () => ({}),
          onMessage: { addListener: () => {} },
        },
      };
      const { ctx, bodyChildren } = loadContent(mockApi);

      ctx.showNotFound('xyzzy', { bottom: 100, left: 50 });

      assert.equal(bodyChildren.length, 1);
      const tooltip = bodyChildren[0];
      const msg = tooltip.children[0];
      assert.equal(msg.className, 'dict-ext-notfound');
      assert.equal(msg.textContent, '"xyzzy" not found in dictionary');
    });
  });

  describe('message listener', () => {
    it('responds to popup with selected text', () => {
      let messageListener;
      const mockApi = {
        runtime: {
          sendMessage: async () => ({}),
          onMessage: {
            addListener: (fn) => { messageListener = fn; },
          },
        },
      };
      loadContent(mockApi);

      let response;
      messageListener(
        { from: 'browserAction' },
        {},
        (r) => { response = r; },
      );

      assert.ok(response);
      assert.equal(typeof response.keyword, 'string');
    });
  });
});
