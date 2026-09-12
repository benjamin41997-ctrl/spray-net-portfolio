// Maintainer utility: creates the original silent 12-second demo, no external media.
// Requires the dev dependency @playwright/test and Chromium: pnpm exec playwright install chromium.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const brandAssets = {
    logo: `data:image/png;base64,${readFileSync(new URL('../public/branding/logo.png', import.meta.url)).toString('base64')}`,
    font: `data:font/ttf;base64,${readFileSync(new URL('../public/branding/fonts/Lato-Regular.ttf', import.meta.url)).toString('base64')}`,
    heavy: `data:font/ttf;base64,${readFileSync(new URL('../public/branding/fonts/Lato-Black.ttf', import.meta.url)).toString('base64')}`,
  };
  const base64 = await page.evaluate(async (brandAssets) => {
    const logo = new Image();
    logo.src = brandAssets.logo;
    await logo.decode();
    for (const [weight, source] of [
      ['400', brandAssets.font],
      ['900', brandAssets.heavy],
    ]) {
      const face = new FontFace('Lato', `url(${source})`, { weight });
      await face.load();
      document.fonts.add(face);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    document.body.append(canvas);
    const context = canvas.getContext('2d');
    const mimeType = ['video/mp4;codecs=avc1.42001E', 'video/mp4'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    if (!mimeType) throw new Error('This browser cannot record MP4. Use a current Edge or Chrome.');
    const stream = canvas.captureStream(24);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1200000 });
    const chunks = [];
    const finished = new Promise((resolve) => {
      recorder.onstop = resolve;
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.start();
    const start = performance.now();
    const headings = ['Thoughtful preparation.', 'A fresh finish.', 'The final reveal.'];
    const subtitles = [
      'Protect, clean, and prepare.',
      'Apply the selected coating.',
      'Review the finish and care instructions.',
    ];
    await new Promise((resolve) => {
      const frame = (now) => {
        const seconds = (now - start) / 1000;
        const step = Math.min(2, Math.floor(seconds / 4));
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 960, 540);
        context.drawImage(logo, 55, 26, 220, 61);
        context.fillStyle = '#6d6e70';
        context.font = '12px Lato';
        context.fillText('ILLUSTRATIVE ANIMATION', 725, 50);
        context.fillStyle = '#e1e5d5';
        context.fillRect(470, 115, 435, 340);
        context.fillStyle = '#b9c7ac';
        context.fillRect(587, 140, 190, 125);
        context.strokeStyle = '#f5f4e7';
        context.lineWidth = 7;
        context.beginPath();
        context.moveTo(682, 140);
        context.lineTo(682, 265);
        context.moveTo(587, 202);
        context.lineTo(777, 202);
        context.stroke();
        for (let i = 0; i < 5; i++) {
          context.fillStyle = step === 0 ? '#a38964' : '#8a9b7c';
          context.fillRect(491 + i * 78, 320, 75, 111);
          context.strokeStyle = '#ffffff38';
          context.lineWidth = 2;
          context.strokeRect(498 + i * 78, 328, 61, 95);
          context.fillStyle = '#bb9e65';
          context.fillRect(550 + i * 78, 339, 4, 20);
        }
        context.fillStyle = '#faf9ec';
        context.fillRect(480, 305, 414, 15);
        context.strokeStyle = '#af965f';
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(680, 304);
        context.lineTo(680, 282);
        context.bezierCurveTo(680, 265, 705, 265, 705, 282);
        context.stroke();
        context.fillStyle = '#003965';
        context.font = '14px Lato';
        context.fillText(`0${step + 1} / 03`, 55, 188);
        context.fillStyle = '#003965';
        context.font = '900 30px Lato';
        context.fillText(headings[step], 55, 244);
        context.fillStyle = '#6d6e70';
        context.font = '16px Lato';
        context.fillText(subtitles[step], 55, 283);
        context.fillStyle = '#eaf0f5';
        context.fillRect(55, 335, 330, 5);
        context.fillStyle = '#f16122';
        context.fillRect(55, 335, 330 * Math.min(1, seconds / 12), 5);
        context.fillStyle = '#003965';
        context.font = '12px Lato';
        context.fillText('Custom Chemistry. Smarter Painting.', 55, 485);
        if (seconds < 12) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    recorder.stop();
    await finished;
    stream.getTracks().forEach((track) => track.stop());
    const blob = new Blob(chunks, { type: mimeType });
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
  }, brandAssets);
  writeFileSync(
    new URL('../public/media/videos/process-demo.mp4', import.meta.url),
    Buffer.from(base64, 'base64'),
  );
  console.log('Created original 12-second local MP4 process animation.');
} finally {
  await browser.close();
}
