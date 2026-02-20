const MATERIALS = {
  stainless: { label: 'Stainless Steel', rate: 1450 },
  galvanized: { label: 'Galvanized Steel', rate: 980 },
  acrylic: { label: 'Acrylic', rate: 1180 },
  pvc: { label: 'Expanded PVC', rate: 760 }
};

const FINISHES = {
  brushed: { label: 'Brushed', multiplier: 1 },
  polished: { label: 'Polished', multiplier: 1.12 },
  painted: { label: 'Automotive Paint', multiplier: 1.2 },
  wrapped: { label: 'Special Wrap', multiplier: 1.25 }
};

const LIGHTING = {
  none: { label: 'None', rate: 0 },
  front: { label: 'Front-lit', rate: 340 },
  halo: { label: 'Halo', rate: 280 },
  front_halo: { label: 'Front + Halo', rate: 470 }
};

const state = { x: 650, y: 460, dragging: false, dragOffsetX: 0, dragOffsetY: 0 };
const $ = (id) => document.getElementById(id);
const els = {
  text: $('textInput'), font: $('fontSelect'), align: $('alignSelect'),
  height: $('heightInput'), heightRange: $('heightRange'),
  depth: $('depthInput'), depthRange: $('depthRange'),
  spacing: $('spacingInput'), spacingRange: $('spacingRange'),
  wall: $('wallInput'), wallRange: $('wallRange'),
  acrylic: $('acrylicInput'), acrylicRange: $('acrylicRange'),
  qty: $('qtyInput'), material: $('materialSelect'), finish: $('finishSelect'),
  light: $('lightSelect'), lightColor: $('lightColorInput'), faceColor: $('faceColorInput'),
  tilt: $('tiltInput'), scale: $('scaleInput'), canvas: $('previewCanvas'),
  areaOut: $('areaOut'), materialOut: $('materialOut'), lightOut: $('lightOut'),
  finishOut: $('finishOut'), subtotalOut: $('subtotalOut'), marginOut: $('marginOut'), totalOut: $('totalOut'),
  copyBtn: $('copyBtn'), downloadBtn: $('downloadBtn'), savePresetBtn: $('savePresetBtn'),
  presetSelect: $('presetSelect'), centerBtn: $('centerBtn'), wallStat: $('wallStat'), acrylicStat: $('acrylicStat')
};
const ctx = els.canvas.getContext('2d');

function populateSelect(select, source) {
  Object.entries(source).forEach(([value, item]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = item.label;
    select.append(option);
  });
}

const brl = (value) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function syncPair(a, b) {
  a.addEventListener('input', () => { b.value = a.value; render(); });
  b.addEventListener('input', () => { a.value = b.value; render(); });
}

function getConfig() {
  return {
    text: els.text.value.toUpperCase().trim() || 'TEXT',
    font: els.font.value,
    align: els.align.value,
    letterHeightMm: clamp(Number(els.height.value), 50, 2000),
    depthMm: clamp(Number(els.depth.value), 20, 400),
    spacingMm: clamp(Number(els.spacing.value), 0, 200),
    wallMm: clamp(Number(els.wall.value), 1, 10),
    acrylicMm: clamp(Number(els.acrylic.value), 2, 10),
    qty: clamp(Number(els.qty.value), 1, 100),
    material: els.material.value,
    finish: els.finish.value,
    light: els.light.value,
    lightColor: els.lightColor.value,
    faceColor: els.faceColor.value,
    tilt: Number(els.tilt.value),
    scale: Number(els.scale.value)
  };
}

