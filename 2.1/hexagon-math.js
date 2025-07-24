// Hexagon-Mathematik und Koordinaten-Transformationen
class HexagonMath {
    constructor(hexSize) {
        this.hexSize = hexSize;
        this.hexWidth = hexSize * 2;
        this.hexHeight = Math.sqrt(3) * hexSize;
    }
    
    // Bildschirmkoordinaten zu Hexagon-Koordinaten
    pixelToHex(x, y, canvas, camera) {
        // Bildschirmkoordinaten zu Weltkoordinaten
        const worldX = (x - canvas.width / 2) / camera.zoom - camera.x;
        const worldY = (y - canvas.height / 2) / camera.zoom - camera.y;
        
        // Hexagon-Gitter-Koordinaten
        const q = (2/3 * worldX) / this.hexSize;
        const r = (-1/3 * worldX + Math.sqrt(3)/3 * worldY) / this.hexSize;
        
        return this.roundHex(q, r);
    }
    
    // Hexagon-Koordinaten zu Bildschirmkoordinaten
    hexToPixel(q, r) {
        const x = this.hexSize * (3/2 * q);
        const y = this.hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
        return { x, y };
    }
    
    // Runde Hexagon-Koordinaten auf ganze Zahlen
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
    
    // Berechne sichtbaren Hexagon-Bereich für Performance-Optimierung
    getVisibleHexRange(canvas, camera) {
        const screenLeft = -canvas.width / 2 / camera.zoom - camera.x;
        const screenRight = canvas.width / 2 / camera.zoom - camera.x;
        const screenTop = -canvas.height / 2 / camera.zoom - camera.y;
        const screenBottom = canvas.height / 2 / camera.zoom - camera.y;
        
        // Adaptiver Puffer basierend auf Zoom-Level
        const baseBuffer = Math.min(canvas.width, canvas.height) / camera.zoom * 0.3;
        const bufferX = Math.max(100, baseBuffer);
        const bufferY = Math.max(100, baseBuffer);
        
        const extendedLeft = screenLeft - bufferX;
        const extendedRight = screenRight + bufferX;
        const extendedTop = screenTop - bufferY;
        const extendedBottom = screenBottom + bufferY;
        
        const hexWidth = this.hexSize * 1.5;
        const hexHeight = this.hexSize * Math.sqrt(3);
        
        // Optimierte Berechnung
        const qMin = Math.floor(extendedLeft / hexWidth) - 3;
        const qMax = Math.ceil(extendedRight / hexWidth) + 3;
        const rMin = Math.floor(extendedTop / hexHeight) - 3;
        const rMax = Math.ceil(extendedBottom / hexHeight) + 3;
        
        return { qMin, qMax, rMin, rMax };
    }
}