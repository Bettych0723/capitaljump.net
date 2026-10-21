(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();
    
    
    // Initiate the wowjs
    new WOW().init();
    
    
    // 系統偏好：使用者若開啟「減少動態效果」，所有平滑捲動改為瞬間跳轉
    var prefersReducedMotion = function () {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };


    // Back to top button
    // 顯示／隱藏只在狀態真的改變時才動畫，不再每次 scroll 事件都排入 jQuery 佇列
    var $backToTop = $('.back-to-top');
    var backToTopShown = null;
    var toggleBackToTop = function () {
        var shouldShow = window.pageYOffset > 300;
        if (shouldShow === backToTopShown) { return; }
        backToTopShown = shouldShow;
        if (shouldShow) { $backToTop.fadeIn('slow'); } else { $backToTop.fadeOut('slow'); }
    };
    window.addEventListener('scroll', toggleBackToTop, { passive: true });
    toggleBackToTop();

    // 回頂部改用原生平滑捲動。原本的 jQuery .animate({scrollTop:0}) 會在每一影格
    // 寫入 scrollTop，而瀏覽器每次收到寫入就重啟一段平滑動畫，兩者互相打架、
    // 實測落差可達 2896px。原生 scrollTo 只跑一段動畫，不會衝突。
    // 平滑捲動的保險：少數環境（舊版瀏覽器、部分嵌入式瀏覽器）不會執行平滑捲動
    // 動畫，若放任不管按鈕會像沒反應。這裡在 250ms 後檢查捲動位置有沒有真的移動，
    // 沒有就直接跳到位。正常瀏覽器在 250ms 內早已開始移動，不會誤觸。
    var smoothScrollTo = function (applySmooth, applyInstant) {
        if (prefersReducedMotion()) { applyInstant(); return; }
        var before = window.pageYOffset;
        applySmooth();
        window.setTimeout(function () {
            if (window.pageYOffset === before) { applyInstant(); }
        }, 250);
    };


    $backToTop.on('click', function () {
        smoothScrollTo(
            function () { window.scrollTo({ top: 0, behavior: 'smooth' }); },
            function () { window.scrollTo(0, 0); }
        );
        return false;
    });


    // 頁內錨點：維持平滑跳轉。用 scrollIntoView 才會自動套用各錨點的
    // scroll-margin-top（避開固定導覽列），不需要自己算偏移量。
    document.addEventListener('click', function (e) {
        if (!e.target.closest) { return; }
        var a = e.target.closest('a[href^="#"]');
        if (!a) { return; }
        if (a.getAttribute('data-bs-toggle') || a.getAttribute('data-bs-slide') || a.getAttribute('data-bs-slide-to')) { return; }
        var id = a.getAttribute('href');
        if (!id || id === '#') { return; }
        var target = document.getElementById(id.slice(1));
        if (!target) { return; }
        e.preventDefault();
        smoothScrollTo(
            function () { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
            function () { target.scrollIntoView({ behavior: 'auto', block: 'start' }); }
        );
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', id);
        }
    });




     // Fact Counter
     $(document).ready(function(){
        $('.counter-value').each(function(){
            $(this).prop('Counter',0).animate({
                Counter: $(this).text()
            },{
                duration: 2000,
                easing: 'easeInQuad',
                step: function (now){
                    $(this).text(Math.ceil(now));
                }
            });
        });
    });


    // 橫向卡片輪播（首頁 How we work 六步流程、About 信任元素）
    // 用 CSS scroll-snap 做橫向輪播，這裡只負責左右鍵、進度軌與頭尾的按鈕停用。
    // 以每個 .process-carousel 為單位各自運作，同一頁放幾個都可以；
    // 左右鍵（.process-arrow）與進度軌（.process-progress span）要放在該輪播的容器內。
    Array.prototype.forEach.call(document.querySelectorAll('.process-carousel'), function (wrap) {
        var track = wrap.querySelector('.process-track');
        if (!track) return;

        var bar = wrap.querySelector('.process-progress span');
        var arrows = wrap.querySelectorAll('.process-arrow');

        // 一次移動的距離 = 一張卡寬 + 卡片間距
        var stepDistance = function () {
            var card = track.firstElementChild;
            if (!card) return 0;
            var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            return card.getBoundingClientRect().width + gap;
        };

        var updateControls = function () {
            var max = track.scrollWidth - track.clientWidth;
            var visible = track.clientWidth / track.scrollWidth;
            var pos = max > 0 ? track.scrollLeft / max : 0;

            if (bar) {
                bar.style.width = (visible * 100) + '%';
                bar.style.left = (pos * (100 - visible * 100)) + '%';
            }
            if (arrows.length === 2) {
                arrows[0].disabled = track.scrollLeft <= 1;
                arrows[1].disabled = track.scrollLeft >= max - 1;
            }
        };

        Array.prototype.forEach.call(arrows, function (btn) {
            btn.addEventListener('click', function () {
                track.scrollBy({
                    left: stepDistance() * Number(btn.getAttribute('data-dir')),
                    behavior: 'smooth'
                });
            });
        });

        track.addEventListener('scroll', updateControls, { passive: true });
        window.addEventListener('resize', updateControls);
        updateControls();
    });


    // Contact form（contact.html）
    // 不實際寄信：前端驗證通過 → 清空表單 → 彈出感謝視窗（#thankYouModal，Bootstrap Modal）。
    var cform = document.getElementById('contact-form');
    if (cform) {
        var cbutton = cform.querySelector('button[type="submit"]');
        var thanksEl = document.getElementById('thankYouModal');
        var thanks = (thanksEl && window.bootstrap) ? new bootstrap.Modal(thanksEl) : null;

        // 關閉視窗後把焦點還給送出按鈕，鍵盤使用者不會迷失位置
        if (thanksEl) {
            thanksEl.addEventListener('hidden.bs.modal', function () { cbutton.focus(); });
        }

        var clearErrors = function () {
            cform.querySelectorAll('.cf-field-error').forEach(function (el) { el.remove(); });
            cform.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
        };

        var fieldError = function (field, msg) {
            field.classList.add('is-invalid');
            var p = document.createElement('p');
            p.className = 'cf-field-error';
            p.textContent = msg;
            field.parentNode.appendChild(p);
        };

        var validate = function () {
            clearErrors();
            var first = null;
            var name = cform.elements['name'];
            var email = cform.elements['email'];
            var message = cform.elements['message'];

            if (!name.value.trim()) {
                fieldError(name, 'Please tell us your name.');
                first = first || name;
            }
            // 基本的 Email 格式檢查
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
                fieldError(email, 'Please enter a valid email address.');
                first = first || email;
            }
            if (message.value.trim().length < 10) {
                fieldError(message, 'Please give us a little more detail (at least 10 characters).');
                first = first || message;
            }
            if (first) { first.focus(); }
            return !first;
        };

        cform.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!validate()) {
                // 驗證沒過也記一筆，用來看是不是哪個欄位一直卡住訪客
                if (window.cjTrack) { window.cjTrack('contact_submit_error'); }
                return;
            }

            if (window.cjTrack) {
                window.cjTrack('contact_submit', {
                    service_interest: (cform.elements['service'] && cform.elements['service'].value) || ''
                });
            }

            cform.reset();
            if (thanks) { thanks.show(); }
        });
    }

})(jQuery);



