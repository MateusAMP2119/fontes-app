// Fontes mode selector and rotating placeholders, adapted to the research textarea.
/**
 * The hero's query card, ported from the codex/firecrawl-hero-reconstruction
 * branch's hero.ts (itself recovered from Firecrawl's shipped modules: the
 * typewriter placeholder, the endpoint icons as animated 2px canvas
 * matrices). What stayed behind on that branch:
 * the grid canvas, the mobile mode toggle, the tab separators and a text
 * scramble that ran at progress 1 and so never scrambled.
 *
 * The glyphs paint in the kicker's trail, cyan to blue corner to corner
 * (attio.com's colours deepened, see TRAIL), hierarchy by alpha.
 */

type ModeKey = 'search' | 'build';

const MODES: Record<ModeKey, { label: string; phrases: string[] }> = {
  search: {
    label: 'Pesquisar',
    phrases: [
      'Notícias de energia em Espanha',
      'Lançamentos da concorrência este mês',
      'Menções à marca nas últimas 24 horas',
    ],
  },
  build: {
    label: 'Construir',
    phrases: [
      'Relatório semanal do sector da habitação',
      'Alerta para greves nos transportes',
      'Painel de tendências do retalho ibérico',
    ],
  },
};

// the kicker's pair deepened: #A3ECE9/#709FF5 washed out at glyph alphas; the blue is attio's blue-500
export const TRAIL: [string, string] = ['#48C9D9', '#266DF0'];
const TYPE_MS = 55;
const HOLD_MS = 1400;
const ERASE_MS = 28;
const FRAME_MS = 40;

