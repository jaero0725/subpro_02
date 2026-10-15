import { getMatch, initialLanguage, pageNumber, validateProfile } from './data.js';
import { translations } from './i18n.js';

const app = document.querySelector('#app');
const state = { lang: initialLanguage(location.search), name: '', age: '', mbti: 'INFP' };
const asset = (name) => new URL(`../public/assets/${name}`, import.meta.url).href;
const original = (number) => new URL(`../public/originals/result-${number}.png`, import.meta.url).href;
let resultFile = null;
let resultURL = null;
let preparation = null;
let controller = null;
let generation = 0;
const t = () => translations[state.lang];
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const announce = (message) => { document.querySelector('#announcement').textContent = message; };

function languages(artwork = false) {
  return `<nav class="languages ${artwork ? 'languages--artwork' : ''}" aria-label="${t().language}">
    <button type="button" data-lang="ko" lang="ko" aria-label="한국어" aria-pressed="${state.lang === 'ko'}">한국어</button>
    <span aria-hidden="true">|</span>
    <button type="button" data-lang="zh" lang="zh-CN" aria-label="中文" aria-pressed="${state.lang === 'zh'}">中文</button>
  </nav>`;
}

function wireLanguages() {
  app.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('click', () => {
    rememberForm();
    state.lang = button.dataset.lang;
    const url = new URL(location.href);
    url.searchParams.set('lang', state.lang);
    history.replaceState(null, '', url);
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
    app.querySelector(`[data-lang="${state.lang}"]`)?.focus({ preventScroll: true });
  }));
}

function rememberForm() {
  const form = app.querySelector('form');
  if (!form) return;
  state.name = form.elements.name.value;
  state.age = form.elements.age.value;
  state.mbti = ['energy', 'perception', 'judgment', 'lifestyle'].map((key) => form.elements[key].value).join('');
}

function landing() {
  const text = t();
  const pairs = [ ['energy', 'E', 'I'], ['perception', 'S', 'N'], ['judgment', 'T', 'F'], ['lifestyle', 'J', 'P'] ];
  app.innerHTML = `<section class="landing" aria-labelledby="landing-title">
    <header class="hero">
      <img src="${asset(`landing-${state.lang}.webp`)}" width="813" height="1230" alt="" fetchpriority="high" />
      <span class="sr-only">THEMAN ALIVE choice</span>
      ${languages(true)}
      <h1 id="landing-title" class="sr-only">${text.heading}</h1>
      <p class="sr-only">${text.intro}</p>
    </header>
    <form class="match-form" novalidate>
      <div class="field name-field">
        <label for="visitor-name">${text.name}</label>
        <input id="visitor-name" name="name" type="text" autocomplete="nickname" enterkeyhint="next" maxlength="40" placeholder="${text.nameExample}" value="${escapeHTML(state.name)}" required aria-describedby="form-error" />
      </div>
      <fieldset class="mbti-field">
        <legend>MBTI</legend>
        <div class="mbti-pairs">${pairs.map(([key, ...letters], i) => `<fieldset class="mbti-pair"><legend class="sr-only">${letters.join(' / ')}</legend>${letters.map((letter) => `<label><input type="radio" name="${key}" value="${letter}" ${state.mbti[i] === letter ? 'checked' : ''} required /><span>${letter}</span></label>`).join('')}</fieldset>`).join('')}</div>
      </fieldset>
      <div class="field age-field">
        <label for="visitor-age">${text.age}</label>
        <div class="age-input"><input id="visitor-age" name="age" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" enterkeyhint="go" placeholder="27" value="${escapeHTML(state.age)}" required aria-describedby="form-error age-unit" /><span id="age-unit">${text.unit}</span></div>
      </div>
      <p id="form-error" class="form-error" role="alert" hidden></p>
      <button class="find-button" type="submit"><span>${text.submit}</span><svg viewBox="0 0 24 36" aria-hidden="true"><path d="m5 3 15 15L5 33" /></svg></button>
    </form>
    <footer class="landing-footer"><img src="${asset(`footer-${state.lang}.webp`)}" width="813" height="334" alt="" /><p class="sr-only">${text.disclaimer}</p></footer>
  </section>`;
  const form = app.querySelector('form');
  form.addEventListener('input', () => {
    form.querySelector('[aria-invalid="true"]')?.removeAttribute('aria-invalid');
    form.querySelector('#form-error').hidden = true;
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    rememberForm();
    const error = validateProfile(state);
    if (error) {
      const message = app.querySelector('#form-error');
      message.textContent = t().errors[error];
      message.hidden = false;
      const field = error === 'mbti' ? form.querySelector('[name="energy"]') : form.elements[error];
      field.setAttribute('aria-invalid', 'true');
      field.focus();
      return;
    }
    state.name = state.name.trim();
    // Only the selected MBTI goes in the URL. Names and ages never leave the page.
    history.pushState(null, '', `${location.pathname}${location.search}#result=${state.mbti}`);
    render();
    window.scrollTo(0, 0);
    app.querySelector('h1').focus({ preventScroll: true });
  });
}

function profileMarkup(actor) {
  const i = state.lang === 'ko' ? 0 : 1;
  const name = state.lang === 'ko' ? actor.name : actor.en;
  return `<h2>${escapeHTML(name)}</h2><p>${actor.age}${t().unit} · ${actor.mbti}</p>
    <p>${escapeHTML(actor.quote[i])}</p><h3>${t().chemistry}</h3><p>${actor.chemistry[i]}</p>
    <dl>${t().labels.map((label, index) => `<div><dt>${label}</dt><dd>${actor.traits[i][index]}</dd></div>`).join('')}</dl>`;
}

