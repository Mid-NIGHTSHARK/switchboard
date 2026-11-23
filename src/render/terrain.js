/**
 * Offscreen diorama cache builder: Washi paper fibers, sector terrain,
 * gravel ballast, wooden crossties, twin steel rails, diamond-crossing plates,
 * portals, and colorblind-safe stations (Circle A / Square B / Triangle C).
 */

import { BOARD_H, BOARD_W, LINES } from '../engine/constants.js';
import { TrackMath } from '../engine/trackMath.js';

export function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export function drawShapeEmblem(c, shape, x, y, r, fill, stroke = null) {
  c.save();
  c.fillStyle = fill;
  c.beginPath();
  if (shape === 'circle') {
    c.arc(x, y, r, 0, Math.PI * 2);
  } else if (shape === 'square') {
    c.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76);
  } else {
    c.moveTo(x, y - r * 1.06);
    c.lineTo(x + r * 0.98, y + r * 0.82);
    c.lineTo(x - r * 0.98, y + r * 0.82);
    c.closePath();
  }
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 1.6;
    c.stroke();
  }
  c.restore();
}

export function buildStaticDiorama(canvas, engine) {
  canvas.width = BOARD_W * 2;
  canvas.height = BOARD_H * 2;
  const c = canvas.getContext('2d');
  c.scale(2, 2);

  // 1. Walnut console border + Washi drafting sheet
  c.fillStyle = '#332419';
  roundRect(c, 4, 4, BOARD_W - 8, BOARD_H - 8, 13);
  c.fill();

  c.fillStyle = '#f3ecdd';
  roundRect(c, 10, 10, BOARD_W - 20, BOARD_H - 20, 9);
  c.fill();

  const vig = c.createRadialGradient(BOARD_W * 0.5, BOARD_H * 0.46, 90, BOARD_W * 0.5, BOARD_H * 0.5, 450);
  vig.addColorStop(0, 'rgba(255, 253, 246, 0.54)');
  vig.addColorStop(1, 'rgba(186, 165, 132, 0.30)');
  c.fillStyle = vig;
  roundRect(c, 10, 10, BOARD_W - 20, BOARD_H - 20, 9);
  c.fill();

  // Deterministic paper fiber grain & terrain features
  c.save();
  roundRect(c, 10, 10, BOARD_W - 20, BOARD_H - 20, 9);
  c.clip();

  let seed = 1974 + (engine.shift.dayNum || 1) * 31;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 650; i++) {
    c.fillStyle = rand() > 0.5 ? 'rgba(125,105,78,0.055)' : 'rgba(255,255,255,0.12)';
    c.fillRect(10 + rand() * (BOARD_W - 20), 10 + rand() * (BOARD_H - 20), 2, 1.5);
  }

  drawSectorBackdrop(c, engine.shift.backdrop || 'blocks');

  // Drafting grid
  c.strokeStyle = 'rgba(126, 110, 88, 0.085)';
  c.lineWidth = 1;
  for (let x = 20; x < BOARD_W - 10; x += 20) {
    c.beginPath(); c.moveTo(x, 12); c.lineTo(x, BOARD_H - 12); c.stroke();
  }
  for (let y = 20; y < BOARD_H - 10; y += 20) {
    c.beginPath(); c.moveTo(12, y); c.lineTo(BOARD_W - 12, y); c.stroke();
  }
  c.strokeStyle = 'rgba(126, 110, 88, 0.16)';
  for (let x = 60; x < BOARD_W - 10; x += 100) {
    c.beginPath(); c.moveTo(x, 12); c.lineTo(x, BOARD_H - 12); c.stroke();
  }
  for (let y = 60; y < BOARD_H - 10; y += 100) {
    c.beginPath(); c.moveTo(12, y); c.lineTo(BOARD_W - 12, y); c.stroke();
  }
  c.restore();

  // Outer drafting border + corner brass rivets
  c.strokeStyle = '#c1af90';
  c.lineWidth = 1.8;
  roundRect(c, 16, 16, BOARD_W - 32, BOARD_H - 32, 6);
  c.stroke();

  [[27, 27], [BOARD_W - 27, 27], [27, BOARD_H - 27], [BOARD_W - 27, BOARD_H - 27]].forEach(([sx, sy]) => {
    c.fillStyle = '#c9973e';
    c.beginPath(); c.arc(sx, sy, 4.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6c4d18';
    c.lineWidth = 1;
    c.stroke();
    c.beginPath(); c.moveTo(sx - 2.8, sy - 1); c.lineTo(sx + 2.8, sy + 1); c.stroke();
  });

  // Blueprint Title Block
  c.fillStyle = 'rgba(100, 86, 68, 0.36)';
  c.font = '800 9.5px ui-monospace, monospace';
  c.textAlign = 'left';
  c.fillText(`${engine.shift.code} // ${engine.shift.sector || engine.shift.name.toUpperCase()}`, 40, 31);
  c.textAlign = 'right';
  c.fillText('JNR DISPATCH CONSOLE • SERIES 74', BOARD_W - 40, 31);

  // 2. Track Ballast, Wooden Sleepers & Twin Steel Rails
  for (const edge of engine.shift.edges) {
    strokeEdge(c, engine.nodeMap, edge, 'rgba(128, 110, 84, 0.22)', 26);
    strokeEdge(c, engine.nodeMap, edge, '#e2d6bf', 21);

    c.strokeStyle = '#978063';
    c.lineWidth = 2.6;
    for (let s = 7; s < edge._length - 7; s += 12) {
      const pt = TrackMath.sampleEdge(edge, s);
      const nx = -Math.sin(pt.angle) * 8.2;
      const ny = Math.cos(pt.angle) * 8.2;
      c.beginPath();
      c.moveTo(pt.x - nx, pt.y - ny);
      c.lineTo(pt.x + nx, pt.y + ny);
      c.stroke();
    }
    strokeTwinRails(c, edge, '#4b453e', 2.4, 4.6);
    strokeTwinRails(c, edge, '#8d8479', 0.9, 4.3);
  }

  // 3. Riveted Diamond-Crossing Plates
  for (const cr of engine.crossings) {
    c.save();
    c.translate(cr.x, cr.y);
    c.fillStyle = '#d3c2a4';
    c.strokeStyle = '#6e5e4b';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(0, -17); c.lineTo(17, 0); c.lineTo(0, 17); c.lineTo(-17, 0);
    c.closePath();
    c.fill();
    c.stroke();

    c.strokeStyle = 'rgba(184, 58, 43, 0.58)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(-6, -6); c.lineTo(6, 6);
    c.moveTo(6, -6);  c.lineTo(-6, 6);
    c.stroke();
    c.restore();
  }

  // 4. Portals, Merges, Stations
  for (const n of engine.shift.nodes) {
    if (n.type === 'portal') drawPortalBase(c, n);
    else if (n.type === 'station') drawStationBase(c, n);
    else if (n.type === 'merge') {
      c.fillStyle = '#3f3932';
      c.beginPath(); c.arc(n.x, n.y, 7.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#c9973e';
      c.lineWidth = 1.2;
      c.stroke();
      c.fillStyle = '#e6dac3';
      c.beginPath(); c.arc(n.x, n.y, 2.8, 0, Math.PI * 2); c.fill();
    }
  }
}

function drawSectorBackdrop(c, style) {
  c.save();
  if (style === 'bay') {
    c.fillStyle = 'rgba(54, 114, 158, 0.09)';
    c.beginPath();
    c.moveTo(410, BOARD_H);
    c.quadraticCurveTo(480, 460, BOARD_W, 385);
    c.lineTo(BOARD_W, BOARD_H);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(54, 114, 158, 0.18)';
    c.lineWidth = 1.2;
    c.stroke();
  } else if (style === 'river') {
    c.fillStyle = 'rgba(52, 116, 156, 0.095)';
    c.beginPath();
    c.moveTo(278, 0);
    c.bezierCurveTo(320, 210, 255, 420, 295, BOARD_H);
    c.lineTo(360, BOARD_H);
    c.bezierCurveTo(320, 420, 385, 210, 342, 0);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(52, 116, 156, 0.18)';
    c.lineWidth = 1;
    c.stroke();
  } else if (style === 'contours') {
    c.strokeStyle = 'rgba(130, 112, 85, 0.11)';
    c.lineWidth = 1.2;
    [105, 168, 232].forEach((r) => {
      c.beginPath();
      c.ellipse(320, 320, r * 1.15, r * 0.92, -0.18, 0, Math.PI * 2);
      c.stroke();
    });
  } else if (style === 'yard') {
    c.fillStyle = 'rgba(116, 98, 74, 0.065)';
    [[215, 44, 195, 20], [215, 576, 195, 22]].forEach(([x, y, w, h]) => {
      roundRect(c, x, y, w, h, 3);
      c.fill();
    });
  } else {
    c.fillStyle = 'rgba(128, 110, 84, 0.055)';
    [[255, 62, 130, 50], [255, 528, 130, 50]].forEach(([x, y, w, h]) => {
      roundRect(c, x, y, w, h, 4);
      c.fill();
    });
  }
  c.restore();
}

function strokeEdge(c, nodeMap, edge, color, width) {
  const a = nodeMap.get(edge.from);
  const b = nodeMap.get(edge.to);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.quadraticCurveTo(edge._cp.x, edge._cp.y, b.x, b.y);
  c.stroke();
}

function strokeTwinRails(c, edge, color, width, offset) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  [-offset, offset].forEach((off) => {
    c.beginPath();
    for (let i = 0; i < edge._lut.length; i++) {
      const p = edge._lut[i];
      const nx = -Math.sin(p.angle) * off;
      const ny = Math.cos(p.angle) * off;
      if (i === 0) c.moveTo(p.x + nx, p.y + ny);
      else c.lineTo(p.x + nx, p.y + ny);
    }
    c.stroke();
  });
}

