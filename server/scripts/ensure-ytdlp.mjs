// Downloads the latest standalone yt-dlp binary into ./bin (next to this
// script's project) unless one already exists or a system `yt-dlp` is on PATH.
//
// We deliberately fetch the *latest* release instead of pinning: YouTube keeps
// changing its internal APIs, so newer yt-dlp builds are what keep extraction
// working. Re-run `npm run setup` whenever playback/search starts failing.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const binDir = join(root, 'bin');
const isWin = process.platform === 'win32';
const exe = join(binDir, isWin ? 'yt-dlp.exe' : 'yt-dlp');

function curl(args) {
  return execFileSync('curl', ['-sL', ...args], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

async function latestTag() {
  const out = curl(['-H', 'User-Agent: muffin-music-setup', 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest']);
  return JSON.parse(out).tag_name;
}

function main() {
  // 1) Use a system yt-dlp if present on PATH.
  try {
    execFileSync('yt-dlp', ['--version'], { stdio: 'ignore' });
    console.log('Using system yt-dlp from PATH.');
    return;
  } catch {
    /* not on PATH */
  }

  // 2) Use the local binary if it already exists.
  if (existsSync(exe)) {
    console.log(`Using existing binary: ${exe}`);
    return;
  }

  // 3) Download the latest release with curl (undici/fetch is unreliable in
  //    some sandboxes; curl is present on macOS, Linux and Git Bash).
  mkdirSync(binDir, { recursive: true });
  const tag = latestTag();
  const url = `https://github.com/yt-dlp/yt-dlp/releases/download/${tag}/yt-dlp${isWin ? '.exe' : ''}`;
  console.log(`Downloading yt-dlp ${tag} ...`);
  curl(['-o', exe, url]);
  if (!isWin) {
    execFileSync('chmod', ['+x', exe]);
  }
  console.log(`yt-dlp ${tag} ready at ${exe}`);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
