const MATERIALS = {
  inox: { label: 'Inox', rate: 1450 },
  galvanizado: { label: 'Galvanizado', rate: 980 },
  acrilico: { label: 'Acrílico', rate: 1180 },
  pvc: { label: 'PVC Expandido', rate: 760 }
};

const FINISHES = {
  escovado: { label: 'Escovado', multiplier: 1 },
  polido: { label: 'Polido', multiplier: 1.12 },
  pintura: { label: 'Pintura automotiva', multiplier: 1.2 },
  envelopado: { label: 'Envelopado especial', multiplier: 1.25 }
};

const LIGHTING = {
  none: { label: 'Sem iluminação', rate: 0 },
  front: { label: 'Frontal', rate: 340 },
  halo: { label: 'Halo', rate: 280 },
  front_halo: { label: 'Frontal + Halo', rate: 470 }
};

const state = {
  x: 490,
  y: 230,
  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0
};

const $ = (id) => document.getElementById(id);
const els = {
  text: $('textInput'),
  font: $('fontSelect'),
  align: $('alignSelect'),
  height: $('heightInput'),
  depth: $('depthInput'),
  spacing: $('spacingInput'),
  qty: $('qtyInput'),
  material: $('materialSelect'),
  finish: $('finishSelect'),
  light: $('lightSelect'),
  lightColor: $('lightColorInput'),
  faceColor: $('faceColorInput'),
  tilt: $('tiltInput'),
  scale: $('scaleInput'),
  canvas: $('previewCanvas'),
  areaOut: $('areaOut'),
  materialOut: $('materialOut'),
  lightOut: $('lightOut'),
  finishOut: $('finishOut'),
  subtotalOut: $('subtotalOut'),
  marginOut: $('marginOut'),
  totalOut: $('totalOut'),
  copyBtn: $('copyBtn'),
  downloadBtn: $('downloadBtn'),
  savePresetBtn: $('savePresetBtn'),
  presetSelect: $('presetSelect')
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

function brl(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getConfig() {
  return {
    text: els.text.value.toUpperCase().trim() || 'TEXTO',
    font: els.font.value,
    align: els.align.value,
    letterHeightCm: clamp(Number(els.height.value), 5, 200),
    depthCm: clamp(Number(els.depth.value), 2, 40),
    spacingCm: clamp(Number(els.spacing.value), 0, 15),
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
  const areaPerLetter = (cfg.letterHeightCm / 100) * (cfg.letterHeightCm * widthFactor / 100);
  const sideAreaPerLetter = ((cfg.letterHeightCm / 100) + (cfg.letterHeightCm * widthFactor / 100)) * (cfg.depthCm / 100) * 2;

  const spacingFactor = 1 + cfg.spacingCm / 80;
  const totalArea = (areaPerLetter + sideAreaPerLetter) * letterCount * spacingFactor * cfg.qty;

  const materialRate = MATERIALS[cfg.material].rate;
  const lightRate = LIGHTING[cfg.light].rate;
  const finishMultiplier = FINISHES[cfg.finish].multiplier;

  const materialCost = totalArea * materialRate;
  const lightCost = totalArea * lightRate;
  const finishCost = (materialCost + lightCost) * (finishMultiplier - 1);
  const subtotal = materialCost + lightCost + finishCost;
  const margin = subtotal * 0.32 + 180;
  const total = subtotal + margin;

  return { totalArea, materialCost, lightCost, finishCost, subtotal, margin, total };
}

function drawPreview(cfg) {
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);

  const depthPx = cfg.depthCm * 2.2;
  const fontSize = cfg.letterHeightCm * 2.45 * cfg.scale;

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
    ctx.fillStyle = `rgba(24, 34, 51, ${0.045 + i / (depthPx * 23)})`;
    ctx.fillText(cfg.text, offsetX + i, i * 0.74);
  }

  if (cfg.light !== 'none') {
    ctx.shadowColor = cfg.lightColor;
    ctx.shadowBlur = cfg.light === 'front_halo' ? 46 : 26;
    if (cfg.light === 'halo') {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
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
  const price = calculatePricing(cfg);

  drawPreview(cfg);

  els.areaOut.textContent = `${price.totalArea.toFixed(2)} m²`;
  els.materialOut.textContent = brl(price.materialCost);
  els.lightOut.textContent = brl(price.lightCost);
  els.finishOut.textContent = brl(price.finishCost);
  els.subtotalOut.textContent = brl(price.subtotal);
  els.marginOut.textContent = brl(price.margin);
  els.totalOut.textContent = brl(price.total);
}

function getPresetPayload() {
  return {
    ...getConfig(),
    x: state.x,
    y: state.y
  };
}

function applyPreset(preset) {
  Object.assign(state, { x: preset.x ?? state.x, y: preset.y ?? state.y });
  Object.entries(preset).forEach(([key, value]) => {
    const elementByKey = {
      text: els.text,
      font: els.font,
      align: els.align,
      letterHeightCm: els.height,
      depthCm: els.depth,
      spacingCm: els.spacing,
      qty: els.qty,
      material: els.material,
      finish: els.finish,
      light: els.light,
      lightColor: els.lightColor,
      faceColor: els.faceColor,
      tilt: els.tilt,
      scale: els.scale
    }[key];

    if (elementByKey) elementByKey.value = value;
  });
  render();
}

function loadPresets() {
  const presets = JSON.parse(localStorage.getItem('letterLightPresets') || '{}');
  els.presetSelect.innerHTML = '<option value="">Selecione um preset</option>';
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
  els.material.value = 'acrilico';
  els.finish.value = 'escovado';

  const watched = [
    'input',
    'change'
  ];

  watched.forEach((ev) => {
    Object.values(els).forEach((el) => {
      if (el instanceof HTMLElement && ['INPUT', 'SELECT'].includes(el.tagName)) {
        el.addEventListener(ev, render);
      }
    });
  });

  els.copyBtn.addEventListener('click', async () => {
    const cfg = getConfig();
    const price = calculatePricing(cfg);
    const text = [
      `Orçamento Letter Light`,
      `Texto: ${cfg.text}`,
      `Material: ${MATERIALS[cfg.material].label}`,
      `Iluminação: ${LIGHTING[cfg.light].label}`,
      `Total estimado: ${brl(price.total)}`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      els.copyBtn.textContent = 'Copiado!';
      setTimeout(() => (els.copyBtn.textContent = 'Copiar orçamento'), 1200);
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
    const name = prompt('Nome do preset:');
    if (!name) return;
    const presets = JSON.parse(localStorage.getItem('letterLightPresets') || '{}');
    presets[name] = getPresetPayload();
    localStorage.setItem('letterLightPresets', JSON.stringify(presets));
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
    const sx = (els.canvas.width / rect.width);
    const sy = (els.canvas.height / rect.height);
    const mouseX = (event.clientX - rect.left) * sx;
    const mouseY = (event.clientY - rect.top) * sy;
    state.dragOffsetX = mouseX - state.x;
    state.dragOffsetY = mouseY - state.y;
  });

  window.addEventListener('pointermove', (event) => {
    if (!state.dragging) return;
    const rect = els.canvas.getBoundingClientRect();
    const sx = (els.canvas.width / rect.width);
    const sy = (els.canvas.height / rect.height);
    state.x = (event.clientX - rect.left) * sx - state.dragOffsetX;
    state.y = (event.clientY - rect.top) * sy - state.dragOffsetY;
    render();
  });

  window.addEventListener('pointerup', () => {
    state.dragging = false;
  });

  loadPresets();
  render();
}

bootstrap();
