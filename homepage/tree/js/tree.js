const tree = document.querySelector('.tree-page');

if (tree) {
  tree.classList.add('tree-ready');
}

for (const link of document.querySelectorAll('a[target="_blank"]')) {
  link.addEventListener('click', () => {
    link.setAttribute('aria-label', `${link.textContent.trim()} (opens in a new tab)`);
  });
}