function drawPortalBase(c, n) {
  c.save();
  c.translate(n.x, n.y);
  c.fillStyle = 'rgba(20, 16, 12, 0.22)';
  roundRect(c, -27, -17, 43, 39, 5);
  c.fill();

  c.fillStyle = '#26211d';
  roundRect(c, -29, -19, 42, 38, 5);
  c.fill();
  c.strokeStyle = '#c9973e';
  c.lineWidth = 2;
  c.stroke();

  c.fillStyle = '#110f0d';
  c.fillRect(6, -12, 6, 24);

  c.fillStyle = '#f5eedf';
  c.font = '900 11px ui-monospace, monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(n.label || n.id, -10, 0.5);
  c.restore();
}

function drawStationBase(c, n) {
  const info = LINES[n.line];
  c.save();
  c.translate(n.x, n.y);

  c.fillStyle = 'rgba(24, 18, 12, 0.22)';
  roundRect(c, -22, -24, 56, 53, 8);
  c.fill();

  c.fillStyle = info.color;
  roundRect(c, -25, -27, 54, 54, 7);
  c.fill();
  c.strokeStyle = '#1e1a16';
  c.lineWidth = 2.4;
  c.stroke();

  c.fillStyle = info.roof;
  roundRect(c, -21, -23, 46, 11, 4);
  c.fill();

  // Distinct colorblind-safe shape emblem (Circle / Square / Triangle)
  drawShapeEmblem(c, info.shape, 2, 1, 16, '#faf6ee', info.dark);

  c.fillStyle = info.dark;
  c.font = '900 15px ui-monospace, monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(info.code, 2, info.shape === 'triangle' ? 4 : 1.5);

  if (n.label) {
    c.fillStyle = '#4e453b';
    c.font = '800 8.5px ui-monospace, monospace';
    c.fillText(n.label, 2, 37);
  }
  c.restore();
}
