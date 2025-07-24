// UI-Management für Farben, Muster und Editor
class HexagonUI {
    constructor() {
        this.editingColorIndex = -1;
    }
    
    // Erstelle Farbpalette und Muster-Buttons
    setupColorPalette(colors, patterns, currentFillType, callbacks) {
        const toolbar = document.getElementById('toolbar');
        toolbar.innerHTML = '';
        
        // Farb-Buttons erstellen
        colors.forEach((color, index) => {
            const btn = this.createColorButton(color, index, currentFillType, callbacks);
            toolbar.appendChild(btn);
        });
        
        // Muster-Buttons erstellen
        patterns.forEach((pattern, key) => {
            const btn = this.createPatternButton(pattern, key, callbacks);
            toolbar.appendChild(btn);
        });
        
        // Button zum Hinzufügen neuer Muster
        const addBtn = this.createAddPatternButton();
        toolbar.appendChild(addBtn);
    }
    
    createColorButton(color, index, currentFillType, callbacks) {
        const btn = document.createElement('div');
        btn.className = 'color-btn';
        btn.style.backgroundColor = color;
        
        if (index === 0 && currentFillType === 'color') {
            btn.classList.add('active');
        }
        
        // Linksklick: Farbe auswählen
        btn.addEventListener('click', () => {
            this.clearActiveButtons();
            btn.classList.add('active');
            callbacks.onColorSelect(color);
        });
        
        // Rechtsklick: Farbe bearbeiten
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.openColorEditor(index, color, callbacks);
        });
        
        return btn;
    }
    
    createPatternButton(pattern, key, callbacks) {
        const btn = document.createElement('div');
        btn.className = 'pattern-btn';
        btn.style.backgroundImage = `url(${pattern.dataURL})`;
        
        // Linksklick: Muster auswählen
        btn.addEventListener('click', () => {
            this.clearActiveButtons();
            btn.classList.add('active');
            callbacks.onPatternSelect(key);
        });
        
        // Rechtsklick: Muster löschen
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm('Muster löschen?')) {
                callbacks.onPatternDelete(key);
            }
        });
        
        return btn;
    }
    
    createAddPatternButton() {
        const addBtn = document.createElement('div');
        addBtn.className = 'pattern-btn add-pattern-btn';
        addBtn.innerHTML = '+';
        addBtn.addEventListener('click', () => {
            document.getElementById('patternInput').click();
        });
        return addBtn;
    }
    
    clearActiveButtons() {
        document.querySelectorAll('.color-btn, .pattern-btn').forEach(b => {
            b.classList.remove('active');
        });
    }
    
    // Farb-Editor öffnen
    openColorEditor(index, currentColor, callbacks) {
        this.editingColorIndex = index;
        const colorPicker = document.getElementById('colorPicker');
        const colorInput = document.getElementById('colorInput');
        const overlay = document.getElementById('overlay');
        const editor = document.getElementById('colorEditor');
        
        colorPicker.value = currentColor;
        colorInput.value = currentColor;
        
        // Event Listener für Live-Updates
        colorPicker.oninput = () => {
            colorInput.value = colorPicker.value;
        };
        colorInput.oninput = () => {
            if (/^#[0-9A-Fa-f]{6}$/.test(colorInput.value)) {
                colorPicker.value = colorInput.value;
            }
        };
        
        // Store callback for later use
        this.saveColorCallback = callbacks.onColorSave;
        
        overlay.style.display = 'block';
        editor.style.display = 'block';
    }
    
    // Farb-Editor schließen
    closeColorEditor() {
        const overlay = document.getElementById('overlay');
        const editor = document.getElementById('colorEditor');
        overlay.style.display = 'none';
        editor.style.display = 'none';
        this.editingColorIndex = -1;
    }
    
    // Farbe speichern
    saveColor() {
        if (this.editingColorIndex >= 0 && this.saveColorCallback) {
            const newColor = document.getElementById('colorPicker').value;
            this.saveColorCallback(this.editingColorIndex, newColor);
        }
        this.closeColorEditor();
    }
    
    // Muster zu Button hinzufügen und aktivieren
    activateNewPattern() {
        setTimeout(() => {
            const patternBtns = document.querySelectorAll('.pattern-btn:not(.add-pattern-btn)');
            const lastBtn = patternBtns[patternBtns.length - 1];
            if (lastBtn) {
                this.clearActiveButtons();
                lastBtn.classList.add('active');
            }
        }, 100);
    }
    
    // Farbe wieder als aktiv setzen nach Bearbeitung
    setColorActive(index, newColor) {
        const buttons = document.querySelectorAll('.color-btn');
        if (buttons[index]) {
            this.clearActiveButtons();
            buttons[index].classList.add('active');
            return true;
        }
        return false;
    }
}