export function sizeCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * scale));
  const height = Math.max(1, Math.round(rect.height * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext('2d');
  context?.setTransform(scale, 0, 0, scale, 0, 0);
  return context;
}

// a 4×4 matrix of 2px cells on a 4px pitch inside the 20px glyph box
function paintIcon(canvas: HTMLCanvasElement, mode: ModeKey, elapsed: number, active: boolean): void {
  const context = sizeCanvas(canvas);
  if (!context) return;
  const { width, height } = canvas.getBoundingClientRect();
  context.clearRect(0, 0, width, height);
  const trail = context.createLinearGradient(3, 3, 17, 17);
  trail.addColorStop(0, TRAIL[0]);
  trail.addColorStop(1, TRAIL[1]);
  context.fillStyle = trail;

  if (mode === 'build') {
    const rowAlpha = [0.2, 0.4, 1, 0.12];
    const activeRow = active && elapsed < 800 ? Math.floor(elapsed / 50) % 4 : -1;
    for (let cell = 0; cell < 16; cell += 1) {
      const row = Math.floor(cell / 4);
      context.globalAlpha = row === activeRow ? 1 : rowAlpha[row];
      context.fillRect(3 + (cell % 4) * 4, 3 + row * 4, 2, 2);
    }
    context.globalAlpha = 1;
    return;
  }

  const base = [0, 0.2, 0.4, 0, 0.4, 1, 0.4, 0.2, 0.2, 0.4, 1, 0.4, 0, 0.4, 0.2, 0];
  const variance = [0.24, 0.31, 0.36, 0.22, 0.29, 0.6, 0.6, 0.34, 0.27, 0.6, 0.6, 0.32, 0.21, 0.38, 0.26, 0.35];
  const pulse = active && elapsed < 900 ? 1 - Math.abs(((elapsed % 300) / 150) - 1) : 0;
  for (let cell = 0; cell < 16; cell += 1) {
    if ([0, 3, 12, 15].includes(cell)) continue;
    const cap = [5, 6, 9, 10].includes(cell) ? 1 : 0.4;
    const value = base[cell] + pulse * variance[cell];
    context.globalAlpha = Math.min(Math.min(value, cap) - Math.max(value - cap, 0), 1);
    context.fillRect(3 + (cell % 4) * 4, 3 + 4 * Math.floor(cell / 4), 2, 2);
  }
  context.globalAlpha = 1;
}

/** Paint each icon when its own canvas mounts, resizes or changes selection. */
export function mountQueryIcon(canvas: HTMLCanvasElement, mode: ModeKey, active: boolean): () => void {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let activatedAt = performance.now();
  let timer = 0;
  const paint = () => paintIcon(canvas, mode, reducedMotion.matches ? 1000 : performance.now() - activatedAt, active);
  const start = () => {
    window.clearInterval(timer);
    activatedAt = performance.now();
    paint();
    if (active && !reducedMotion.matches) {
      timer = window.setInterval(() => {
        paint();
        if (performance.now() - activatedAt >= 1000) window.clearInterval(timer);
      }, FRAME_MS);
    }
  };
  const resize = new ResizeObserver(paint);
  resize.observe(canvas);
  reducedMotion.addEventListener('change', start);
  start();
  return () => {
    window.clearInterval(timer);
    resize.disconnect();
    reducedMotion.removeEventListener('change', start);
  };
}

// fonteslabs.com's prompt bar glyph (fontes-spa app-scenes.ts): one 800ms sweep
const PROMPT_ICON_LOOP_MS = 800;

/** The prompt bar's glyph: it sweeps once when it mounts and each time the input takes focus, never when focus leaves. */
export function mountPromptGlyph(input: HTMLInputElement | HTMLTextAreaElement, canvas: HTMLCanvasElement, mode: ModeKey): () => void {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frameTimer = 0;
  let startedAt = 0;

  const rest = () => {
    window.clearInterval(frameTimer);
    frameTimer = 0;
    paintIcon(canvas, mode, 1000, false);
  };
  const paint = () => {
    const elapsed = performance.now() - startedAt;
    if (!frameTimer || elapsed >= PROMPT_ICON_LOOP_MS) rest();
    else paintIcon(canvas, mode, elapsed, true);
  };
  const sweep = () => {
    rest();
    if (reducedMotion.matches) return;
    startedAt = performance.now();
    frameTimer = window.setInterval(paint, FRAME_MS);
  };

  const resize = new ResizeObserver(paint);
  resize.observe(canvas);
  input.addEventListener('focus', sweep);
  sweep();

  return () => {
    resize.disconnect();
    input.removeEventListener('focus', sweep);
    window.clearInterval(frameTimer);
  };
}

export function mountQuery(card: HTMLElement): () => void {
  const input = card.querySelector<HTMLTextAreaElement>('[data-q-input]');
  const buttons = Array.from(card.querySelectorAll<HTMLButtonElement>('[data-q-mode]'));
  const runLabel = card.querySelector<HTMLElement>('[data-q-run-label]');
  if (!input || !buttons.length) return () => {};

  const listeners = new AbortController();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let mode: ModeKey = buttons.find(button => button.getAttribute('aria-selected') === 'true')?.dataset.qMode as ModeKey ?? 'search';
  let phraseIndex = 0;
  let characterIndex = 0;
  let deleting = false;
  let typeTimer = 0;
  let focused = false;
  let visible = true;

  const clearTyping = () => window.clearTimeout(typeTimer);

  const typeStep = () => {
    if (!visible || document.hidden || focused || input.value || reducedMotion.matches) return;
    const phrases = MODES[mode].phrases;
    const phrase = phrases[phraseIndex % phrases.length];
    if (deleting) {
      characterIndex -= 1;
      input.placeholder = phrase.slice(0, Math.max(0, characterIndex));
      if (characterIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
      typeTimer = window.setTimeout(typeStep, ERASE_MS);
      return;
    }
    characterIndex += 1;
    input.placeholder = phrase.slice(0, characterIndex);
    if (characterIndex === phrase.length) {
      deleting = true;
      typeTimer = window.setTimeout(typeStep, HOLD_MS);
      return;
    }
    typeTimer = window.setTimeout(typeStep, TYPE_MS);
  };

  const restartTyping = (delay = TYPE_MS) => {
    clearTyping();
    characterIndex = 0;
    deleting = false;
    input.placeholder = reducedMotion.matches ? MODES[mode].phrases[0] : '';
    if (!reducedMotion.matches && visible && !document.hidden && !focused && !input.value) {
      typeTimer = window.setTimeout(typeStep, delay);
    }
  };

  const updateDirty = () => {
    const dirty = input.value.length > 0;
    card.classList.toggle('is-dirty', dirty);
    if (runLabel) runLabel.textContent = dirty ? MODES[mode].label : '';
    if (dirty) clearTyping();
    else if (!focused) restartTyping(180);
  };

  const selectMode = (next: ModeKey) => {
    mode = next;
    phraseIndex = 0;
    if (runLabel && input.value) runLabel.textContent = MODES[next].label;
    restartTyping(180);
  };

  // Follow the shared tabs' controlled selection for mouse, keyboard and external updates.
  const selection = new MutationObserver(() => {
    const next = buttons.find(button => button.getAttribute('aria-selected') === 'true')?.dataset.qMode as ModeKey | undefined;
    if (next && next !== mode) selectMode(next);
  });
  for (const button of buttons) selection.observe(button, { attributes: true, attributeFilter: ['aria-selected'] });

  input.addEventListener('focus', () => {
    focused = true;
    clearTyping();
    if (!input.value) input.placeholder = '';
  }, { signal: listeners.signal });
  input.addEventListener('blur', () => {
    focused = false;
    if (!input.value) restartTyping(220);
  }, { signal: listeners.signal });
  input.addEventListener('input', updateDirty, { signal: listeners.signal });

  const intersection = new IntersectionObserver(
    ([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) {
        if (!focused && !input.value) restartTyping(250);
      } else {
        clearTyping();
      }
    },
    { rootMargin: '160px 0px' }
  );
  intersection.observe(card);

  const onVisibilityChange = () => {
    if (document.hidden) {
      clearTyping();
    } else if (visible) {
      if (!focused && !input.value) restartTyping(250);
    }
  };
  const onMotionChange = () => {
    if (reducedMotion.matches) clearTyping();
    restartTyping();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  reducedMotion.addEventListener('change', onMotionChange);

  restartTyping(700);
  if (reducedMotion.matches) onMotionChange();
  updateDirty();

  return () => {
    listeners.abort();
    selection.disconnect();
    clearTyping();
    intersection.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    reducedMotion.removeEventListener('change', onMotionChange);
  };
}
