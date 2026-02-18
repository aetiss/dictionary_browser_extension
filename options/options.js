const api = globalThis.browser ?? globalThis.chrome;

const commandName = '_execute_action';

// --- Theme ---

function resolveTheme(setting) {
  if (setting === 'dark' || setting === 'light') return setting;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

(async function initTheme() {
  const store = await api.storage.local.get('theme');
  const setting = store.theme || 'system';
  document.documentElement.setAttribute('data-theme', resolveTheme(setting));
  document.querySelector(`input[name="theme"][value="${setting}"]`).checked = true;
})();

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
  const store = await api.storage.local.get('theme');
  if (!store.theme || store.theme === 'system') {
    document.documentElement.setAttribute('data-theme', resolveTheme('system'));
  }
});

function onThemeChange(e) {
  const setting = e.target.value;
  document.documentElement.setAttribute('data-theme', resolveTheme(setting));
  api.storage.local.set({ theme: setting });
}

// --- Keyboard shortcuts ---

async function updateUI() {
  const commands = await api.commands.getAll();
  for (const command of commands) {
    if (command.name === commandName) {
      document.querySelector('#shortcut').value = command.shortcut;
    }
  }
}

async function updateShortcut() {
  await api.commands.update({
    name: commandName,
    shortcut: document.querySelector('#shortcut').value,
  });
}

async function resetShortcut() {
  await api.commands.reset(commandName);
  updateUI();
}

// --- Event listeners ---

document.addEventListener('DOMContentLoaded', updateUI);
document.querySelector('#update').addEventListener('click', updateShortcut);
document.querySelector('#reset').addEventListener('click', resetShortcut);
document.querySelectorAll('input[name="theme"]').forEach((radio) => {
  radio.addEventListener('change', onThemeChange);
});
