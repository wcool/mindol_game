'use strict';
// ═══════════════════════════════════════════
//  3D VOXEL RENDERER
// ═══════════════════════════════════════════

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function colorBright(hex, f) {
    const { r, g, b } = hexToRgb(hex);
    const c = v => Math.min(255, Math.max(0, Math.round(v * f)));
    return `rgb(${c(r)},${c(g)},${c(b)})`;
}
function lighten(hex, f) { return colorBright(hex, 1 + f); }
function darken(hex, f) { return colorBright(hex, 1 - f); }

// cx,cy = bottom-center of front face
function drawBox3D(ctx, cx, cy, bw, bh, color, depth = 10) {
    const lx = cx - bw / 2, rx = cx + bw / 2, ty = cy - bh;
    const ox = depth * 0.75, oy = depth * 0.5;
    // Front
    ctx.fillStyle = color;
    ctx.fillRect(lx, ty, bw, bh);
    // Right side
    ctx.fillStyle = darken(color, 0.35);
    ctx.beginPath();
    ctx.moveTo(rx, ty); ctx.lineTo(rx + ox, ty - oy);
    ctx.lineTo(rx + ox, cy - oy); ctx.lineTo(rx, cy);
    ctx.closePath(); ctx.fill();
    // Top
    ctx.fillStyle = lighten(color, 0.45);
    ctx.beginPath();
    ctx.moveTo(lx, ty); ctx.lineTo(rx, ty);
    ctx.lineTo(rx + ox, ty - oy); ctx.lineTo(lx + ox, ty - oy);
    ctx.closePath(); ctx.fill();
}