/* 服務頁的頁內子選單：捲到哪一段就標示哪一段。
   沒有這個元件的頁面不會執行。 */
(function () {
    var subnav = document.querySelector('.sw-subnav, .sw-dotnav');
    if (!subnav) { return; }

    var links = Array.prototype.slice.call(subnav.querySelectorAll('.nav-link'));
    var sections = links.map(function (a) {
        return document.querySelector(a.getAttribute('href'));
    });

    /* 該段落目前在畫面上佔多少高度 */
    function visibleHeight(el) {
        var r = el.getBoundingClientRect();
        return Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
    }

    function setActive() {
        /* 以「哪一段佔畫面最多」判斷，不用固定的判斷線：
           段落高度不一（有的比半個畫面還短），固定線在大螢幕上會提早或延後換段。 */
        var bestIndex = -1;
        var best = 0;
        sections.forEach(function (sec, i) {
            if (!sec) { return; }
            var v = visibleHeight(sec);
            if (v > best) {
                best = v;
                bestIndex = i;
            }
        });

        links.forEach(function (a, i) {
            a.classList.toggle('active', i === bestIndex);
        });

        /* 四個段落幾乎不在畫面上時（Hero、CTA、頁尾）收起來 */
        subnav.classList.toggle('is-hidden', best < window.innerHeight * 0.35);
    }

    setActive();
    window.addEventListener('scroll', setActive, { passive: true });
    window.addEventListener('resize', setActive);
})();


/* GA4 事件追蹤：把「訪客做了什麼」送到 Google Analytics。
   gtag 不存在時（本機預覽、或訪客用擴充套件擋掉追蹤）整段靜默跳過，不會壞頁面。
   事件與參數一律小寫加底線；參數要在 GA 介面登錄成「自訂維度」才會出現在報表裡。 */
