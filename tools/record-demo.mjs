#!/usr/bin/env node
/**
 * Records `demo.gif` for the README from the running FuzzyScorer demo.
 *
 *   cd tools
 *   npm ci
 *   node record-demo.mjs
 *
 * The script starts `dotnet run` itself when nothing is listening on the target
 * URL, drives the demo with Playwright (system Chrome, no browser download) and
 * encodes the frames with gifenc. The short story: default clustering -> exact
 * matching -> back -> isolate one cluster -> loose matching -> default again.
 *
 * Frames are captured through the Chrome DevTools screencast (compositor level,
 * ~30 fps) and resampled to `--fps`, then GIF-encoded with a shared palette and
 * per-frame transparency so only changed pixels are stored. That keeps the file
 * light without losing the live feel.
 *
 * Options:
 *   --url <url>         Demo URL (default http://localhost:5231)
 *   --out <file>        Output GIF (default ../demo.gif)
 *   --width <px>        Viewport/clip width (default 1040, stays above the 992px breakpoint)
 *   --fps <n>           Output frame rate (default 12)
 *   --colors <n>        Palette size (default 256)
 *   --max-bytes <n>     Warn when the GIF is larger (default 1500000)
 *   --no-server         Never spawn dotnet run
 *   --debug-dir <dir>   Also write the captured frames as PNGs
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import gifenc from 'gifenc';
import { chromium } from 'playwright-core';
import pngjs from 'pngjs';

const { GIFEncoder, applyPalette, quantize } = gifenc;
const { PNG } = pngjs;

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolsDir, '..');

const options = parseArgs(process.argv.slice(2));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const parsed = {
    url: 'http://localhost:5231',
    out: path.join(repoRoot, 'demo.gif'),
    width: 1040,
    fps: 12,
    colors: 256,
    maxBytes: 1_500_000,
    server: true,
    debugDir: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--url':
        parsed.url = argv[++i];
        break;
      case '--out':
        parsed.out = path.resolve(process.cwd(), argv[++i]);
        break;
      case '--width':
        parsed.width = Number(argv[++i]);
        break;
      case '--fps':
        parsed.fps = Number(argv[++i]);
        break;
      case '--colors':
        parsed.colors = Number(argv[++i]);
        break;
      case '--max-bytes':
        parsed.maxBytes = Number(argv[++i]);
        break;
      case '--debug-dir':
        parsed.debugDir = path.resolve(process.cwd(), argv[++i]);
        break;
      case '--no-server':
        parsed.server = false;
        break;
      case '--help':
      case '-h':
        console.log('Usage: node record-demo.mjs [--url <url>] [--out <file>] [--width <px>] [--fps <n>] [--colors <n>] [--max-bytes <n>] [--debug-dir <dir>] [--no-server]');
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

async function isPortOpen(port, host = 'localhost') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

async function startDemoServer(url) {
  const { port } = new URL(url);
  if (await isPortOpen(Number(port))) {
    return null;
  }

  console.log(`Starting dotnet run (waiting for ${url})â€¦`);
  const child = spawn('dotnet', ['run', '--project', repoRoot], {
    cwd: repoRoot,
    stdio: 'ignore',
  });

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (await isPortOpen(Number(port))) {
      return child;
    }
    await sleep(1000);
  }

  await stopServer(child);
  throw new Error(`The demo did not start listening on ${url} within 180s.`);
}

async function stopServer(child) {
  if (!child) {
    return;
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
        .once('exit', resolve)
        .once('error', resolve);
    });
    return;
  }

  child.kill('SIGTERM');
}

async function addCursor(page) {
  await page.evaluate(() => {
    const el = document.createElement('div');
    el.id = '__demo-cursor';
    el.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'width:24px',
      'height:24px',
      'transform:translate(-2px,-2px)',
      'pointer-events:none',
      'z-index:2147483647',
      'opacity:0',
      'transition:opacity .2s ease',
      'filter:drop-shadow(0 1px 2px rgba(15,23,42,.45))',
    ].join(';');
    el.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M2 2 L20 11.5 L12.2 12.8 L15.8 20.5 L12.6 22 L9.2 14.2 L3 19.2 Z" ' +
      'fill="#fff" stroke="#0f172a" stroke-width="1.5" stroke-linejoin="round"/>' +
      '</svg>';
    document.body.appendChild(el);
    window.__demoCursor = { x: 0, y: 0 };
  });
}

async function setCursorPosition(page, x, y) {
  await page.evaluate(
    ({ x, y }) => {
      const el = document.getElementById('__demo-cursor');
      if (!el) {
        return;
      }
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      window.__demoCursor = { x, y };
    },
    { x, y },
  );
}

async function setCursorOpacity(page, opacity) {
  await page.evaluate((value) => {
    const el = document.getElementById('__demo-cursor');
    if (el) {
      el.style.opacity = String(value);
    }
  }, opacity);
}

async function moveCursor(page, locator, duration = 320) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Cannot move the cursor: target has no bounding box.');
  }

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.evaluate(
    async ({ x, y, duration }) => {
      const el = document.getElementById('__demo-cursor');
      if (!el) {
        return;
      }

      const from = window.__demoCursor ?? { x, y };
      el.style.opacity = '1';

      await new Promise((resolve) => {
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          const px = from.x + (x - from.x) * eased;
          const py = from.y + (y - from.y) * eased;
          el.style.left = `${px}px`;
          el.style.top = `${py}px`;
          window.__demoCursor = { x: px, y: py };
          if (t < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    },
    { x, y, duration },
  );
}

async function clickWithCursor(page, locator, label, settleMs = 650) {
  await moveCursor(page, locator);
  await sleep(120);
  await locator.click();
  console.log(`  click ${label}`);
  await sleep(settleMs);
}

async function waitForDemo(page) {
  await page.waitForFunction(
    () => {
      const values = [...document.querySelectorAll('.kpi-value')].map((el) => el.textContent?.trim());
      const hasWords = document.querySelectorAll('.panel-left .word-tag').length > 0;
      return hasWords && values.length === 4 && values.every((value) => value && value !== 'â€”');
    },
    { timeout: 90_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await sleep(400);
}

async function measureClip(page) {
  return page.evaluate(() => {
    const header = document.querySelector('.demo-header');
    const split = document.querySelector('.split-view');
    if (!header || !split) {
      throw new Error('Demo layout not found.');
    }

    const top = Math.max(0, Math.round(header.getBoundingClientRect().top + window.scrollY - 20));
    const bottom = Math.round(split.getBoundingClientRect().bottom + window.scrollY + 24);
    return {
      x: 0,
      y: top,
      width: document.documentElement.clientWidth,
      height: bottom - top,
    };
  });
}

function decodeCropped(pngBuffer, clip) {
  const png = PNG.sync.read(pngBuffer);
  const cropX = Math.min(clip.x, png.width - 1);
  const cropY = Math.min(clip.y, png.height - 1);
  const width = Math.min(clip.width, png.width - cropX);
  const height = Math.min(clip.height, png.height - cropY);
  const out = new PNG({ width, height });

  for (let row = 0; row < height; row++) {
    const from = ((row + cropY) * png.width + cropX) * 4;
    png.data.copy(out.data, row * width * 4, from, from + width * 4);
  }

  if (width !== clip.width || height !== clip.height) {
    throw new Error(
      `Captured frame is ${png.width}x${png.height}, expected at least ${clip.width}x${clip.height}. ` +
        'The screencast viewport does not match the clip.',
    );
  }

  return out;
}

/** Resamples the screencast timeline to a fixed frame rate and merges identical frames. */
function buildFrames(captured, clip, fps) {
  const interval = 1000 / fps;
  const first = captured[0].ts;
  const last = captured[captured.length - 1].ts;
  const frames = [];
  let cursor = 0;
  let previous = null;

  for (let t = first; t <= last + 1; t += interval) {
    while (cursor + 1 < captured.length && captured[cursor + 1].ts <= t) {
      cursor++;
    }

    const decoded = decodeCropped(captured[cursor].png, clip);
    const raw = decoded.data;

    if (previous && previous.length === raw.length && Buffer.compare(previous, raw) === 0) {
      frames[frames.length - 1].delay += interval;
      continue;
    }

    frames.push({ png: captured[cursor].png, delay: interval });
    previous = raw;
  }

  return frames;
}

