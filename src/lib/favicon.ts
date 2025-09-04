/**
 * Creates a favicon from a string of ASCII art.
 * @param ascii The ASCII string to render.
 * @param foreground The color of the text.
 * @param background The color of the background.
 * @returns A data URL for the generated favicon.
 */
export function createAsciiFavicon(ascii: string, foreground: string, background: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 64, 64);

  // Text
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = foreground;
  ctx.fillText(ascii, 32, 32);

  return canvas.toDataURL('image/png');
}
