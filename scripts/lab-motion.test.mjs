import test from 'node:test';
import assert from 'node:assert/strict';
import { setupLabMotion } from '../assets/lab-motion.mjs';

function fixture(play) {
  const video = Object.assign(new EventTarget(), {
    paused: true, readyState: 0, controls: true, muted: false,
    play, requestVideoFrameCallback(callback) { this.frame = callback; return 1; },
    cancelVideoFrameCallback() { this.frame = undefined; },
  });
  const classes = new Set();
  const container = Object.assign(new EventTarget(), {
    dataset: { playback: 'loading' }, querySelector: () => video,
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
  });
  return { video, container };
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