function buildPalette(frames, clip, colors) {
  const picks = Math.min(10, frames.length);
  const samples = [];
  let byteLength = 0;

  for (let i = 0; i < picks; i++) {
    const index = picks === 1 ? 0 : Math.round((i * (frames.length - 1)) / (picks - 1));
    const { data } = decodeCropped(frames[index].png, clip);
    const sample = new Uint8ClampedArray(data.length / 2);

    let out = 0;
    for (let p = 0; p < data.length; p += 8) {
      sample[out++] = data[p];
      sample[out++] = data[p + 1];
      sample[out++] = data[p + 2];
      sample[out++] = 255;
    }

    samples.push(sample.subarray(0, out));
    byteLength += out;
  }

  const merged = new Uint8ClampedArray(byteLength);
  let offset = 0;
  for (const sample of samples) {
    merged.set(sample, offset);
    offset += sample.length;
  }

  // Index 0 is reserved for "unchanged pixel" transparency in delta frames.
  const palette = quantize(merged, colors - 1, { format: 'rgb565' });
  palette.unshift([255, 0, 255]);
  return palette;
}

function encodeGif(frames, clip, colors) {
  const palette = buildPalette(frames, clip, colors);
  const gif = GIFEncoder();
  let previous = null;

  frames.forEach((frame, index) => {
    const { data } = decodeCropped(frame.png, clip);
    const rgba = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
    const indexed = applyPalette(rgba, palette, 'rgb565');

    if (previous) {
      for (let p = 0; p < indexed.length; p++) {
        const offset = p * 4;
        if (
          rgba[offset] === previous[offset] &&
          rgba[offset + 1] === previous[offset + 1] &&
          rgba[offset + 2] === previous[offset + 2]
        ) {
          indexed[p] = 0;
        }
      }
    }

    const frameOptions = {
      delay: Math.min(3000, Math.round(frame.delay)),
    };

    if (index === 0) {
      gif.writeFrame(indexed, clip.width, clip.height, { ...frameOptions, palette, repeat: 0 });
    } else {
      gif.writeFrame(indexed, clip.width, clip.height, {
        ...frameOptions,
        transparent: true,
        transparentIndex: 0,
        dispose: 1,
      });
    }

    previous = rgba;
  });

  gif.finish();
  return gif.bytes();
}

