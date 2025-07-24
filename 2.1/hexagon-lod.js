// Hexagon Level-of-Detail (LoD) System
class HexagonLoDSystem {
    constructor(hexMath) {
        this.hexMath = hexMath;
        this.lodCache = new Map(); // Cache für berechnete LoD-Daten
        this.colorAverager = new HexagonColorAverager();
    }
    
    // Bestimme LoD-Level basierend auf Zoom
    getLoDLevel(zoom) {
        if (zoom >= 1.0) return 0;      // Volldetail
        if (zoom >= 0.5) return 1;      // 7-Hexagon-Cluster
        if (zoom >= 0.25) return 2;     // 19-Hexagon-Cluster (7*7 minus Überlappung)
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
        if (lodLevel === 0) return { q, r }; // Kein Clustering
        
        // Für LoD 1: Finde das nächste 7-Hexagon-Cluster-Zentrum
        if (lodLevel === 1) {
            // Vereinfachte Cluster-Zuordnung basierend auf Gitter-Struktur
            const clusterSize = 3; // Abstand zwischen Cluster-Zentren
            const clusterQ = Math.round(q / clusterSize) * clusterSize;
            const clusterR = Math.round(r / clusterSize) * clusterSize;
            return { q: clusterQ, r: clusterR };
        }
        
        // Für höhere LoD-Level: Größere Cluster
        const clusterSize = 3 * Math.pow(2, lodLevel - 1);
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
            if (color && color !== '#1a1a1a') { // Ignoriere Hintergrundfarbe
                colors.push(color);
            }
        }
        
        if (colors.length === 0) return '#1a1a1a'; // Standard-Hintergrund
        
        return this.colorAverager.averageColors(colors);
    }
    
    // Generiere LoD-Daten für sichtbaren Bereich
    generateLoDData(hexagons, visibleRange, lodLevel) {
        const cacheKey = `${lodLevel}-${visibleRange.qMin}-${visibleRange.qMax}-${visibleRange.rMin}-${visibleRange.rMax}`;
        
        if (this.lodCache.has(cacheKey)) {
            return this.lodCache.get(cacheKey);
        }
        
        const lodData = new Map();
        const processedClusters = new Set();
        
        // Iteriere durch sichtbaren Bereich
        for (let q = visibleRange.qMin; q <= visibleRange.qMax; q++) {
            for (let r = visibleRange.rMin; r <= visibleRange.rMax; r++) {
                const clusterCenter = this.getClusterCenter(q, r, lodLevel);
                const clusterKey = `${clusterCenter.q},${clusterCenter.r}`;
                
                if (processedClusters.has(clusterKey)) continue;
                processedClusters.add(clusterKey);
                
                if (lodLevel === 0) {
                    // Volldetail - normale Hexagone
                    const hexKey = `${q},${r}`;
                    lodData.set(hexKey, {
                        q: q,
                        r: r,
                        color: hexagons.get(hexKey) || '#1a1a1a',
                        size: 1.0
                    });
                } else {
                    // Cluster-Modus
                    const clusterHexagons = this.get7HexCluster(clusterCenter.q, clusterCenter.r);
                    const avgColor = this.calculateClusterColor(clusterHexagons, hexagons);
                    
                    lodData.set(clusterKey, {
                        q: clusterCenter.q,
                        r: clusterCenter.r,
                        color: avgColor,
                        size: 1.0 + (lodLevel * 0.5) // Größere Hexagone für höhere LoD
                    });
                }
            }
        }
        
        // Cache für Performance
        this.lodCache.set(cacheKey, lodData);
        
        // Cache-Größe begrenzen
        if (this.lodCache.size > 50) {
            const firstKey = this.lodCache.keys().next().value;
            this.lodCache.delete(firstKey);
        }
        
        return lodData;
    }
    
    // Cache leeren (bei Datenänderungen)
    clearCache() {
        this.lodCache.clear();
    }
}

// Color-Averaging-Klasse für verschiedene Mischverfahren
class HexagonColorAverager {
    constructor() {
        this.method = 'lab'; // 'rgb', 'hsv', 'lab'
    }
    
    // Hauptmethode zum Farben-Mitteln
    averageColors(colors) {
        if (colors.length === 0) return '#000000';
        if (colors.length === 1) return colors[0];
        
        switch (this.method) {
            case 'rgb': return this.averageRGB(colors);
            case 'hsv': return this.averageHSV(colors);
            case 'lab': return this.averageLAB(colors);
            default: return this.averageRGB(colors);
        }
    }
    
    // RGB-Mittelung (einfach aber nicht immer optimal)
    averageRGB(colors) {
        let totalR = 0, totalG = 0, totalB = 0;
        
        for (const color of colors) {
            const rgb = this.hexToRgb(color);
            totalR += rgb.r;
            totalG += rgb.g;
            totalB += rgb.b;
        }
        
        const avgR = Math.round(totalR / colors.length);
        const avgG = Math.round(totalG / colors.length);
        const avgB = Math.round(totalB / colors.length);
        
        return this.rgbToHex(avgR, avgG, avgB);
    }
    
    // HSV-Mittelung (besser für Farbharmonie)
    averageHSV(colors) {
        let totalH = 0, totalS = 0, totalV = 0;
        let hueVectors = { x: 0, y: 0 }; // Für Hue-Mittelung auf Kreis
        
        for (const color of colors) {
            const hsv = this.rgbToHsv(...Object.values(this.hexToRgb(color)));
            
            // Hue als Vektor behandeln (Kreisarithmetik)
            const hueRad = (hsv.h / 360) * 2 * Math.PI;
            hueVectors.x += Math.cos(hueRad);
            hueVectors.y += Math.sin(hueRad);
            
            totalS += hsv.s;
            totalV += hsv.v;
        }
        
        // Durchschnittlicher Hue-Vektor zurück zu Grad
        const avgHueRad = Math.atan2(hueVectors.y, hueVectors.x);
        const avgHue = ((avgHueRad * 180 / Math.PI) + 360) % 360;
        
        const avgS = totalS / colors.length;
        const avgV = totalV / colors.length;
        
        const rgb = this.hsvToRgb(avgHue, avgS, avgV);
        return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }
    
    // LAB-Mittelung (perceptually uniform, am besten für natürliche Mischung)
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
    
    rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const h = max === min ? 0 : max === r ? (60 * ((g - b) / (max - min)) + 360) % 360 :
                  max === g ? (60 * ((b - r) / (max - min)) + 120) % 360 :
                  (60 * ((r - g) / (max - min)) + 240) % 360;
        const s = max === 0 ? 0 : (max - min) / max;
        const v = max;
        return { h, s, v };
    }
    
    hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        let r, g, b;
        
        if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
        else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
        else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
        else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
        else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }
    
    // Vereinfachte LAB-Konvertierung (ohne vollständige CIE-Standards)
    rgbToLab(r, g, b) {
        // Vereinfachte RGB->LAB-Konvertierung
        // Für exakte Ergebnisse würde man RGB->XYZ->LAB machen
        r /= 255; g /= 255; b /= 255;
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        const a = (r - g) * 127;
        const b_lab = (g - b) * 127;
        return { l: l * 100, a, b: b_lab };
    }
    
    labToRgb(l, a, b) {
        // Vereinfachte LAB->RGB-Konvertierung
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
    
    // Methode zur Laufzeit ändern
    setMethod(method) {
        if (['rgb', 'hsv', 'lab'].includes(method)) {
            this.method = method;
        }
    }
}