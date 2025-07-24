// Haupt-Klasse die alles zusammenführt
class HexagonPainter {
    constructor() {
        this.canvas = document.getElementById('canvas');
        
        // Module initialisieren
        this.hexMath = new HexagonMath(30); // Hexagon-Größe: 30px
        this.renderer = new HexagonRenderer(this.canvas, this.hexMath);
        this.ui = new HexagonUI();
        
        this.renderer.setupCanvas();
        
        // Kamera-System
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.currentMousePos = { x: 0, y: 0 };
        
        // Daten-Speicher
        this.hexagons = new Map();
        this.patterns = new Map();
        
        // Aktueller Zustand
        this.currentFillType = 'color'; // 'color' oder 'pattern'
        this.currentPattern = null;
        
        // Initialisierung
        this.loadColors();
        this.setupUI();
        this.setupEventListeners();
        this.animate();
    }
    
    // Farben laden/initialisieren
    loadColors() {
        try {
            const saved = localStorage.getItem('hexagon-colors');
            this.colors = saved ? JSON.parse(saved) : [
                '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
                '#ff0000', '#ff6600', '#ffff00', '#66ff00', '#00ff00', '#00ff66',
                '#00ffff', '#0066ff', '#0000ff', '#6600ff', '#ff00ff', '#ff0066',
                '#8B4513', '#FF69B4', '#32CD32'
            ];
        } catch (e) {
            this.colors = [
                '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
                '#ff0000', '#ff6600', '#ffff00', '#66ff00', '#00ff00', '#00ff66',
                '#00ffff', '#0066ff', '#0000ff', '#6600ff', '#ff00ff', '#ff0066',
                '#8B4513', '#FF69B4', '#32CD32'
            ];
        }
        this.currentColor = this.colors[0];
    }
    
    // UI Setup mit Callbacks
    setupUI() {
        const callbacks = {
            onColorSelect: (color) => {
                this.currentColor = color;
                this.currentFillType = 'color';
                this.currentPattern = null;
            },
            onPatternSelect: (key) => {
                this.currentFillType = 'pattern';
                this.currentPattern = key;
            },
            onPatternDelete: (key) => {
                this.patterns.delete(key);
                this.ui.setupColorPalette(this.colors, this.patterns, this.currentFillType, callbacks);
            },
            onColorSave: (index, newColor) => {
                this.colors[index] = newColor;
                this.saveColors();
                
                // Aktualisiere UI und setze Farbe als aktiv
                this.ui.setupColorPalette(this.colors, this.patterns, this.currentFillType, callbacks);
                if (this.ui.setColorActive(index, newColor)) {
                    this.currentColor = newColor;
                    this.currentFillType = 'color';
                    this.currentPattern = null;
                }
            }
        };
        
        this.uiCallbacks = callbacks;
        this.ui.setupColorPalette(this.colors, this.patterns, this.currentFillType, callbacks);
    }
    
    // Event Listeners einrichten
    setupEventListeners() {
        // Fenster-Resize
        window.addEventListener('resize', () => {
            this.renderer.setupCanvas();
        });
        
        // Maus-Events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        
        // Tastatur-Events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }
    
    // Maus-Events
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        if (e.button === 0) { // Linke Maustaste - Malen
            this.paintHexagon(mouseX, mouseY);
        } else if (e.button === 2) { // Rechte Maustaste - Kamera bewegen
            this.isDragging = true;
            this.lastMousePos = { x: mouseX, y: mouseY };
        }
    }
    
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.currentMousePos.x = e.clientX - rect.left;
        this.currentMousePos.y = e.clientY - rect.top;
        
        if (!this.isDragging) return;
        
        const deltaX = this.currentMousePos.x - this.lastMousePos.x;
        const deltaY = this.currentMousePos.y - this.lastMousePos.y;
        
        this.camera.x += deltaX / this.camera.zoom;
        this.camera.y += deltaY / this.camera.zoom;
        
