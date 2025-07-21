document.addEventListener('keydown', function(e) {
  if (
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
    e.key === 'F12' ||
    (e.ctrlKey && e.key === 'u')
  ) {
    e.preventDefault();
    e.stopPropagation();
    alert('Bu işlem engellenmiştir.');
    return false;
  }
});

document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  return false;
});