function calculatePricing(cfg) {
  const letterCount = cfg.text.replace(/\s+/g, '').length;
  const widthFactor = 0.64;
  const h = cfg.letterHeightMm / 1000;
  const w = (cfg.letterHeightMm * widthFactor) / 1000;
  const d = cfg.depthMm / 1000;
  const areaPerLetter = h * w;
  const sideAreaPerLetter = (h + w) * d * 2;
  const spacingFactor = 1 + cfg.spacingMm / 700;
  const totalArea = (areaPerLetter + sideAreaPerLetter) * letterCount * spacingFactor * cfg.qty;

  const materialCost = totalArea * MATERIALS[cfg.material].rate;
  const lightCost = totalArea * LIGHTING[cfg.light].rate;
  const finishCost = (materialCost + lightCost) * (FINISHES[cfg.finish].multiplier - 1);
  const subtotal = materialCost + lightCost + finishCost;
  const margin = subtotal * 0.32 + 180;
  const total = subtotal + margin;
  return { totalArea, materialCost, lightCost, finishCost, subtotal, margin, total };
}

function drawStageGrid() {
  const w = els.canvas.width;
  const h = els.canvas.height;
  const horizonY = h * 0.43;
  const vanishingX = w * 0.48;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1b1d7f');
  grad.addColorStop(1, '#17196f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(183, 191, 255, 0.16)';
  for (let i = -8; i <= 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo((w / 2) + i * 120, h);
    ctx.lineTo(vanishingX + i * 42, horizonY);
    ctx.stroke();
  }

  for (let i = 0; i < 22; i += 1) {
    const t = i / 21;
    const y = horizonY + (h - horizonY) * (t ** 1.8);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(224, 231, 255, 0.28)';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(w, horizonY);
  ctx.stroke();
}

function drawPreview(cfg) {
  drawStageGrid();

  const depthPx = (cfg.depthMm / 10) * 2.2;
  const fontSize = (cfg.letterHeightMm / 10) * 2.45 * cfg.scale;

  ctx.save();
  ctx.translate(state.x, state.y);
  ctx.rotate((cfg.tilt * Math.PI) / 180);
  ctx.font = `700 ${fontSize}px ${cfg.font}`;
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(cfg.text);
  let offsetX = 0;
  if (cfg.align === 'center') offsetX = -metrics.width / 2;
  if (cfg.align === 'right') offsetX = -metrics.width;

  for (let i = Math.ceil(depthPx); i >= 1; i -= 1) {
    ctx.fillStyle = `rgba(8, 11, 54, ${0.06 + i / (depthPx * 21)})`;
    ctx.fillText(cfg.text, offsetX + i, i * 0.72);
  }

  if (cfg.light !== 'none') {
    ctx.shadowColor = cfg.lightColor;
    ctx.shadowBlur = cfg.light === 'front_halo' ? 55 : 30;
    if (cfg.light === 'halo') {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillText(cfg.text, offsetX, 0);
    }
  }

  const grad = ctx.createLinearGradient(0, -fontSize / 2, 0, fontSize / 2);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(1, cfg.faceColor);
  ctx.fillStyle = grad;
  ctx.fillText(cfg.text, offsetX, 0);
  ctx.restore();
}

function render() {
  const cfg = getConfig();
  const p = calculatePricing(cfg);
  drawPreview(cfg);

  els.areaOut.textContent = `${p.totalArea.toFixed(2)} m²`;
  els.materialOut.textContent = brl(p.materialCost);
  els.lightOut.textContent = brl(p.lightCost);
  els.finishOut.textContent = brl(p.finishCost);
  els.subtotalOut.textContent = brl(p.subtotal);
  els.marginOut.textContent = brl(p.margin);
  els.totalOut.textContent = brl(p.total);
  els.wallStat.textContent = `${cfg.wallMm}mm`;
  els.acrylicStat.textContent = `${cfg.acrylicMm}mm`;
}

function getPresetPayload() { return { ...getConfig(), x: state.x, y: state.y }; }

function applyPreset(p) {
  Object.assign(state, { x: p.x ?? state.x, y: p.y ?? state.y });
  const map = {
    text: els.text, font: els.font, align: els.align, letterHeightMm: els.height, depthMm: els.depth,
    spacingMm: els.spacing, wallMm: els.wall, acrylicMm: els.acrylic, qty: els.qty,
    material: els.material, finish: els.finish, light: els.light, lightColor: els.lightColor,
    faceColor: els.faceColor, tilt: els.tilt, scale: els.scale
  };
  Object.entries(p).forEach(([k, v]) => { if (map[k]) map[k].value = v; });
  els.heightRange.value = els.height.value;
  els.depthRange.value = els.depth.value;
  els.spacingRange.value = els.spacing.value;
  els.wallRange.value = els.wall.value;
  els.acrylicRange.value = els.acrylic.value;
  render();
}

function loadPresets() {
  const presets = JSON.parse(localStorage.getItem('letterMakerPresets') || '{}');
  els.presetSelect.innerHTML = '<option value="">Select a preset</option>';
  Object.keys(presets).forEach((name) => {
    const op = document.createElement('option');
    op.value = name;
    op.textContent = name;
    els.presetSelect.append(op);
  });
  return presets;
}

function bootstrap() {
  populateSelect(els.material, MATERIALS);
  populateSelect(els.finish, FINISHES);
  els.material.value = 'acrylic';
  els.finish.value = 'brushed';

  syncPair(els.height, els.heightRange);
  syncPair(els.depth, els.depthRange);
  syncPair(els.spacing, els.spacingRange);
  syncPair(els.wall, els.wallRange);
  syncPair(els.acrylic, els.acrylicRange);

  Object.values(els).forEach((el) => {
    if (el instanceof HTMLElement && ['INPUT', 'SELECT'].includes(el.tagName)) {
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    }
  });

  els.centerBtn.addEventListener('click', () => {
    state.x = els.canvas.width * 0.48;
    state.y = els.canvas.height * 0.52;
    render();
  });

  els.copyBtn.addEventListener('click', async () => {
    const cfg = getConfig();
    const p = calculatePricing(cfg);
    const text = [
      'Letter Maker Quote',
      `Text: ${cfg.text}`,
      `Material: ${MATERIALS[cfg.material].label}`,
      `Lighting: ${LIGHTING[cfg.light].label}`,
      `Total estimate: ${brl(p.total)}`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      els.copyBtn.textContent = 'Copied!';
      setTimeout(() => { els.copyBtn.textContent = 'Copy Quote'; }, 1200);
    } catch {
      alert(text);
    }
  });

  els.downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `preview-${Date.now()}.png`;
    link.href = els.canvas.toDataURL('image/png');
    link.click();
  });

  els.savePresetBtn.addEventListener('click', () => {
    const name = prompt('Preset name:');
    if (!name) return;
    const presets = JSON.parse(localStorage.getItem('letterMakerPresets') || '{}');
    presets[name] = getPresetPayload();
    localStorage.setItem('letterMakerPresets', JSON.stringify(presets));
    loadPresets();
    els.presetSelect.value = name;
  });

  els.presetSelect.addEventListener('change', () => {
    if (!els.presetSelect.value) return;
    const presets = loadPresets();
    if (presets[els.presetSelect.value]) applyPreset(presets[els.presetSelect.value]);
  });

  els.canvas.addEventListener('pointerdown', (event) => {
    state.dragging = true;
    const rect = els.canvas.getBoundingClientRect();
    const sx = els.canvas.width / rect.width;
    const sy = els.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * sx;
    const y = (event.clientY - rect.top) * sy;
    state.dragOffsetX = x - state.x;
    state.dragOffsetY = y - state.y;
  });

  window.addEventListener('pointermove', (event) => {
    if (!state.dragging) return;
    const rect = els.canvas.getBoundingClientRect();
    const sx = els.canvas.width / rect.width;
    const sy = els.canvas.height / rect.height;
    state.x = (event.clientX - rect.left) * sx - state.dragOffsetX;
    state.y = (event.clientY - rect.top) * sy - state.dragOffsetY;
    render();
  });
  window.addEventListener('pointerup', () => { state.dragging = false; });

  loadPresets();
  render();
}

bootstrap();
