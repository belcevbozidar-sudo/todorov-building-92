document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const drawer = document.querySelector('.mobile-drawer');
  const drawerClose = document.querySelector('.mobile-drawer-close');

  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => drawer.classList.add('open'));
    drawerClose.addEventListener('click', () => drawer.classList.remove('open'));
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) drawer.classList.remove('open');
    });
  }

  document.querySelectorAll('.faq-item').forEach((item) => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((openItem) => {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-answer').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  document.querySelectorAll('[data-slider]').forEach((slider) => {
    const track = slider.querySelector('.slider-track');
    const slides = slider.querySelectorAll('.slider-slide');
    const prevBtn = slider.querySelector('.slider-arrow.prev');
    const nextBtn = slider.querySelector('.slider-arrow.next');
    const counterCurrent = slider.querySelector('.slider-counter .current');
    const total = slides.length;
    let index = 0;

    function update() {
      track.style.transform = `translateX(-${index * 100}%)`;
      if (counterCurrent) counterCurrent.textContent = index + 1;
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { index = (index - 1 + total) % total; update(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { index = (index + 1) % total; update(); });

    update();
  });
});