        this.lastMousePos = { x: this.currentMousePos.x, y: this.currentMousePos.y };
    }
    
    onMouseUp() {
        this.isDragging = false;
    }
    
    onContextMenu(e) {
        e.preventDefault();
        this.isDragging = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    
    onWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.camera.zoom = Math.max(0.1, Math.min(5, this.camera.zoom * zoomFactor));
    }
    
    onKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.paintHexagon(this.currentMousePos.x, this.currentMousePos.y);
        }
    }
    
    // Hexagon malen
    paintHexagon(mouseX, mouseY) {
        const hexCoord = this.hexMath.pixelToHex(mouseX, mouseY, this.canvas, this.camera);
        const hexKey = `${hexCoord.q},${hexCoord.r}`;
        
        if (this.currentFillType === 'color') {
            this.hexagons.set(hexKey, this.currentColor);
        } else if (this.currentFillType === 'pattern' && this.currentPattern) {
            this.hexagons.set(hexKey, `pattern:${this.currentPattern}`);
        }
    }
    
    // Animation Loop
    animate() {
        if (this.renderer.render(this.hexagons, this.camera, this.patterns)) {
            // Erfolgreich gerendert
        }
        requestAnimationFrame(() => this.animate());
    }
    
    // Farben speichern
    saveColors() {
        try {
            localStorage.setItem('hexagon-colors', JSON.stringify(this.colors));
        } catch (e) {
            console.warn('Konnte Farben nicht speichern:', e);
        }
    }
    
    // UI-Methoden (für onclick-Handler)
    closeColorEditor() {
        this.ui.closeColorEditor();
    }
    
    saveColor() {
        this.ui.saveColor();
    }
    
    // Muster hinzufügen
    addPattern(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('Bitte wählen Sie eine Bilddatei aus.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const patternKey = `pattern_${Date.now()}`;
                
                // Canvas für Muster erstellen
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Bild skalieren
                const maxSize = 100;
                const scale = Math.min(maxSize / img.width, maxSize / img.height);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                this.patterns.set(patternKey, {
                    image: img,
                    width: canvas.width,
                    height: canvas.height,
                    dataURL: canvas.toDataURL()
                });
                
                // UI aktualisieren
                this.ui.setupColorPalette(this.colors, this.patterns, this.currentFillType, this.uiCallbacks);
                
                // Neues Muster aktivieren
                this.currentFillType = 'pattern';
                this.currentPattern = patternKey;
                this.ui.activateNewPattern();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        event.target.value = '';
    }
    
    // Projekt speichern
    saveProject() {
        const patternsForSave = {};
        this.patterns.forEach((pattern, key) => {
            patternsForSave[key] = {
                dataURL: pattern.dataURL,
                width: pattern.width,
                height: pattern.height
            };
        });
        
        const projectData = {
            hexagons: Object.fromEntries(this.hexagons),
            camera: this.camera,
            colors: this.colors,
            patterns: patternsForSave,
            timestamp: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(projectData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `hexagon-projekt-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
        link.click();
    }
    
    // Projekt laden
    loadProject(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                
                // Hexagon-Daten laden
                this.hexagons.clear();
                if (projectData.hexagons) {
                    for (const [key, fill] of Object.entries(projectData.hexagons)) {
                        this.hexagons.set(key, fill);
                    }
                }
                
                // Kamera-Position laden
                if (projectData.camera) {
                    this.camera = { ...this.camera, ...projectData.camera };
                }
                
                // Farben laden
                if (projectData.colors) {
                    this.colors = projectData.colors;
                    this.saveColors();
                }
                
                // Muster laden
                if (projectData.patterns) {
                    this.patterns.clear();
                    for (const [key, patternData] of Object.entries(projectData.patterns)) {
                        const img = new Image();
                        img.onload = () => {
                            this.patterns.set(key, {
                                image: img,
                                width: patternData.width,
                                height: patternData.height,
                                dataURL: patternData.dataURL
                            });
                            this.ui.setupColorPalette(this.colors, this.patterns, this.currentFillType, this.uiCallbacks);
                        };
                        img.src = patternData.dataURL;
                    }
                }
                
                this.ui.setupColorPalette(this.colors, this.patterns, this.currentFillType, this.uiCallbacks);
                alert('Projekt erfolgreich geladen!');
            } catch (error) {
                alert('Fehler beim Laden der Datei: ' + error.message);
            }
        };
        reader.readAsText(file);
        
        event.target.value = '';
    }
}