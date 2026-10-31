const finePointer = window.matchMedia('(pointer: fine)');

if (finePointer.matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.append(cursor);
  document.body.classList.add('custom-cursor-enabled');

  document.addEventListener('pointermove', (event) => {
    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
    cursor.classList.add('is-visible');
    cursor.classList.toggle(
      'is-hovering',
      event.target instanceof Element && Boolean(event.target.closest('a, button, input, [role="button"]'))
    );
  });

  document.documentElement.addEventListener('pointerleave', () => {
    cursor.classList.remove('is-visible');
  });
}