function result(actor) {
  const number = pageNumber(actor, state.lang);
  const name = state.lang === 'ko' ? actor.name : actor.en;
  app.innerHTML = `<section class="result" aria-labelledby="result-title" data-actor="${actor.id}">
    <h1 id="result-title" class="sr-only" tabindex="-1">${escapeHTML(t().match(state.name))}: ${escapeHTML(name)}</h1>
    <div class="result-artwork">
      <img class="result-image" src="${asset(`result-${number}.webp`)}" width="813" height="2459" alt="" fetchpriority="high" />
      <button class="save-hotspot" type="button" aria-label="${t().save}"><span class="sr-only">${t().save}</span></button>
      <div class="image-error" hidden><p>${t().imageError}</p><button type="button" class="secondary retry-image">${t().retry}</button></div>
    </div>
    <footer class="result-footer">
      <p class="personal-match">${escapeHTML(t().match(state.name))} <span aria-hidden="true">♡</span></p>
      <p class="save-status" role="status"></p>
      <button type="button" class="secondary again">${t().again}</button>
      ${languages()}
      <details class="text-profile"><summary>${t().text}</summary>${profileMarkup(actor)}</details>
      <p class="privacy-note">${t().disclaimer}</p>
    </footer>
    <dialog class="save-dialog" aria-labelledby="save-title">
      <div class="dialog-header"><h2 id="save-title">${t().saveTitle}</h2><button type="button" class="close-dialog" aria-label="${t().close}">×</button></div>
      <p>${t().saveHelp}</p><a class="download-link" download="THEMAN-${actor.id}-${state.lang}.png">${t().download}</a>
      <img class="save-preview" alt="${escapeHTML(name)} — ${t().chemistry}" width="813" height="2459" />
    </dialog>
  </section>`;
  const resultImage = app.querySelector('.result-image');
  resultImage.addEventListener('error', () => { app.querySelector('.image-error').hidden = false; });
  app.querySelector('.retry-image').addEventListener('click', () => {
    app.querySelector('.image-error').hidden = true;
    resultImage.src = `${asset(`result-${number}.webp`)}?retry=${Date.now()}`;
  });
  app.querySelector('.again').addEventListener('click', () => {
    history.pushState(null, '', `${location.pathname}${location.search}`);
    render();
    window.scrollTo(0, 0);
    app.querySelector('#visitor-name').focus({ preventScroll: true });
  });
  app.querySelector('.save-hotspot').addEventListener('click', () => saveResult(actor));
  const dialog = app.querySelector('dialog');
  app.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); });
  app.querySelector('.download-link').addEventListener('click', () => announce(t().downloadStarted));
  // Preload the original PNG, so a file share can start inside the tap gesture on iOS.
  preparation = prepareFile(actor);
}

async function prepareFile(actor) {
  const version = generation;
  const signal = controller.signal;
  try {
    const response = await fetch(original(pageNumber(actor, state.lang)), { signal });
    if (!response.ok) throw new Error(`PNG: HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/png')) throw new Error('Expected PNG');
    if (version !== generation) return null;
    resultFile = new File([blob], `THEMAN-${actor.id}-${state.lang}.png`, { type: 'image/png' });
    resultURL = URL.createObjectURL(resultFile);
    return resultFile;
  } catch (error) {
    if (error.name !== 'AbortError' && version === generation) app.querySelector('.save-status').textContent = t().saveError;
    return null;
  }
}

async function saveResult(actor) {
  const version = generation;
  const button = app.querySelector('.save-hotspot');
  const status = app.querySelector('.save-status');
  if (button.disabled) return;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    if (!resultFile) {
      status.textContent = t().saving;
      await preparation;
      if (!resultFile && version === generation) await prepareFile(actor);
    }
    if (version !== generation) return;
    if (!resultFile) { status.textContent = t().saveError; announce(t().saveError); return; }
    status.textContent = '';
    // This is called without awaiting anything when the preloaded file is ready.
    if (navigator.canShare?.({ files: [resultFile] }) && navigator.share) {
      try {
        await navigator.share({ files: [resultFile], title: `THEMAN ALIVE choice — ${actor.name}` });
        announce(t().shared);
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
        // In-app browsers may reject file sharing. Keep the save preview available.
      }
    }
    if (version !== generation) return;
    const link = app.querySelector('.download-link');
    link.href = resultURL;
    app.querySelector('.save-preview').src = resultURL;
    link.click();
    app.querySelector('dialog').showModal();
    document.body.classList.add('dialog-open');
  } finally {
    if (version === generation) { button.disabled = false; button.removeAttribute('aria-busy'); }
  }
}

function render() {
  generation += 1;
  controller?.abort();
  controller = new AbortController();
  if (resultURL) URL.revokeObjectURL(resultURL);
  resultURL = null;
  resultFile = null;
  document.body.classList.remove('dialog-open');
  document.documentElement.lang = state.lang === 'ko' ? 'ko' : 'zh-CN';
  document.title = `THEMAN ALIVE choice | ${t().title}`;
  const mbti = new URLSearchParams(location.hash.slice(1)).get('result');
  const actor = getMatch(mbti);
  if (actor) { state.mbti = mbti; result(actor); } else landing();
  wireLanguages();
}

window.addEventListener('popstate', () => { state.lang = initialLanguage(location.search); render(); });
render();
