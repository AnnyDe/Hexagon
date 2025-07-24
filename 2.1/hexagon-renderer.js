// Erweiterte Hexagon-Rendering-Engine mit LoD-System
class HexagonRenderer {
    constructor(canvas, hexMath) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.hexMath = hexMath;
        
        // Performance-Optimierung
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Kamera-System
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.currentMousePos = { x: 0, y: 0 };
        
        // LoD-System integrieren
        this.lodSystem = new HexagonLoDSystem(hexMath);
        this.colorAverager = new HexagonColorAverager();
        
        this.setupCameraControls();
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 80;
        this.canvas.style.marginTop = '80px';
    }
    
    // Kamera-Kontroll-System aus der HTML-Version
    setupCameraControls() {
        let isDragging = false;
        let lastMousePos = { x: 0, y: 0 };
        
        // Maus-Events für Kamera-Bewegung
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Rechte Maustaste
                isDragging = true;
                const rect = this.canvas.getBoundingClientRect();
                lastMousePos = { 
                    x: e.clientX - rect.left, 
                    y: e.clientY - rect.top 
                };
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.currentMousePos.x = e.clientX - rect.left;
            this.currentMousePos.y = e.clientY - rect.top;
            
            if (!isDragging) return;
            
            const deltaX = this.currentMousePos.x - lastMousePos.x;
            const deltaY = this.currentMousePos.y - lastMousePos.y;
            
            this.camera.x += deltaX / this.camera.zoom;
            this.camera.y += deltaY / this.camera.zoom;
            
            lastMousePos = { x: this.currentMousePos.x, y: this.currentMousePos.y };
        });
        
        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Zoom-Funktionalität mit angepasstem Bereich (125% vom ursprünglichen)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.88 : 1.136; // Angepasst für mehr Zoom-Stufen
            this.camera.zoom = Math.max(0.08, Math.min(8, this.camera.zoom * zoomFactor)); // Erweitert auf 8 für mehr Zoom-Out
        });
        
        // Resize-Handler
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
    }
    
    // LoD-Level basierend auf Zoom bestimmen
    getLoDLevel(zoom) {
        if (zoom >= 0.8) return 0;      // Volldetail
        if (zoom >= 0.4) return 1;      // 7-Hexagon-Cluster
        if (zoom >= 0.2) return 2;      // 19-Hexagon-Cluster
        return 3;                       // Noch gröbere Cluster
    }
    
    // Hole die 6 Nachbarn eines Hexagons
    getHexNeighbors(q, r) {
        return [
            { q: q + 1, r: r },
            { q: q + 1, r: r - 1 },
            { q: q, r: r - 1 },
            { q: q - 1, r: r },
            { q: q - 1, r: r + 1 },
            { q: q, r: r + 1 }
        ];
    }
    
    // Hole 7-Hexagon-Cluster (Zentrum + 6 Nachbarn)
    get7HexCluster(centerQ, centerR) {
        const cluster = [{ q: centerQ, r: centerR }];
        cluster.push(...this.getHexNeighbors(centerQ, centerR));
        return cluster;
    }
    
    // Bestimme Cluster-Zentrum für gegebene Koordinaten
    getClusterCenter(q, r, lodLevel) {
        if (lodLevel === 0) return { q, r };
        
        const clusterSize = lodLevel === 1 ? 3 : 3 * Math.pow(2, lodLevel - 1);
        const clusterQ = Math.round(q / clusterSize) * clusterSize;
        const clusterR = Math.round(r / clusterSize) * clusterSize;
        return { q: clusterQ, r: clusterR };
    }
    
    // Berechne gemittelte Farbe für Cluster
    calculateClusterColor(clusterHexagons, hexagons) {
        const colors = [];
        
        for (const hex of clusterHexagons) {
            const hexKey = `${hex.q},${hex.r}`;
            const color = hexagons.get(hexKey);
            if (color && color !== '#1a1a1a') {
                colors.push(color);
            }
        }
        
        if (colors.length === 0) return '#1a1a1a';
        return this.colorAverager.averageColors(colors);
    }
    pixelToHex(screenX, screenY) {
        // Bildschirmkoordinaten zu Weltkoordinaten
        const worldX = (screenX - this.canvas.width / 2) / this.camera.zoom - this.camera.x;
        const worldY = (screenY - this.canvas.height / 2) / this.camera.zoom - this.camera.y;
        
        // Hexagon-Gitter-Koordinaten
        const q = (2/3 * worldX) / this.hexMath.hexSize;
        const r = (-1/3 * worldX + Math.sqrt(3)/3 * worldY) / this.hexMath.hexSize;
        
        return this.roundHex(q, r);
    }
    
    // Hex-Rundung aus der HTML-Version
    roundHex(q, r) {
        const s = -q - r;
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);
        
        const qDiff = Math.abs(rq - q);
        const rDiff = Math.abs(rr - r);
        const sDiff = Math.abs(rs - s);
        
        if (qDiff > rDiff && qDiff > sDiff) {
            rq = -rr - rs;
        } else if (rDiff > sDiff) {
            rr = -rq - rs;
        }
        
        return { q: rq, r: rr };
    }
    
    // Hex-zu-Pixel-Konvertierung aus der HTML-Version
    hexToPixel(q, r) {
        const x = this.hexMath.hexSize * (3/2 * q);
        const y = this.hexMath.hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
        return { x, y };
    }
    
    // Robuste Sichtbarkeitsberechnung aus der HTML-Version
    getVisibleHexRange() {
        // Berechne Bildschirmgrenzen in Weltkoordinaten
        const screenLeft = -this.canvas.width / 2 / this.camera.zoom - this.camera.x;
        const screenRight = this.canvas.width / 2 / this.camera.zoom - this.camera.x;
        const screenTop = -this.canvas.height / 2 / this.camera.zoom - this.camera.y;
        const screenBottom = this.canvas.height / 2 / this.camera.zoom - this.camera.y;
        
        // Reduzierter Puffer - nur minimal für nahtloses Scrolling
        const bufferX = this.hexMath.hexSize * 3; // Fester Puffer von 3 Hexagon-Breiten
        const bufferY = this.hexMath.hexSize * 3;
        
        // Erweiterte Grenzen
        const extendedLeft = screenLeft - bufferX;
        const extendedRight = screenRight + bufferX;
        const extendedTop = screenTop - bufferY;
        const extendedBottom = screenBottom + bufferY;
        
        // Hexagon-Gitter-Parameter
        const hexWidth = this.hexMath.hexSize * 1.5;  // Horizontaler Abstand zwischen Hexagon-Zentren
        const hexHeight = this.hexMath.hexSize * Math.sqrt(3) * 0.5;  // Vertikaler Versatz pro Zeile
        
        // Berechne q-Bereich (Spalten) - reduzierte Puffer
        const qMin = Math.floor(extendedLeft / hexWidth) - 2;
        const qMax = Math.ceil(extendedRight / hexWidth) + 2;
        
        // Berechne r-Bereich (Zeilen) - reduzierte Puffer
        const rMinRaw = Math.floor((extendedTop - hexHeight * Math.abs(qMin)) / (hexHeight * 2)) - 2;
        const rMaxRaw = Math.ceil((extendedBottom + hexHeight * Math.abs(qMax)) / (hexHeight * 2)) + 2;
        
        // Kleinerer r-Bereich
        const rMin = rMinRaw - Math.ceil(Math.abs(qMax - qMin) * 0.3);
        const rMax = rMaxRaw + Math.ceil(Math.abs(qMax - qMin) * 0.3);
        
        return { qMin, qMax, rMin, rMax };
    }
    
    // Zeichne ein einzelnes Hexagon mit optionaler Größenanpassung
    drawHexagon(x, y, fill, patterns, sizeMultiplier = 1.0) {
        const actualSize = this.hexMath.hexSize * sizeMultiplier;
        
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3;
            const hx = x + actualSize * Math.cos(angle);
            const hy = y + actualSize * Math.sin(angle);
            if (i === 0) {
                this.ctx.moveTo(hx, hy);
            } else {
                this.ctx.lineTo(hx, hy);
            }
        }
        this.ctx.closePath();
        
        // Fülle das Hexagon
        if (fill.startsWith('pattern:')) {
            this.drawPattern(x, y, fill, patterns, actualSize);
        } else {
            this.ctx.fillStyle = fill;
            this.ctx.fill();
        }
        
        // Zeichne Umrandung mit zoom-abhängiger Linienstärke
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = Math.max(0.5, 1 / this.camera.zoom);
        this.ctx.stroke();
    }
    
    // Zeichne Muster in Hexagon mit anpassbarer Größe
    drawPattern(x, y, fill, patterns, hexSize = null) {
        const actualHexSize = hexSize || this.hexMath.hexSize;
        const patternKey = fill.substring(8);
        const pattern = patterns.get(patternKey);
        
        if (pattern) {
            this.ctx.save();
            this.ctx.clip();
            
            // Berechne Muster-Skalierung
            const scale = (actualHexSize * 2) / Math.max(pattern.width, pattern.height);
            this.ctx.scale(scale, scale);
            
            // Zeichne das Muster
            const offsetX = (x / scale) - (pattern.width / 2);
            const offsetY = (y / scale) - (pattern.height / 2);
            
            // Wiederhole das Muster um vollständige Abdeckung zu gewährleisten
            for (let px = -pattern.width; px <= pattern.width * 2; px += pattern.width) {
                for (let py = -pattern.height; py <= pattern.height * 2; py += pattern.height) {
                    this.ctx.drawImage(pattern.image, offsetX + px, offsetY + py);
                }
            }
            
            this.ctx.restore();
        } else {
            // Fallback für fehlende Muster
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fill();
        }
    }
    
    // Erweiterte Haupt-Render-Schleife mit LoD-System
    render(hexagons, patterns) {
        const currentTime = performance.now();
        
        // Frame-Rate-Limiting für bessere Performance
        if (currentTime - this.lastFrameTime < this.frameInterval) {
            return false;
        }
        
        this.lastFrameTime = currentTime;
        
        // Canvas leeren
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Kamera-Transformation anwenden
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(this.camera.x, this.camera.y);
        
        // Sichtbaren Bereich und LoD-Level bestimmen
        const range = this.getVisibleHexRange();
        const lodLevel = this.getLoDLevel(this.camera.zoom);
        
        // LoD-basiertes Rendering
        if (lodLevel === 0) {
            // Volldetail - normale Hexagone
            for (let q = range.qMin; q <= range.qMax; q++) {
                for (let r = range.rMin; r <= range.rMax; r++) {
                    const pixel = this.hexToPixel(q, r);
                    const hexKey = `${q},${r}`;
                    const fill = hexagons.get(hexKey) || '#1a1a1a';
                    
                    this.drawHexagon(pixel.x, pixel.y, fill, patterns);
                }
            }
        } else {
            // Cluster-Modus
            const processedClusters = new Set();
            
            for (let q = range.qMin; q <= range.qMax; q++) {
                for (let r = range.rMin; r <= range.rMax; r++) {
                    const clusterCenter = this.getClusterCenter(q, r, lodLevel);
                    const clusterKey = `${clusterCenter.q},${clusterCenter.r}`;
                    
                    if (processedClusters.has(clusterKey)) continue;
                    processedClusters.add(clusterKey);
                    
                    // Cluster-Hexagone sammeln
                    const clusterHexagons = this.get7HexCluster(clusterCenter.q, clusterCenter.r);
                    const avgColor = this.calculateClusterColor(clusterHexagons, hexagons);
                    
                    // Nur zeichnen wenn Farbe nicht Standard-Hintergrund
                    if (avgColor !== '#1a1a1a') {
                        const pixel = this.hexToPixel(clusterCenter.q, clusterCenter.r);
                        const sizeMultiplier = 1.0 + (lodLevel * 0.3);
                        this.drawHexagon(pixel.x, pixel.y, avgColor, patterns, sizeMultiplier);
                    }
                }
            }
        }
        
        this.ctx.restore();
        return true;
    }
    
    // Kontinuierliche Animation wie in der HTML-Version
    startAnimation(hexagons, patterns) {
        const animate = () => {
            this.render(hexagons, patterns);
            requestAnimationFrame(animate);
        };
        animate();
    }
    
    // Hilfsmethoden für externe Interaktion
    getCurrentMouseHex() {
        return this.pixelToHex(this.currentMousePos.x, this.currentMousePos.y);
    }
    
    // Kamera-Kontrolle von außen
    setCamera(x, y, zoom) {
        this.camera.x = x;
        this.camera.y = y;
        this.camera.zoom = Math.max(0.1, Math.min(5, zoom));
    }
    
    getCamera() {
        return { ...this.camera };
    }
    
    // Zoom zu bestimmtem Punkt
    zoomToPoint(screenX, screenY, zoomFactor) {
        const worldPosBefore = {
            x: (screenX - this.canvas.width / 2) / this.camera.zoom - this.camera.x,
            y: (screenY - this.canvas.height / 2) / this.camera.zoom - this.camera.y
        };
        
        this.camera.zoom = Math.max(0.08, Math.min(8, this.camera.zoom * zoomFactor)); // Angepasst
        
        const worldPosAfter = {
            x: (screenX - this.canvas.width / 2) / this.camera.zoom - this.camera.x,
            y: (screenY - this.canvas.height / 2) / this.camera.zoom - this.camera.y
        };
        
        this.camera.x += (worldPosAfter.x - worldPosBefore.x);
        this.camera.y += (worldPosAfter.y - worldPosBefore.y);
    }
}

