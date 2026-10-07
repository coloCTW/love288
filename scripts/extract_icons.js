#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   extract_icons.js — 从原型 weixinapp/shared/js/app.js 提取 SVG 图标精灵
   生成 miniprogram/utils/icons.js（提交入库，运行时零依赖）
   用法：node scripts/extract_icons.js
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'weixinapp', 'shared', 'js', 'app.js');
const OUT = path.join(ROOT, 'miniprogram', 'utils', 'icons.js');

/* 颜色解析表：symbol 体内的 var(--x) 在生成期全部解析为静态 hex */
const RESOLVE = {
  '--paper-peach': '#f0e0d0',
  '--paper-pink': '#f0d0ca',
  '--paper-blue': '#d0dbdf',
  '--paper-green': '#d2dfc5',
  '--paper-sun': '#f0deb4',
  '--paper': '#f7f7ee',
  '--fg': '#504040',
  '--muted': '#75675c',
  '--border': '#e3d8c6',
  '--accent': '#ee9a83',
  '--pink': '#f0a9b0',
  '--blue': '#a9c1de',
  '--green': '#a8c7a0',
  '--sun': '#efc97e',
  '--danger': '#c96f5e',
  '--accent-ink': '#876057',
  '--pink-ink': '#806062',
  '--blue-ink': '#6b676f',
  '--green-ink': '#6a695d',
  '--sun-ink': '#806953',
  '--accent-soft': '#f0dfcd',
  '--pink-soft': '#f0e0d5',
  '--blue-soft': '#dde4e0',
  '--green-soft': '#dde5cf',
  '--sun-soft': '#f0e3bf',
  '--fg-soft': '#e8e7d8',
  '--av-hair': '#6b4a3a'
};

/* ── 沙箱执行 app.js，导出 IIFE 内的 SYMBOLS ─────────────────────── */
const src = fs.readFileSync(SRC, 'utf8');
const patched = src.replace(
  'window.Icon = icon;',
  'window.Icon = icon; window.__SYMBOLS__ = SYMBOLS;'
);
if (patched === src) {
  console.error('未找到导出标记 window.Icon = icon;，原型 app.js 结构变化？');
  process.exit(1);
}

const sandbox = {
  window: {
    addEventListener() {},
    dispatchEvent() {}
  },
  document: {
    /* truthy → injectSprite() 早退，不执行 DOM 操作 */
    getElementById() { return { setAttribute() {} }; },
    createElementNS() { throw new Error('sandbox: createElementNS 不应被调用'); },
    querySelector() { return null; },
    body: { appendChild() {} },
    addEventListener() {},
    removeEventListener() {}
  },
  localStorage: { getItem() { throw new Error('sandbox'); }, setItem() { throw new Error('sandbox'); }, removeItem() {} },
  sessionStorage: { getItem() { throw new Error('sandbox'); }, setItem() { throw new Error('sandbox'); }, removeItem() {} },
  CustomEvent: class CustomEvent { constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; } },
  location: { href: '' },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  console: console
};

vm.createContext(sandbox);
vm.runInContext(patched, sandbox, { filename: 'app.js' });

const symbols = sandbox.window.__SYMBOLS__;
if (!Array.isArray(symbols) || symbols.length === 0) {
  console.error('沙箱未导出 SYMBOLS');
  process.exit(1);
}

/* ── 自检：所有 var(--x) 都能解析 ─────────────────────────────────── */
const VAR_RE = /var\((--[a-z-]+)\)/g;
for (const s of symbols) {
  let m;
  while ((m = VAR_RE.exec(s.body)) !== null) {
    if (!RESOLVE[m[1]]) {
      console.error('符号 ' + s.id + ' 引用了未解析的颜色 ' + m[1]);
      process.exit(1);
    }
  }
  if (!s.id || typeof s.body !== 'string') {
    console.error('符号格式异常：' + JSON.stringify(s).slice(0, 120));
    process.exit(1);
  }
}

/* ── 生成 icons.js ────────────────────────────────────────────────── */
const bodies = {};
for (const s of symbols) {
  bodies[s.id] = { vb: s.viewBox || '0 0 24 24', body: s.body };
}

const js = `/* ═══════════════════════════════════════════════════════════════════
   生成物：由 scripts/extract_icons.js 从原型 SYMBOLS 提取，勿手改
   图标以 SVG data-URI 形式内联（encodeURIComponent 编码，运行时零依赖）
   ═══════════════════════════════════════════════════════════════════ */
var ICON_BODIES = ${JSON.stringify(bodies, null, 2)};

var RESOLVE = ${JSON.stringify(RESOLVE, null, 2)};

var cache = {};

function build(id, ink) {
  var s = ICON_BODIES[id];
  if (!s) return '';
  var body = s.body;
  if (ink) body = body.replace(/currentColor/g, ink);
  body = body.replace(/var\\((--[a-z-]+)\\)/g, function (m, name) {
    return RESOLVE[name] || RESOLVE['--fg'];
  });
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + s.vb + '">' + body + '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* 线性/面性 UI 图标：currentColor 用 ink 替换 */
function iconURI(id, ink) {
  var key = id + '|' + (ink || '');
  if (cache[key] !== undefined) return cache[key];
  return (cache[key] = build(id, ink));
}

/* 心情脸：描边 currentColor 固定为 --fg；头像内部颜色已用 var() 固定 */
function faceURI(id) { return iconURI(id, RESOLVE['--fg']); }
function avatarURI(userId) { return iconURI(userId === 'su' ? 'avatar-su' : 'avatar-lin', ''); }

module.exports = { iconURI: iconURI, faceURI: faceURI, avatarURI: avatarURI };
`;

fs.writeFileSync(OUT, js, 'utf8');
console.log('已生成 ' + OUT + '（' + symbols.length + ' 个符号）');