async function main() {
  const server = options.server ? await startDemoServer(options.url) : null;

  if (!options.server && !(await isPortOpen(Number(new URL(options.url).port)))) {
    throw new Error(`Nothing is listening on ${options.url} (--no-server was set).`);
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let captured = [];

  try {
    const context = await browser.newContext({
      viewport: { width: options.width, height: 1200 },
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();

    await page.goto(options.url, { waitUntil: 'load' });
    await waitForDemo(page);

    // Measure the interesting region (header through both clouds, no error table),
    // then shrink the viewport so the screencast matches it exactly.
    let clip = await measureClip(page);
    await page.setViewportSize({ width: options.width, height: Math.ceil(clip.height) });
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(250);
    clip = await measureClip(page);
    const viewportHeight = await page.evaluate(() => document.documentElement.clientHeight);
    clip.height = Math.min(clip.height, viewportHeight);

    await addCursor(page);

    const exact = page.getByRole('button', { name: 'Exact', exact: true });
    const typical = page.getByRole('button', { name: 'Typical typos', exact: true });
    const loose = page.getByRole('button', { name: 'Loose', exact: true });
    const showAll = page.getByRole('button', { name: 'Show all clusters', exact: true });
    const apple = page
      .locator('.panel-left .word-tag')
      .filter({ has: page.locator('.tag-word', { hasText: /^Apple$/ }) })
      .first();

    // Park the cursor off the interesting area so the first and last frame match.
    await page.mouse.move(clip.width - 12, clip.height - 12);
    await setCursorPosition(page, clip.width - 12, clip.height - 12);

    const cdp = await context.newCDPSession(page);
    cdp.on('Page.screencastFrame', (event) => {
      captured.push({
        ts: event.metadata.timestamp * 1000,
        png: Buffer.from(event.data, 'base64'),
      });
      cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
    });

    await cdp.send('Page.startScreencast', {
      format: 'png',
      everyNthFrame: 1,
      maxWidth: clip.width,
      maxHeight: clip.height,
    });
    await sleep(300);

    // Storyboard: start on the default (Typical typos), show exact matching,
    // return, isolate a cluster, then compare loose matching and loop.
    await sleep(700);
    await clickWithCursor(page, exact, 'Exact', 700);
    await clickWithCursor(page, typical, 'Typical typos', 600);
    await clickWithCursor(page, apple, 'Apple word', 900);
    await clickWithCursor(page, showAll, 'Show all clusters', 500);
    await clickWithCursor(page, loose, 'Loose', 800);
    await clickWithCursor(page, typical, 'Typical typos', 700);

    await page.mouse.move(clip.width - 12, clip.height - 12);
    await setCursorOpacity(page, 0);
    await sleep(450);

    await cdp.send('Page.stopScreencast');
    await sleep(200);

    if (captured.length === 0) {
      throw new Error('The screencast produced no frames.');
    }

    const frames = buildFrames(captured, clip, options.fps);
    const dims = new Set(captured.map((f) => `${f.png.readUInt32BE(16)}x${f.png.readUInt32BE(20)}`));
    console.log(`Captured ${captured.length} screencast frames (${[...dims].join(', ')}), kept ${frames.length}.`);
    const gif = encodeGif(frames, clip, options.colors);

    await fs.mkdir(path.dirname(options.out), { recursive: true });
    await fs.writeFile(options.out, gif);

    if (options.debugDir) {
      await fs.mkdir(options.debugDir, { recursive: true });
      for (let i = 0; i < frames.length; i++) {
        const name = `frame-${String(i).padStart(3, '0')}-${Math.round(frames[i].delay)}ms.png`;
        await fs.writeFile(path.join(options.debugDir, name), frames[i].png);
      }
      console.log(`Wrote ${frames.length} debug frames to ${options.debugDir}.`);
    }

    const totalMs = frames.reduce((sum, frame) => sum + frame.delay, 0);
    const relative = path.relative(repoRoot, options.out);
    console.log(
      `Wrote ${relative}: ${clip.width}x${clip.height}, ${frames.length} frames, ` +
        `${(totalMs / 1000).toFixed(1)}s, ${(gif.length / 1024).toFixed(0)} KiB.`,
    );

    if (gif.length > options.maxBytes) {
      console.warn(
        `Warning: ${relative} is larger than ${Math.round(options.maxBytes / 1024)} KiB. ` +
          'Lower --width, --fps or --colors.',
      );
      process.exitCode = 2;
    }
  } finally {
    await browser.close().catch(() => {});
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
