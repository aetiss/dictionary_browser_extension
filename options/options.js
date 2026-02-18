const api = globalThis.browser ?? globalThis.chrome;

const commandName = '_execute_action';

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

document.addEventListener('DOMContentLoaded', updateUI);
document.querySelector('#update').addEventListener('click', updateShortcut);
document.querySelector('#reset').addEventListener('click', resetShortcut);
