// Opens the Buttondown confirmation popup on newsletter form submit.
// Extracted from an inline onsubmit= handler so script-src can drop 'unsafe-inline'.
document.querySelectorAll('form.newsletter-form[target="popupwindow"]').forEach((form) => {
  form.addEventListener('submit', () => {
    window.open('https://buttondown.email/idreamofthought', 'popupwindow');
  });
});