// ─── CHAR RENDERER ──────────────────────────────────────────────
const CharRenderer = {

    drawShadow(ctx, cx, cy, s, hopArc) {
        ctx.save();
        ctx.globalAlpha = 0.28 * (1 - hopArc * 0.5);
        ctx.fillStyle = '#000';
        const sw = 0.6 + 0.4 * (1 - hopArc);
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, 26 * s * sw, 9 * s * sw, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    render(ctx, charData, cx, cy, s, hopArc, squash, facing, blinkOpen) {
        this.drawShadow(ctx, cx, cy, s, hopArc);
        ctx.save();
        ctx.translate(cx, cy - hopArc * 30 * s);
        ctx.scale(1 + squash * 0.18, 1 - squash * 0.28);
        if (facing === 'right') ctx.scale(-1, 1);
        const fn = this[charData.id] || this._default;
        fn.call(this, ctx, charData, s, blinkOpen);
        ctx.restore();
    },

    _eyes(ctx, s, open, col) {
        ctx.fillStyle = col || '#333';
        if (!open) {
            ctx.fillRect(-9 * s, -38 * s, 5 * s, 2 * s);
            ctx.fillRect(3 * s, -38 * s, 5 * s, 2 * s);
        } else {
            ctx.beginPath();
            ctx.arc(-7 * s, -38 * s, 3 * s, 0, Math.PI * 2);
            ctx.arc(5 * s, -38 * s, 3 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.arc(-6 * s, -39.5 * s, 1.2 * s, 0, Math.PI * 2);
            ctx.arc(6 * s, -39.5 * s, 1.2 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    _blush(ctx, s, col) {
        if (!col) return;
        ctx.save(); ctx.globalAlpha = 0.55;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(-9 * s, -34 * s, 5 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(7 * s, -34 * s, 5 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    _default(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 30 * s, 26 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 2 * s, -26 * s, 28 * s, 24 * s, c.bodyColor, 9 * s);
        this._eyes(ctx, s, blink, c.eyeColor);
        this._blush(ctx, s, c.blushColor);
    },

    chick(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 32 * s, 24 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 1 * s, -24 * s, 30 * s, 26 * s, c.bodyColor, 9 * s);
        // wing
        ctx.fillStyle = darken(c.bodyColor, 0.15);
        ctx.beginPath(); ctx.ellipse(-17 * s, -10 * s, 8 * s, 5 * s, -0.3, 0, Math.PI * 2); ctx.fill();
        // beak
        ctx.fillStyle = '#FF9800';
        ctx.beginPath(); ctx.moveTo(-2 * s, -31 * s); ctx.lineTo(6 * s, -28 * s); ctx.lineTo(-2 * s, -25 * s); ctx.closePath(); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    frog(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 30 * s, 22 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 0, -22 * s, 32 * s, 22 * s, c.bodyColor, 9 * s);
        // eye bumps
        ctx.fillStyle = lighten(c.bodyColor, 0.2);
        ctx.beginPath(); ctx.arc(-10 * s, -44 * s, 7 * s, 0, Math.PI * 2); ctx.arc(10 * s, -44 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor);
    },

    bunny(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 28 * s, 24 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 1 * s, -24 * s, 26 * s, 22 * s, c.bodyColor, 8 * s);
        drawBox3D(ctx, -7 * s, -44 * s, 10 * s, 22 * s, c.bodyColor, 5 * s);
        drawBox3D(ctx, 7 * s, -44 * s, 10 * s, 22 * s, c.bodyColor, 5 * s);
        ctx.fillStyle = darken(c.eyeColor, -0.3) || '#ffaacc';
        ctx.fillRect(-10 * s, -61 * s, 6 * s, 14 * s); ctx.fillRect(4 * s, -61 * s, 6 * s, 14 * s);
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    cat(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 30 * s, 24 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 0, -24 * s, 28 * s, 22 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, -10 * s, -46 * s, 10 * s, 12 * s, c.bodyColor, 5 * s);
        drawBox3D(ctx, 8 * s, -46 * s, 10 * s, 12 * s, c.bodyColor, 5 * s);
        // tail
        ctx.strokeStyle = c.bodyColor; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(18 * s, 0); ctx.quadraticCurveTo(32 * s, -18 * s, 22 * s, -34 * s); ctx.stroke();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    dog(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 32 * s, 24 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 1 * s, -24 * s, 30 * s, 22 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, -16 * s, -30 * s, 12 * s, 18 * s, darken(c.bodyColor, 0.2), 5 * s);
        drawBox3D(ctx, 14 * s, -30 * s, 12 * s, 18 * s, darken(c.bodyColor, 0.2), 5 * s);
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(0, -28 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    hamster(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 28 * s, 22 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 0, -22 * s, 36 * s, 28 * s, c.bodyColor, 10 * s);
        ctx.fillStyle = lighten(c.bodyColor, 0.25);
        ctx.beginPath(); ctx.ellipse(-18 * s, -28 * s, 10 * s, 11 * s, 0, 0, Math.PI * 2); ctx.ellipse(18 * s, -28 * s, 10 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    duck(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 30 * s, 24 * s, '#8BC34A', 9 * s);
        drawBox3D(ctx, 1 * s, -24 * s, 26 * s, 22 * s, '#8BC34A', 8 * s);
        ctx.fillStyle = '#81D4FA'; ctx.beginPath(); ctx.ellipse(-16 * s, -12 * s, 8 * s, 5 * s, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF9800'; ctx.beginPath(); ctx.moveTo(-3 * s, -30 * s); ctx.lineTo(9 * s, -28 * s); ctx.lineTo(9 * s, -24 * s); ctx.lineTo(-3 * s, -24 * s); ctx.closePath(); ctx.fill();
        this._eyes(ctx, s, blink, '#333');
    },

    pig(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 32 * s, 26 * s, c.bodyColor, 10 * s);
        drawBox3D(ctx, 0, -26 * s, 30 * s, 24 * s, c.bodyColor, 10 * s);
        drawBox3D(ctx, -12 * s, -50 * s, 10 * s, 10 * s, c.bodyColor, 4 * s);
        drawBox3D(ctx, 10 * s, -50 * s, 10 * s, 10 * s, c.bodyColor, 4 * s);
        ctx.fillStyle = darken(c.bodyColor, 0.1); ctx.beginPath(); ctx.ellipse(0, -30 * s, 8 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(-3 * s, -30 * s, 2 * s, 0, Math.PI * 2); ctx.arc(3 * s, -30 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    penguin(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 28 * s, 26 * s, c.bodyColor, 9 * s);
        ctx.fillStyle = '#ECEFF1'; ctx.fillRect(-10 * s, -24 * s, 20 * s, 18 * s);
        drawBox3D(ctx, 0, -26 * s, 26 * s, 22 * s, c.bodyColor, 8 * s);
        ctx.fillStyle = '#ECEFF1'; ctx.fillRect(-10 * s, -46 * s, 20 * s, 16 * s);
        ctx.fillStyle = c.blushColor || '#FF7043';
        ctx.beginPath(); ctx.moveTo(-4 * s, -32 * s); ctx.lineTo(4 * s, -32 * s); ctx.lineTo(0, -28 * s); ctx.closePath(); ctx.fill();
        this._eyes(ctx, s, blink, '#333');
    },

    bear(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 32 * s, 26 * s, c.bodyColor, 10 * s);
        drawBox3D(ctx, 0, -26 * s, 30 * s, 26 * s, c.bodyColor, 10 * s);
        drawBox3D(ctx, -12 * s, -52 * s, 12 * s, 10 * s, c.bodyColor, 5 * s);
        drawBox3D(ctx, 10 * s, -52 * s, 12 * s, 10 * s, c.bodyColor, 5 * s);
        ctx.fillStyle = lighten(c.bodyColor, 0.3); ctx.beginPath(); ctx.ellipse(0, -30 * s, 9 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, -32 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    koala(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 30 * s, 24 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 0, -24 * s, 34 * s, 28 * s, c.bodyColor, 10 * s);
        drawBox3D(ctx, -17 * s, -52 * s, 18 * s, 18 * s, darken(c.bodyColor, 0.1), 7 * s);
        drawBox3D(ctx, 15 * s, -52 * s, 18 * s, 18 * s, darken(c.bodyColor, 0.1), 7 * s);
        ctx.fillStyle = '#5D4037'; ctx.beginPath(); ctx.ellipse(0, -32 * s, 7 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor);
    },

    mouse(ctx, c, s, blink) {
        drawBox3D(ctx, 1 * s, 0, 26 * s, 22 * s, c.bodyColor, 8 * s);
        drawBox3D(ctx, 1 * s, -22 * s, 28 * s, 24 * s, c.bodyColor, 9 * s);
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.arc(-12 * s, -46 * s, 9 * s, 0, Math.PI * 2); ctx.arc(12 * s, -46 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.blushColor || '#ffc0cb';
        ctx.beginPath(); ctx.arc(-12 * s, -46 * s, 5 * s, 0, Math.PI * 2); ctx.arc(12 * s, -46 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    fox(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 28 * s, 24 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 0, -24 * s, 28 * s, 24 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, -10 * s, -48 * s, 10 * s, 16 * s, c.bodyColor, 4 * s);
        drawBox3D(ctx, 8 * s, -48 * s, 10 * s, 16 * s, c.bodyColor, 4 * s);
        ctx.fillStyle = '#fff'; ctx.fillRect(-8 * s, -44 * s, 16 * s, 14 * s);
        ctx.strokeStyle = c.bodyColor; ctx.lineWidth = 8 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(16 * s, 0); ctx.quadraticCurveTo(36 * s, -8 * s, 28 * s, -26 * s); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * s;
        ctx.beginPath(); ctx.moveTo(24 * s, -22 * s); ctx.lineTo(28 * s, -26 * s); ctx.stroke();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    panda(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 32 * s, 26 * s, '#fff', 10 * s);
        drawBox3D(ctx, 0, -26 * s, 30 * s, 26 * s, '#fff', 10 * s);
        ctx.fillStyle = '#212121';
        ctx.beginPath(); ctx.ellipse(-9 * s, -38 * s, 9 * s, 7 * s, -0.3, 0, Math.PI * 2); ctx.ellipse(9 * s, -38 * s, 9 * s, 7 * s, 0.3, 0, Math.PI * 2); ctx.fill();
        drawBox3D(ctx, -12 * s, -52 * s, 12 * s, 10 * s, '#212121', 5 * s);
        drawBox3D(ctx, 10 * s, -52 * s, 12 * s, 10 * s, '#212121', 5 * s);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-9 * s, -39 * s, 4 * s, 0, Math.PI * 2); ctx.arc(9 * s, -39 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(-8 * s, -39 * s, 2.5 * s, 0, Math.PI * 2); ctx.arc(10 * s, -39 * s, 2.5 * s, 0, Math.PI * 2); ctx.fill();
    },

    tiger(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 32 * s, 26 * s, c.bodyColor, 10 * s);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(-8 * s, -24 * s, 4 * s, 20 * s); ctx.fillRect(2 * s, -24 * s, 4 * s, 20 * s);
        drawBox3D(ctx, 0, -26 * s, 30 * s, 26 * s, c.bodyColor, 10 * s);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-6 * s, -50 * s, 3 * s, 18 * s); ctx.fillRect(1 * s, -50 * s, 3 * s, 18 * s);
        drawBox3D(ctx, -12 * s, -52 * s, 10 * s, 10 * s, c.bodyColor, 4 * s);
        drawBox3D(ctx, 10 * s, -52 * s, 10 * s, 10 * s, c.bodyColor, 4 * s);
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    wolf(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 30 * s, 26 * s, c.bodyColor, 10 * s);
        drawBox3D(ctx, 0, -26 * s, 28 * s, 24 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, -12 * s, -50 * s, 10 * s, 18 * s, c.bodyColor, 4 * s);
        drawBox3D(ctx, 10 * s, -50 * s, 10 * s, 18 * s, c.bodyColor, 4 * s);
        ctx.fillStyle = lighten(c.bodyColor, 0.3); ctx.fillRect(-10 * s, -36 * s, 20 * s, 12 * s);
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, -34 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor);
    },

    raccoon(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 30 * s, 24 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 0, -24 * s, 28 * s, 24 * s, c.bodyColor, 9 * s);
        ctx.fillStyle = '#424242';
        ctx.fillRect(-14 * s, -46 * s, 10 * s, 10 * s); ctx.fillRect(4 * s, -46 * s, 10 * s, 10 * s);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-9 * s, -41 * s, 4 * s, 0, Math.PI * 2); ctx.arc(9 * s, -41 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.bodyColor; ctx.beginPath(); ctx.arc(-12 * s, -48 * s, 8 * s, 0, Math.PI * 2); ctx.arc(12 * s, -48 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = c.bodyColor; ctx.lineWidth = 7 * s;
        ctx.beginPath(); ctx.moveTo(16 * s, 0); ctx.quadraticCurveTo(34 * s, -6 * s, 30 * s, -20 * s); ctx.stroke();
        ctx.strokeStyle = '#424242'; ctx.lineWidth = 3 * s; ctx.stroke();
        this._eyes(ctx, s, blink, '#333');
    },

    monkey(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 28 * s, 24 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 0, -24 * s, 30 * s, 26 * s, c.bodyColor, 10 * s);
        ctx.fillStyle = lighten(c.bodyColor, 0.3); ctx.beginPath(); ctx.ellipse(0, -28 * s, 10 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = lighten(c.bodyColor, 0.2); ctx.beginPath(); ctx.arc(-16 * s, -38 * s, 7 * s, 0, Math.PI * 2); ctx.arc(16 * s, -38 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    sheep(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 32 * s, 26 * s, c.bodyColor, 10 * s);
        ctx.fillStyle = c.bodyColor;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc((-16 + i * 8) * s, -26 * s, 7 * s, 0, Math.PI * 2); ctx.fill(); }
        drawBox3D(ctx, 0, -26 * s, 24 * s, 24 * s, '#B0BEC5', 8 * s);
        drawBox3D(ctx, -14 * s, -34 * s, 8 * s, 12 * s, c.bodyColor, 4 * s);
        drawBox3D(ctx, 12 * s, -34 * s, 8 * s, 12 * s, c.bodyColor, 4 * s);
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(0, -32 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    owl(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 28 * s, 24 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, 0, -24 * s, 30 * s, 28 * s, c.bodyColor, 9 * s);
        drawBox3D(ctx, -10 * s, -52 * s, 8 * s, 10 * s, c.bodyColor, 3 * s);
        drawBox3D(ctx, 8 * s, -52 * s, 8 * s, 10 * s, c.bodyColor, 3 * s);
        ctx.fillStyle = '#FFF59D'; ctx.beginPath(); ctx.arc(-9 * s, -38 * s, 9 * s, 0, Math.PI * 2); ctx.arc(9 * s, -38 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2E7D32'; ctx.beginPath(); ctx.arc(-9 * s, -38 * s, 6 * s, 0, Math.PI * 2); ctx.arc(9 * s, -38 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-9 * s, -38 * s, 3 * s, 0, Math.PI * 2); ctx.arc(9 * s, -38 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-7 * s, -40 * s, 1.5 * s, 0, Math.PI * 2); ctx.arc(11 * s, -40 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF8F00'; ctx.beginPath(); ctx.moveTo(-3 * s, -30 * s); ctx.lineTo(3 * s, -30 * s); ctx.lineTo(0, -26 * s); ctx.closePath(); ctx.fill();
    },

    unicorn(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 30 * s, 26 * s, '#fff', 10 * s);
        drawBox3D(ctx, 0, -26 * s, 28 * s, 24 * s, '#fff', 9 * s);
        const mc = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF'];
        for (let i = 0; i < 5; i++) { ctx.fillStyle = mc[i]; ctx.fillRect((-14 + i * 4) * s, -50 * s, 3.5 * s, 22 * s); }
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(-4 * s, -50 * s); ctx.lineTo(4 * s, -50 * s); ctx.lineTo(0, -68 * s); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(-2 * s, -50 * s); ctx.lineTo(0, -50 * s); ctx.lineTo(-2 * s, -67 * s); ctx.closePath(); ctx.fill();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    dragon(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 30 * s, 26 * s, c.bodyColor, 10 * s);
        drawBox3D(ctx, 0, -26 * s, 28 * s, 24 * s, c.bodyColor, 9 * s);
        ctx.fillStyle = darken(c.bodyColor, 0.2);
        ctx.beginPath(); ctx.moveTo(-15 * s, -20 * s); ctx.lineTo(-32 * s, -40 * s); ctx.lineTo(-20 * s, -18 * s); ctx.closePath(); ctx.fill();
        drawBox3D(ctx, -8 * s, -50 * s, 6 * s, 12 * s, '#FF8F00', 3 * s);
        drawBox3D(ctx, 6 * s, -50 * s, 6 * s, 12 * s, '#FF8F00', 3 * s);
        ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = '#FF6B00';
        ctx.beginPath(); ctx.moveTo(12 * s, -28 * s); ctx.quadraticCurveTo(28 * s, -28 * s, 24 * s, -22 * s); ctx.fill(); ctx.restore();
        this._eyes(ctx, s, blink, c.eyeColor); this._blush(ctx, s, c.blushColor);
    },

    alien(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 26 * s, 22 * s, c.bodyColor, 8 * s);
        drawBox3D(ctx, 0, -22 * s, 35 * s, 30 * s, c.bodyColor, 10 * s);
        ctx.fillStyle = c.eyeColor;
        ctx.beginPath(); ctx.ellipse(-10 * s, -36 * s, 9 * s, 7 * s, -0.2, 0, Math.PI * 2); ctx.ellipse(10 * s, -36 * s, 9 * s, 7 * s, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(-10 * s, -36 * s, 5 * s, 4 * s, -0.2, 0, Math.PI * 2); ctx.ellipse(10 * s, -36 * s, 5 * s, 4 * s, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = c.bodyColor; ctx.lineWidth = 2.5 * s;
        ctx.beginPath(); ctx.moveTo(-8 * s, -52 * s); ctx.lineTo(-14 * s, -64 * s); ctx.moveTo(8 * s, -52 * s); ctx.lineTo(14 * s, -64 * s); ctx.stroke();
        ctx.fillStyle = '#FF6B6B'; ctx.beginPath(); ctx.arc(-14 * s, -64 * s, 3.5 * s, 0, Math.PI * 2); ctx.arc(14 * s, -64 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
    },

    robot(ctx, c, s, blink) {
        drawBox3D(ctx, 0, 0, 30 * s, 28 * s, c.bodyColor, 10 * s);
        ctx.fillStyle = darken(c.bodyColor, 0.2); ctx.fillRect(-10 * s, -24 * s, 20 * s, 16 * s);
        ctx.fillStyle = `hsl(${Date.now() / 20 % 360},90%,60%)`; ctx.beginPath(); ctx.arc(0, -16 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
        drawBox3D(ctx, 0, -28 * s, 26 * s, 22 * s, lighten(c.bodyColor, 0.1), 9 * s);
        ctx.fillStyle = '#1A237E'; ctx.fillRect(-10 * s, -48 * s, 20 * s, 10 * s);
        ctx.fillStyle = c.eyeColor; ctx.beginPath(); ctx.arc(0, -43 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
        drawBox3D(ctx, 0, -50 * s, 4 * s, 10 * s, darken(c.bodyColor, 0.2), 2 * s);
    },
};
