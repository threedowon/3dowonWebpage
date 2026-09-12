import test from 'node:test';
import assert from 'node:assert/strict';
import { setupLabMotion } from '../assets/lab-motion.mjs';

function fixture(play, withFallback = false) {
  const fallback = withFallback ? Object.assign(new EventTarget(), { dataset: { src: 'loop.webp' }, complete: false, naturalWidth: 0 }) : null;
  const video = Object.assign(new EventTarget(), {
    paused: true, readyState: 0, controls: true, muted: false,
    play, requestVideoFrameCallback(callback) { this.frame = callback; return 1; },
    cancelVideoFrameCallback() { this.frame = undefined; },
    pause() { this.paused = true; this.dispatchEvent(new Event('pause')); },
    removeAttribute() {},
  });
  const classes = new Set();
  const container = Object.assign(new EventTarget(), {
    dataset: { playback: 'loading' }, querySelector: selector => selector === 'video' ? video : fallback,
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
  });
  return { video, container, fallback };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('autoplay refusal keeps the preview visible, without native controls', async () => {
  const { video, container } = fixture(() => Promise.reject(new DOMException('Blocked', 'NotAllowedError')));
  const player = setupLabMotion(container);
  await flush();
  assert.equal(container.dataset.playback, 'blocked');
  assert.equal(container.classList.contains('is-playing'), false);
  assert.equal(video.controls, false);
  assert.equal(video.muted, true);
  assert.equal(video.defaultMuted, true);
  assert.equal(video.playsInline, true);
  player.dispose();
});

test('a resolved play request does not expose the video until a frame is presented', async () => {
  const { video, container } = fixture(() => Promise.resolve());
  const player = setupLabMotion(container);
  await flush();
  assert.equal(container.classList.contains('is-playing'), false);
  video.paused = false;
  video.readyState = 3;
  video.dispatchEvent(new Event('playing'));
  assert.equal(container.classList.contains('is-playing'), false);
  video.frame();
  assert.equal(container.classList.contains('is-playing'), true);
  video.dispatchEvent(new Event('waiting'));
  assert.equal(container.dataset.playback, 'loading');
  assert.equal(container.classList.contains('is-playing'), false);
  video.dispatchEvent(new Event('playing'));
  video.frame();
  assert.equal(container.classList.contains('is-playing'), true);
  video.paused = true;
  video.dispatchEvent(new Event('pause'));
  assert.equal(container.classList.contains('is-playing'), false);
  player.dispose();
});

test('a blocked loop can retry, and navigating away cancels pending frame work', async () => {
  let allowed = false;
  const { video, container } = fixture(() => allowed ? Promise.resolve() : Promise.reject(new DOMException('Blocked', 'NotAllowedError')));
  const player = setupLabMotion(container);
  await flush();
  allowed = true;
  container.dispatchEvent(new Event('pointerdown'));
  await flush();
  video.paused = false;
  video.readyState = 3;
  video.dispatchEvent(new Event('playing'));
  const pendingFrame = video.frame;
  player.dispose();
  assert.equal(video.frame, undefined);
  pendingFrame();
  assert.equal(container.classList.contains('is-playing'), false);
});

test('Safari autoplay refusal loads an animated image and removes the blur after it loads', async () => {
  const { video, container, fallback } = fixture(() => Promise.reject(new DOMException('Blocked', 'NotAllowedError')), true);
  const player = setupLabMotion(container);
  await flush();
  assert.equal(container.dataset.playback, 'fallback-loading');
  assert.equal(fallback.src, 'loop.webp');
  assert.equal(video.paused, true);
  fallback.naturalWidth = 360;
  fallback.dispatchEvent(new Event('load'));
  assert.equal(container.dataset.playback, 'animated-image');
  assert.equal(container.classList.contains('is-fallback'), true);
  video.dispatchEvent(new Event('pause'));
  assert.equal(container.dataset.playback, 'animated-image');
  player.dispose();
});

test('a play promise that never settles falls back after four seconds', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { container, fallback } = fixture(() => new Promise(() => {}), true);
  const player = setupLabMotion(container);
  t.mock.timers.tick(3999);
  assert.equal(fallback.src, undefined);
  t.mock.timers.tick(1);
  assert.equal(container.dataset.playback, 'fallback-loading');
  assert.equal(fallback.src, 'loop.webp');
  player.dispose();
});

test('advancing playback reveals the video even when frame callbacks are missing', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { video, container, fallback } = fixture(() => Promise.resolve(), true);
  const player = setupLabMotion(container);
  video.paused = false;
  video.readyState = 3;
  video.dispatchEvent(new Event('playing'));
  video.currentTime = 0.1;
  video.dispatchEvent(new Event('timeupdate'));
  assert.equal(container.dataset.playback, 'playing');
  t.mock.timers.tick(5000);
  assert.equal(fallback.src, undefined);
  player.dispose();
});

test('offscreen suspension and reduced motion do not start fallback downloads', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const offscreen = fixture(() => new Promise(() => {}), true);
  const player = setupLabMotion(offscreen.container);
  player.suspend();
  offscreen.video.dispatchEvent(new Event('loadeddata'));
  t.mock.timers.tick(5000);
  assert.equal(offscreen.fallback.src, undefined);
  player.dispose();
  const reduced = fixture(() => { throw new Error('Should not autoplay'); }, true);
  const reducedPlayer = setupLabMotion(reduced.container, { reduceMotion: true });
  t.mock.timers.tick(5000);
  assert.equal(reduced.fallback.src, undefined);
  reducedPlayer.dispose();
});
