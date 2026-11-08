// Short landscape: toggle the collapsed timeline marker track (button shown by CSS only there).
const btn = document.createElement('button');
btn.id = 'btn-tl';
btn.type = 'button';
btn.textContent = 'Events';
btn.setAttribute('aria-controls', 'timeline');
btn.setAttribute('aria-pressed', 'false');
btn.addEventListener('click', () => {
  btn.setAttribute('aria-pressed', String(document.body.classList.toggle('tl-open')));
});
document.getElementById('btn-props').after(btn);