(function () {

    function send(name, params) {
        if (typeof window.gtag !== 'function') { return; }
        window.gtag('event', name, params || {});
    }
    /* 其他程式要送事件時呼叫 window.cjTrack('事件名', { 參數 }) */
    window.cjTrack = send;

    /* 這一頁是哪一頁，讓報表可以按頁型別分組 */
    function pageType() {
        var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        var map = {
            '': 'home',
            'index.html': 'home',
            'service.html': 'services',
            'service-software.html': 'service_software',
            'service-cybersecurity.html': 'service_cybersecurity',
            'service-managed-it.html': 'service_managed_it',
            'game-development.html': 'game_development',
            'work.html': 'work',
            'about.html': 'about',
            'contact.html': 'contact',
            'privacy.html': 'privacy',
            '404.html': 'not_found'
        };
        return map[file] || file.replace('.html', '');
    }

    /* 這個連結長在頁面的哪一塊，用來分辨「哪個位置的按鈕有效」 */
    function areaOf(el) {
        if (el.closest('.navbar')) { return 'navbar'; }
        if (el.closest('.footer')) { return 'footer'; }
        if (el.closest('.cta-band')) { return 'cta_band'; }
        if (el.closest('.page-header')) { return 'breadcrumb'; }
        /* 首頁主視覺輪播，或內頁頁首之後的第一個區塊 */
        var hero = document.querySelector('.carousel, .container-fluid.pt-5');
        if (hero && hero.contains(el)) { return 'hero'; }
        return 'section';
    }

    function textOf(el) {
        return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    }

    document.addEventListener('click', function (e) {
        if (!e.target.closest) { return; }

        var link = e.target.closest('a');
        /* 主視覺沿用樣板寫法 <a><button class="btn">…</button></a>，
           所以按鈕樣式可能掛在 a 上、也可能掛在裡面的 button 上，兩種都要抓到。 */
        var btn = e.target.closest('.btn');
        if (!link && !btn) { return; }

        var href = link ? (link.getAttribute('href') || '') : '';

        /* Email 連結（頁尾與聯絡頁）：最直接的詢問訊號 */
        if (href.indexOf('mailto:') === 0) {
            send('email_click', { link_location: areaOf(link), page_type: pageType() });
            return;
        }

        /* 電話連結：等真實號碼補上後就會開始有資料 */
        if (href.indexOf('tel:') === 0) {
            send('tel_click', { link_location: areaOf(link), page_type: pageType() });
            return;
        }

        /* 按鈕樣式的行動呼籲。
           排除回到頂端，以及表單送出鈕（那個由 contact_submit 記錄）。 */
        if (btn && !btn.classList.contains('back-to-top') && btn.getAttribute('type') !== 'submit') {
            send('cta_click', {
                cta_text: textOf(btn),
                cta_location: areaOf(btn),
                link_url: href,
                page_type: pageType()
            });
            return;
        }

        /* 案例連結（首頁 Proof 的 Read the case 這類純文字連結） */
        if (href.indexOf('#case-') > -1) {
            send('case_click', {
                case_name: href.split('#case-')[1],
                link_location: areaOf(link),
                page_type: pageType()
            });
        }
    }, true);

})();


/* Managed IT & Cloud 頁的服務切換：左邊點一項，右邊換一張面板。
   沒有這個元件的頁面不會執行；小螢幕時切換軌由 CSS 收起、五張面板全部展開，
   所以這段就算照常跑也不影響手機版。 */
(function () {
    var box = document.querySelector('.mi-switch');
    if (!box) { return; }

    var buttons = Array.prototype.slice.call(box.querySelectorAll('.mi-rail-btn'));
    var panels = Array.prototype.slice.call(box.querySelectorAll('.mi-panel'));
    if (!buttons.length || buttons.length !== panels.length) { return; }

    /* 掛上 is-ready，CSS 才開始只顯示選中的那一張；
       沒有 JS 的情況下五張面板會全部展開，內容不會消失。 */
    box.classList.add('is-ready');

    function show(i, moveFocus) {
        buttons.forEach(function (btn, n) {
            var on = (n === i);
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
            btn.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (panel, n) {
            panel.classList.toggle('is-active', n === i);
        });
        if (moveFocus) { buttons[i].focus(); }
    }

    buttons.forEach(function (btn, i) {
        btn.addEventListener('click', function () { show(i); });

        /* 鍵盤操作：上下（或左右）換項目，Home / End 跳到頭尾 */
        btn.addEventListener('keydown', function (e) {
            var next = -1;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                next = (i + 1) % buttons.length;
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                next = (i - 1 + buttons.length) % buttons.length;
            } else if (e.key === 'Home') {
                next = 0;
            } else if (e.key === 'End') {
                next = buttons.length - 1;
            }
            if (next > -1) {
                e.preventDefault();
                show(next, true);
            }
        });
    });
})();
