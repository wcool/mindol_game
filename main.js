// Header Scroll Effect
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Reveal Animations on Scroll
const revealElements = document.querySelectorAll('[data-reveal]');

const observerOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
};

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const delay = entry.target.getAttribute('data-delay') || 0;
            setTimeout(() => {
                entry.target.classList.add('active');
            }, delay);
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

revealElements.forEach(el => {
    revealObserver.observe(el);
});

// Smooth Scrolling for Nav Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// 게임 장르 필터
const filterChips = document.querySelectorAll('.filter-chip');
const gameCards = document.querySelectorAll('.game-card[data-category]');

filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;

        gameCards.forEach(card => {
            const show = filter === 'all' || card.dataset.category === filter;
            card.classList.toggle('filtered-out', !show);
            // 필터로 다시 나타날 때 reveal 애니메이션이 안 남아있도록 처리
            if (show) card.classList.add('active');
        });
    });
});

// 맨 위로 버튼
const scrollTopBtn = document.getElementById('scroll-top');
if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
        scrollTopBtn.classList.toggle('visible', window.scrollY > 500);
    });
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// 좋아요 위젯 초기화 (likes-widget.js 로드 후)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof LikesWidget !== 'undefined') {
        LikesWidget.initAll();
    }
});
