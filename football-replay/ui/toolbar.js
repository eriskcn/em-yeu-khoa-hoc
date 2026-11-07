export function createToolbar(root, {label, onReset}) {
  const tag = document.createElement('span');
  tag.className = 'format';
  tag.textContent = label;
  const reset = document.createElement('button');
  reset.textContent = 'Reset formation';
  reset.addEventListener('click', onReset);
  root.append(tag, reset);
}
