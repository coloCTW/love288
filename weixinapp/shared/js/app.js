/* ═══════════════════════════════════════════════════════════════════
   两个人的小世界 · 共享交互层
   手绘图标精灵（图标 / 9 种心情脸 / 情侣头像 IP）+ Toast / 弹层 / 动画助手
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 图标精灵 ───────────────────────────────────────────────────── */
  var F = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  var SYMBOLS = [
    { id: 'ic-home', body: '<path ' + F + ' d="M4 11.6 12 4.8l8 6.8"/><path ' + F + ' d="M6 10.4v8.1a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-8.1"/><path ' + F + ' d="M10 20v-5.4h4V20"/>' },
    { id: 'ic-bowl', body: '<path ' + F + ' d="M4.5 11.5h15c0 4.4-3.4 8-7.5 8s-7.5-3.6-7.5-8z"/><path ' + F + ' d="M9 4.2c.5.9-.6 1 0 1.9M12 4.2c.5.9-.6 1 0 1.9M15 4.2c.5.9-.6 1 0 1.9"/>' },
    { id: 'ic-journal', body: '<path ' + F + ' d="M6.5 4.5h11a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-11a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5z"/><path ' + F + ' d="M9 4.5v15"/><path fill="currentColor" stroke="none" d="M12 16.4c-1.4-1-2.2-1.9-2.2-2.9a1.4 1.4 0 0 1 2.2-1.1 1.4 1.4 0 0 1 2.2 1.1c0 1-0.8 1.9-2.2 2.9z"/>' },
    { id: 'ic-calendar', body: '<rect ' + F + ' x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path ' + F + ' d="M4 10h16M8.5 3.8v3M15.5 3.8v3"/><path fill="currentColor" stroke="none" d="M12 15.6c-1-0.8-1.6-1.4-1.6-2.1a1 1 0 0 1 1.6-0.8 1 1 0 0 1 1.6 0.8c0 0.7-0.6 1.3-1.6 2.1z"/>' },
    { id: 'ic-heart', body: '<path ' + F + ' d="M12 19.6C5.3 15.3 3.3 11 3.3 8.2a4 4 0 0 1 7.4-2.2 4 4 0 0 1 7.4 2.2c0 2.8-2 7.1-8.1 11.4z"/>' },
    { id: 'ic-heart-fill', body: '<path fill="currentColor" stroke="none" d="M12 19.6C5.3 15.3 3.3 11 3.3 8.2a4 4 0 0 1 7.4-2.2 4 4 0 0 1 7.4 2.2c0 2.8-2 7.1-8.1 11.4z"/>' },
    { id: 'ic-chat', body: '<path ' + F + ' d="M12 4.8c-4.7 0-8.5 2.8-8.5 6.3 0 2 1.2 3.8 3.1 5l-0.9 3.1 3.4-1.6c0.9 0.2 1.9 0.4 2.9 0.4 4.7 0 8.5-2.8 8.5-6.3S16.7 4.8 12 4.8z"/>' },
    { id: 'ic-bell', body: '<path ' + F + ' d="M6.6 16.4v-5.9a5.4 5.4 0 0 1 10.8 0v5.9l1.7 2.1H4.9l1.7-2.1z"/><path ' + F + ' d="M10.3 20.3a2.1 2.1 0 0 0 3.4 0"/>' },
    { id: 'ic-plus', body: '<path ' + F + ' d="M12 5.5v13M5.5 12h13"/>' },
    { id: 'ic-camera', body: '<rect ' + F + ' x="3.5" y="8" width="17" height="11" rx="2.5"/><path ' + F + ' d="M8.2 8l1.5-2.6h4.6L15.8 8"/><circle ' + F + ' cx="12" cy="13.5" r="2.8"/>' },
    { id: 'ic-photo', body: '<rect ' + F + ' x="4" y="5.5" width="16" height="13" rx="2.5"/><circle ' + F + ' cx="9.5" cy="10" r="1.4"/><path ' + F + ' d="M5 16.4l4.4-4.3 3 3 3.4-3.3 3.2 2.9"/>' },
    { id: 'ic-back', body: '<path ' + F + ' d="M14.5 5.5 8 12l6.5 6.5"/>' },
    { id: 'ic-pin', body: '<path ' + F + ' d="M12 21c-4-3.6-6.5-6.8-6.5-10a6.5 6.5 0 0 1 13 0c0 3.2-2.5 6.4-6.5 10z"/><circle ' + F + ' cx="12" cy="11" r="2.4"/>' },
    { id: 'ic-battery', body: '<rect ' + F + ' x="3" y="8.5" width="14.5" height="7" rx="1.8"/><path ' + F + ' d="M19.8 10.8v2.4"/><rect x="4.6" y="10.1" width="8.6" height="3.8" rx="0.8" fill="currentColor" stroke="none"/>' },
    { id: 'ic-sun', body: '<circle ' + F + ' cx="12" cy="12" r="4.2"/><path ' + F + ' d="M12 3.6v2.2M12 18.2v2.2M3.6 12h2.2M18.2 12h2.2M6.1 6.1l1.5 1.5M16.4 16.4l1.5 1.5M17.9 6.1l-1.5 1.5M7.6 16.4l-1.5 1.5"/>' },
    { id: 'ic-cloud', body: '<path ' + F + ' d="M6.8 17.2h10.3a3.1 3.1 0 0 0 0.5-6.2 4.7 4.7 0 0 0-9.1-1.4 3.5 3.5 0 0 0-1.7 7.6z"/>' },
    { id: 'ic-star-fill', body: '<path fill="currentColor" stroke="none" d="M12 3.6l2.5 5.1 5.6 0.8-4 3.9 0.9 5.6-5-2.6-5 2.6 0.9-5.6-4-3.9 5.6-0.8z"/>' },
    { id: 'ic-clock', body: '<circle ' + F + ' cx="12" cy="12" r="8.2"/><path ' + F + ' d="M12 7.8v4.6l3 1.7"/>' },
    { id: 'ic-more', body: '<circle cx="5.5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor"/>' },
    { id: 'ic-check', body: '<path ' + F + ' d="M5 12.6l4.4 4.4L19 7.4"/>' },
    { id: 'ic-trash', body: '<path ' + F + ' d="M4.5 7h15"/><path ' + F + ' d="M9 7V5.6A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.6V7"/><path ' + F + ' d="M6.5 7l0.8 11.8a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/><path ' + F + ' d="M10 11v5.5M14 11v5.5"/>' },
    { id: 'ic-edit', body: '<path ' + F + ' d="M4.5 19.5l0.8-3.1L16.3 5.4a1.6 1.6 0 0 1 2.3 0l0.9 0.9a1.6 1.6 0 0 1 0 2.3L8.5 19.6z"/><path ' + F + ' d="M14.6 7.4l2.5 2.5"/>' },
    { id: 'ic-moon', body: '<path ' + F + ' d="M20 13.4A8 8 0 1 1 10.6 4a6.5 6.5 0 0 0 9.4 9.4z"/>' },
    { id: 'ic-cup', body: '<path ' + F + ' d="M5 9.5h12v4.5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z"/><path ' + F + ' d="M17 10.5h1.7a2.1 2.1 0 0 1 0 4.2H17"/><path ' + F + ' d="M8.5 4.6c0.5 0.8-0.5 0.8 0 1.6M12 4.6c0.5 0.8-0.5 0.8 0 1.6"/>' },
    { id: 'ic-cat', body: '<path ' + F + ' d="M8.2 6.9 6.8 3.6l3.2 2.3M15.8 6.9 17.2 3.6l-3.2 2.3"/><path ' + F + ' d="M4.5 13.8c0-4.2 3.4-7.6 7.5-7.6s7.5 3.4 7.5 7.6c0 2.2-1 4.2-2.6 5.4l-0.8 3.4-3.1-1.4c-0.6 0.2-1.4 0.3-2 0.3s-1.4-0.1-2-0.3l-3.1 1.4-0.8-3.4c-1.6-1.2-2.6-3.2-2.6-5.4z"/><circle cx="9.6" cy="13" r="1" fill="currentColor"/><circle cx="14.4" cy="13" r="1" fill="currentColor"/><path fill="currentColor" stroke="none" d="M12 14.7l0.9 0.9h-1.8z"/><path ' + F + ' d="M7.6 14.6H6M7.9 16H6.1M16.4 14.6H18M16.1 16h1.8"/>' },
    { id: 'ic-flower', body: '<circle ' + F + ' cx="12" cy="8" r="2.6"/><circle ' + F + ' cx="15.8" cy="10.8" r="2.6"/><circle ' + F + ' cx="14.4" cy="15.2" r="2.6"/><circle ' + F + ' cx="9.6" cy="15.2" r="2.6"/><circle ' + F + ' cx="8.2" cy="10.8" r="2.6"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>' },
    { id: 'ic-arrow-r', body: '<path ' + F + ' d="M9.5 5.5 16 12l-6.5 6.5"/>' },
    { id: 'ic-user', body: '<circle ' + F + ' cx="12" cy="8.6" r="3.7"/><path ' + F + ' d="M5.6 19.8c1.3-3.4 3.6-5 6.4-5s5.1 1.6 6.4 5"/>' },
    { id: 'ic-ring', body: '<circle ' + F + ' cx="12" cy="12" r="6.4"/><path ' + F + ' d="M12 8.3a3.7 3.7 0 0 1 0 7.4"/>' },
    { id: 'ic-dots', body: '<circle cx="5.5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor"/>' },

    /* ── 9 种心情脸（PRD §7.2） ──────────────────────────────────── */
    { id: 'm-joy', body: faceBase() + '<path ' + F + ' d="M7.7 10.3c0.9-1.1 2.3-1.1 3.1 0M13.2 10.3c0.9-1.1 2.3-1.1 3.1 0"/><path fill="var(--pink-ink)" stroke="none" d="M8.6 13.7c1.1 2 5.7 2 6.8 0z"/>' },
    { id: 'm-sad', body: faceBase() + '<path ' + F + ' d="M6.9 8.3l2.3 0.9M17.1 8.3l-2.3 0.9"/><circle cx="8.7" cy="12.2" r="1" fill="var(--fg)"/><circle cx="15.3" cy="12.2" r="1" fill="var(--fg)"/><path ' + F + ' d="M9.2 16.2c1.2-1.3 4.4-1.3 5.6 0"/><path ' + F + ' d="M15.9 13.4c0.2 1.5-0.5 2.5-1.5 3.3" stroke="var(--blue-ink)" stroke-width="1.4"/>' },
    { id: 'm-angry', body: faceBase() + '<path ' + F + ' d="M7 8.9l2.5-1.3M17 8.9l-2.5-1.3"/><circle cx="8.7" cy="12.4" r="1" fill="var(--fg)"/><circle cx="15.3" cy="12.4" r="1" fill="var(--fg)"/><path ' + F + ' d="M9.2 16.3c1.2-1.5 4.4-1.5 5.6 0"/>' },
    { id: 'm-fear', body: faceBase() + '<circle cx="8.6" cy="11.6" r="1.9" fill="var(--paper)" stroke="var(--fg)" stroke-width="1.3"/><circle cx="15.4" cy="11.6" r="1.9" fill="var(--paper)" stroke="var(--fg)" stroke-width="1.3"/><circle cx="8.6" cy="11.6" r="0.9" fill="var(--fg)"/><circle cx="15.4" cy="11.6" r="0.9" fill="var(--fg)"/><path ' + F + ' d="M9.4 16.1c0.9-0.8 1.7-0.8 2.6 0 0.9 0.8 1.7 0.8 2.6 0"/><path ' + F + ' d="M16.8 6.2c0.3 1.4-0.6 2.3-1.5 3" stroke="var(--blue-ink)" stroke-width="1.4"/>' },
    { id: 'm-love', body: faceBase() + heartEye(8.2, 11) + heartEye(15.8, 11) + '<path ' + F + ' d="M9.7 14.6c0.8 1.3 3.8 1.3 4.6 0"/>' },
    { id: 'm-calm', body: faceBase() + '<path ' + F + ' d="M7.9 11.4h3.1M13 11.4h3.1"/><path ' + F + ' d="M10 14.7c0.7 0.8 3.3 0.8 4 0"/>' },
    { id: 'm-hope', body: faceBase() + '<circle cx="8.7" cy="12" r="1" fill="var(--fg)"/><circle cx="15.3" cy="12" r="1" fill="var(--fg)"/><path ' + F + ' d="M9.2 15.8c1 1.5 4.6 1.5 5.6 0"/><path ' + F + ' d="M17.4 6.6v2M16.4 7.6h2" stroke="var(--sun-ink)" stroke-width="1.3"/>' },
    { id: 'm-excite', body: faceBase() + '<path ' + F + ' d="M7.7 10.1c0.9-1 2.3-1 3.1 0M13.2 10.1c0.9-1 2.3-1 3.1 0"/><ellipse cx="12" cy="14.9" rx="2.5" ry="1.9" fill="var(--pink-ink)"/><path fill="var(--sun-ink)" stroke="none" d="M6.2 7.6l0.5 1.1 1.1-0.3-0.6 1 0.6 1-1.1-0.3-0.5 1.1-0.3-1.1-1-0.6 1-0.6zM17.8 7.6l0.5 1.1 1.1-0.3-0.6 1 0.6 1-1.1-0.3-0.5 1.1-0.3-1.1-1-0.6 1-0.6z"/>' },
    { id: 'm-anxious', body: faceBase() + '<path ' + F + ' d="M7 8.3l2.3-0.8M17 8.3l-2.3-0.8"/><circle cx="8.7" cy="12.3" r="1" fill="var(--fg)"/><circle cx="15.3" cy="12.3" r="1" fill="var(--fg)"/><path ' + F + ' d="M9.8 15.7c0.7-0.6 1.5-0.6 2.2 0 0.7 0.6 1.5 0.6 2.2 0"/><path ' + F + ' d="M16.8 6.2c0.3 1.4-0.6 2.3-1.5 3" stroke="var(--blue-ink)" stroke-width="1.4"/>' },

    /* ── 情侣角色 IP 头像 ────────────────────────────────────────── */
    { id: 'avatar-lin', viewBox: '0 0 48 48', body: '<circle cx="24" cy="26.5" r="14.6" fill="var(--av-hair)"/><circle cx="24" cy="28" r="12.6" fill="var(--paper-peach)"/><path d="M24 15.6c-4.9 0-8.5 1.6-10.7 4.3 1.9-1.6 4.3-2.6 7-3l0.7 2.3c0.9-0.4 1.9-0.6 3-0.6s2.1 0.2 3 0.6l0.7-2.3c2.7 0.4 5.1 1.4 7 3-2.2-2.7-5.8-4.3-10.7-4.3z" fill="var(--av-hair)"/><circle cx="19.4" cy="28.6" r="1.4" fill="var(--fg)"/><circle cx="28.6" cy="28.6" r="1.4" fill="var(--fg)"/><circle cx="16.6" cy="32.6" r="2" fill="var(--pink)" opacity="0.5"/><circle cx="31.4" cy="32.6" r="2" fill="var(--pink)" opacity="0.5"/><path d="M21 33.9c1 1.6 5 1.6 6 0" fill="none" stroke="var(--fg)" stroke-width="1.4" stroke-linecap="round"/>' },
    { id: 'avatar-su', viewBox: '0 0 48 48', body: '<path d="M24 13.2c-5 0-9.1 2.4-11.1 6.1-1.5 2.8-2 5.9-1.7 9l1.2 6.7c0.8 4.3 5.4 7 11.6 7s10.8-2.7 11.6-7l1.2-6.7c0.3-3.1-0.2-6.2-1.7-9-2-3.7-6.1-6.1-11.1-6.1z" fill="var(--av-hair)"/><circle cx="24" cy="27.2" r="12.2" fill="var(--paper-peach)"/><path d="M13.9 24.6c1.6-4.6 5.6-7.5 10.1-7.5s8.5 2.9 10.1 7.5c-0.8-1-1.8-1.8-3-2.4-1.6-3-4.2-4.7-7.1-4.7s-5.5 1.7-7.1 4.7c-1.2 0.6-2.2 1.4-3 2.4z" fill="var(--av-hair)"/><g transform="translate(31.2 17.6)"><circle cx="0" cy="-2.4" r="1.9" fill="var(--pink)"/><circle cx="2.3" cy="-0.7" r="1.9" fill="var(--pink)"/><circle cx="1.4" cy="2.1" r="1.9" fill="var(--pink)"/><circle cx="-1.4" cy="2.1" r="1.9" fill="var(--pink)"/><circle cx="-2.3" cy="-0.7" r="1.9" fill="var(--pink)"/><circle cx="0" cy="0" r="1.5" fill="var(--sun)"/></g><circle cx="19.5" cy="27.8" r="1.4" fill="var(--fg)"/><circle cx="28.5" cy="27.8" r="1.4" fill="var(--fg)"/><circle cx="16.8" cy="31.6" r="2" fill="var(--pink)" opacity="0.5"/><circle cx="31.2" cy="31.6" r="2" fill="var(--pink)" opacity="0.5"/><path d="M21 33c1 1.5 5 1.5 6 0" fill="none" stroke="var(--fg)" stroke-width="1.4" stroke-linecap="round"/>' }
  ];

  function faceBase() {
    return '<circle cx="12" cy="12" r="10" fill="var(--paper-peach)"/>' +
      '<circle cx="7.7" cy="14.6" r="1.7" fill="var(--pink)" opacity="0.55"/>' +
      '<circle cx="16.3" cy="14.6" r="1.7" fill="var(--pink)" opacity="0.55"/>';
  }
  function heartEye(cx, cy) {
    return '<path fill="var(--pink-ink)" stroke="none" transform="translate(' + cx + ' ' + cy + ')" d="M0 0.9C-1-0.1-2.2 0.6-2.2 1.7c0 0.9 0.8 1.3 2.2 2.1 1.4-0.8 2.2-1.2 2.2-2.1C2.2 0.6 1-0.1 0 0.9z"/>';
  }

  /* ── 注入精灵到当前文档 ─────────────────────────────────────────── */
  function injectSprite() {
    if (document.getElementById('love288-sprite')) return;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'love288-sprite');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.display = 'none';
    var defs = SYMBOLS.map(function (s) {
      var vb = s.viewBox || '0 0 24 24';
      return '<symbol id="' + s.id + '" viewBox="' + vb + '">' + s.body + '</symbol>';
    }).join('');
    svg.innerHTML = '<defs>' + defs + '</defs>';
    document.body.appendChild(svg);
  }

  /* ── 通用小工具 ─────────────────────────────────────────────────── */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function icon(id, cls) {
    return '<svg class="ic ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"></use></svg>';
  }
  function avatar(userId, size) {
    var id = userId === 'su' ? 'avatar-su' : 'avatar-lin';
    var style = size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '';
    return '<svg class="avatar"' + style + ' aria-hidden="true"><use href="#' + id + '"></use></svg>';
  }
  function phone() { return document.querySelector('.phone') || document.body; }

  /* ── Toast ──────────────────────────────────────────────────────── */
  var toastTimer = null;
  function toast(msg, emoji) {
    var root = phone();
    var old = root.querySelector('.toast');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = (emoji ? '<span class="t-emoji">' + escapeHtml(emoji) + '</span>' : '') +
      '<span>' + escapeHtml(msg) + '</span>';
    root.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 260);
    }, 2000);
  }

  /* ── 底部面板 ───────────────────────────────────────────────────── */
  function openSheet(html) {
    var root = phone();
    closeSheet();
    var mask = document.createElement('div');
    mask.className = 'mask';
    mask.setAttribute('role', 'dialog');
    mask.setAttribute('aria-modal', 'true');
    var sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.innerHTML = html;
    mask.appendChild(sheet);
    root.appendChild(mask);
    function onKey(e) { if (e.key === 'Escape') close(); }
    function close() {
      mask.remove();
      document.removeEventListener('keydown', onKey);
    }
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    document.addEventListener('keydown', onKey);
    return { el: sheet, close: close };
  }
  function closeSheet() {
    var m = phone().querySelector('.mask');
    if (m) m.remove();
  }

  /* ── 确认弹窗 ───────────────────────────────────────────────────── */
  function confirmDialog(opts) {
    var root = phone();
    closeSheet();
    var mask = document.createElement('div');
    mask.className = 'mask center';
    mask.setAttribute('role', 'alertdialog');
    mask.setAttribute('aria-modal', 'true');
    var box = document.createElement('div');
    box.className = 'dialog';
    box.innerHTML =
      (opts.ill ? '<div class="d-ill">' + opts.ill + '</div>' : '') +
      '<p class="d-title">' + escapeHtml(opts.title) + '</p>' +
      (opts.sub ? '<p class="d-sub">' + escapeHtml(opts.sub) + '</p>' : '') +
      '<div class="d-actions">' +
      '<button class="btn btn-ghost" data-act="cancel">' + escapeHtml(opts.cancel || '再想想') + '</button>' +
      '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok">' + escapeHtml(opts.ok || '好的') + '</button>' +
      '</div>';
    mask.appendChild(box);
    root.appendChild(mask);
    function onKey(e) { if (e.key === 'Escape') { cleanup(); resolve(false); } }
    var resolve;
    function cleanup() {
      mask.remove();
      document.removeEventListener('keydown', onKey);
    }
    var promise = new Promise(function (res) { resolve = res; });
    box.querySelector('[data-act="cancel"]').addEventListener('click', function () { cleanup(); resolve(false); });
    box.querySelector('[data-act="ok"]').addEventListener('click', function () { cleanup(); resolve(true); });
    mask.addEventListener('click', function (e) { if (e.target === mask) { cleanup(); resolve(false); } });
    document.addEventListener('keydown', onKey);
    return promise;
  }

  /* ── 爱心飞出（想你了 / 点赞 / 创建成功） ───────────────────────── */
  function flyHearts(anchor, count) {
    var root = phone();
    var pr = root.getBoundingClientRect();
    var ar = anchor.getBoundingClientRect();
    var cx = ar.left - pr.left + ar.width / 2;
    var cy = ar.top - pr.top + ar.height / 2;
    for (var i = 0; i < (count || 8); i++) {
      var h = document.createElement('span');
      h.className = 'fly-heart';
      var size = 14 + Math.random() * 12;
      h.style.left = (cx - size / 2) + 'px';
      h.style.top = (cy - size / 2) + 'px';
      h.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 130) + 'px');
      h.style.setProperty('--dy', -(60 + Math.random() * 90) + 'px');
      h.style.setProperty('--rot', Math.round((Math.random() - 0.5) * 40) + 'deg');
      h.style.setProperty('--dur', (0.9 + Math.random() * 0.5) + 's');
      h.style.setProperty('--sz', Math.round(size) + 'px');
      h.innerHTML = icon('ic-heart-fill');
      root.appendChild(h);
      (function (el) { setTimeout(function () { el.remove(); }, 1600); })(h);
    }
  }

  /* ── 按钮 Loading（小太阳旋转，PRD §5.2） ───────────────────────── */
  function withSun(btn, ms, loadingText, done) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.disabled = true;
    var orig = btn.innerHTML;
    btn.innerHTML = '<span class="sun-spin">' + icon('ic-sun') + '</span><span>' + escapeHtml(loadingText || '正在…') + '</span>';
    setTimeout(function () {
      btn.dataset.busy = '';
      btn.disabled = false;
      btn.innerHTML = orig;
      if (done) done();
    }, ms || 700);
  }

  /* ── 数据更新订阅 ───────────────────────────────────────────────── */
  function onUpdate(fn) {
    fn(Store.get());
    function h() { fn(Store.get()); }
    window.addEventListener('love288:update', h);
    try { window.addEventListener('storage', function (e) { if (e.key === 'love288.state.v1') h(); }); } catch (e) { /* noop */ }
    return function () { window.removeEventListener('love288:update', h); };
  }

  function goBack(fallback) {
    /* 画框 iframe 内 history 不可靠，返回一律走明确的上级页面 */
    location.href = fallback || '01-home.html';
  }

  /* ── 暴露 ───────────────────────────────────────────────────────── */
  injectSprite();
  window.Icon = icon;
  window.Avatar = avatar;
  window.esc = escapeHtml;
  window.UI = {
    toast: toast,
    openSheet: openSheet,
    closeSheet: closeSheet,
    confirm: confirmDialog,
    flyHearts: flyHearts,
    withSun: withSun,
    onUpdate: onUpdate,
    back: goBack
  };
})();