// Color-Averaging-Klasse für LAB-Farbmischung
class HexagonColorAverager {
    constructor() {
        this.method = 'lab'; // LAB für natürlichste Ergebnisse
    }
    
    // Hauptmethode zum Farben-Mitteln
    averageColors(colors) {
        if (colors.length === 0) return '#000000';
        if (colors.length === 1) return colors[0];
        
        return this.averageLAB(colors);
    }
    
    // LAB-Mittelung (perceptually uniform, am natürlichsten)
    averageLAB(colors) {
        let totalL = 0, totalA = 0, totalB = 0;
        
        for (const color of colors) {
            const rgb = this.hexToRgb(color);
            const lab = this.rgbToLab(rgb.r, rgb.g, rgb.b);
            totalL += lab.l;
            totalA += lab.a;
            totalB += lab.b;
        }
        
        const avgL = totalL / colors.length;
        const avgA = totalA / colors.length;
        const avgB = totalB / colors.length;
        
        const rgb = this.labToRgb(avgL, avgA, avgB);
        return this.rgbToHex(Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b));
    }
    
    // Hilfsfunktionen für Farbkonvertierung
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    // Vereinfachte LAB-Konvertierung (optimiert für Performance)
    rgbToLab(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        const a = (r - g) * 127;
        const b_lab = (g - b) * 127;
        return { l: l * 100, a, b: b_lab };
    }
    
    labToRgb(l, a, b) {
        l /= 100;
        a /= 127;
        b /= 127;
        
        const g = l;
        const r = g + a;
        const b_rgb = g - b;
        
        return {
            r: Math.max(0, Math.min(255, r * 255)),
            g: Math.max(0, Math.min(255, g * 255)),
            b: Math.max(0, Math.min(255, b_rgb * 255))
        };
    }
}
