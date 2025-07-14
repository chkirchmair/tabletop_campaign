
/**
 * Effects-Modul für das Tabletop-Kampagnentool
 * Animationen, Toast-Nachrichten und visuelle Effekte
 */

class EffectsManager {
    constructor() {
        this.toastContainer = null;
        this.toastCount = 0;
        this.maxToasts = 5;
        this.defaultToastDuration = 4000;
        this.animationQueue = [];
        this.isAnimating = false;
    }

    /**
     * Initialisiert das Effects-System
     */
    initialize() {
        this.toastContainer = document.getElementById('toastContainer');
        
        if (!this.toastContainer) {
            console.warn('Toast-Container nicht gefunden');
        }

        this.setupGlobalEffects();
        this.createToastStyles();
        
        // Globale Toast-Funktion verfügbar machen
        window.showToast = (message, type = 'info', duration) => {
            this.showToast(message, type, duration);
        };

        console.log('Effects-System initialisiert');
    }

    /**
     * Richtet globale Effekte ein
     */
    setupGlobalEffects() {
        // Smooth-Scroll für interne Links
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="#"]')) {
                e.preventDefault();
                const target = document.querySelector(e.target.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });

        // Loading-Indikator für längere Operationen
        this.setupLoadingIndicator();

        // Intersection Observer für Scroll-Animationen
        this.setupScrollAnimations();
    }

    /**
     * Erstellt dynamische Toast-Styles
     */
    createToastStyles() {
        if (document.getElementById('dynamic-toast-styles')) return;

        const style = document.createElement('style');
        style.id = 'dynamic-toast-styles';
        style.textContent = `
            .toast-enter {
                animation: toastEnter 0.3s ease-out forwards;
            }
            
            .toast-exit {
                animation: toastExit 0.3s ease-in forwards;
            }
            
            @keyframes toastEnter {
                from {
                    transform: translateX(100%) scale(0.8);
                    opacity: 0;
                }
                to {
                    transform: translateX(0) scale(1);
                    opacity: 1;
                }
            }
            
            @keyframes toastExit {
                from {
                    transform: translateX(0) scale(1);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%) scale(0.8);
                    opacity: 0;
                }
            }

            .pulse {
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }

            .shake {
                animation: shake 0.5s ease-in-out;
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }

            .bounce {
                animation: bounce 0.6s ease-out;
            }

            @keyframes bounce {
                0% { transform: translateY(0); }
                25% { transform: translateY(-10px); }
                50% { transform: translateY(0); }
                75% { transform: translateY(-5px); }
                100% { transform: translateY(0); }
            }

            .fade-in {
                animation: fadeIn 0.5s ease-out;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .slide-up {
                animation: slideUp 0.4s ease-out;
            }

            @keyframes slideUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Zeigt eine Toast-Nachricht an
     */
    showToast(message, type = 'info', duration = null) {
        if (!this.toastContainer) {
            console.warn('Toast-Container nicht verfügbar');
            return;
        }

        // Maximale Anzahl Toasts prüfen
        if (this.toastCount >= this.maxToasts) {
            this.removeOldestToast();
        }

        const toast = this.createToastElement(message, type);
        this.toastContainer.appendChild(toast);
        this.toastCount++;

        // Enter-Animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-enter');
        });

        // Auto-Remove nach Dauer
        const toastDuration = duration || this.getToastDuration(type);
        setTimeout(() => {
            this.removeToast(toast);
        }, toastDuration);

        // Klick zum Entfernen
        toast.addEventListener('click', () => {
            this.removeToast(toast);
        });

        return toast;
    }

    /**
     * Erstellt ein Toast-Element
     */
    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Icon basierend auf Typ
        const icon = this.getToastIcon(type);
        
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icon}</span>
                <span class="toast-message">${this.escapeHtml(message)}</span>
                <button class="toast-close" aria-label="Schließen">×</button>
            </div>
        `;

        // Close-Button Event
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeToast(toast);
        });

        return toast;
    }

    /**
     * Holt Icon für Toast-Typ
     */
    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌', 
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Holt Dauer für Toast-Typ
     */
    getToastDuration(type) {
        const durations = {
            success: 3000,
            error: 6000,
            warning: 5000,
            info: 4000
        };
        return durations[type] || this.defaultToastDuration;
    }

    /**
     * Entfernt einen Toast
     */
    removeToast(toast) {
        if (!toast.parentNode) return;

        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
                this.toastCount--;
            }
        }, 300);
    }

    /**
     * Entfernt den ältesten Toast
     */
    removeOldestToast() {
        const oldestToast = this.toastContainer.querySelector('.toast');
        if (oldestToast) {
            this.removeToast(oldestToast);
        }
    }

    /**
     * Escapes HTML für sichere Anzeige
     */
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Richtet Loading-Indikator ein
     */
    setupLoadingIndicator() {
        // Globaler Loading-State
        window.showLoading = (message = 'Lädt...') => {
            return this.showLoading(message);
        };

        window.hideLoading = (loadingToast) => {
            this.hideLoading(loadingToast);
        };
    }

    /**
     * Zeigt Loading-Indikator
     */
    showLoading(message = 'Lädt...') {
        const loadingToast = this.showToast(`⏳ ${message}`, 'info', 30000); // 30 Sekunden max
        loadingToast.classList.add('loading-toast');
        return loadingToast;
    }

    /**
     * Versteckt Loading-Indikator
     */
    hideLoading(loadingToast) {
        if (loadingToast && loadingToast.parentNode) {
            this.removeToast(loadingToast);
        }
    }

    /**
     * Richtet Scroll-Animationen ein
     */
    setupScrollAnimations() {
        if (!('IntersectionObserver' in window)) return;

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, observerOptions);

        // Beobachte relevante Elemente
        const animatedElements = document.querySelectorAll(
            '.faction-card, .poi-item, .history-item, .map-legend'
        );
        
        animatedElements.forEach(el => observer.observe(el));
    }

    /**
     * Fügt Animation zu Element hinzu
     */
    animateElement(element, animationClass, duration = null) {
        if (!element) return;

        element.classList.add(animationClass);

        const cleanup = () => {
            element.classList.remove(animationClass);
        };

        if (duration) {
            setTimeout(cleanup, duration);
        } else {
            // Event-Listener für Animationsende
            const handleAnimationEnd = () => {
                cleanup();
                element.removeEventListener('animationend', handleAnimationEnd);
            };
            element.addEventListener('animationend', handleAnimationEnd);
        }
    }

    /**
     * Animiert Punkteänderung
     */
    animatePointsChange(element, oldValue, newValue) {
        if (!element || oldValue === newValue) return;

        const isIncrease = newValue > oldValue;
        const difference = newValue - oldValue;
        
        // Punkteänderungs-Indikator erstellen
        const indicator = document.createElement('div');
        indicator.className = `points-indicator ${isIncrease ? 'positive' : 'negative'}`;
        indicator.textContent = `${isIncrease ? '+' : ''}${difference}`;
        
        // Position relativ zum Element
        const rect = element.getBoundingClientRect();
        indicator.style.position = 'fixed';
        indicator.style.left = `${rect.right + 10}px`;
        indicator.style.top = `${rect.top}px`;
        indicator.style.color = isIncrease ? 'var(--success)' : 'var(--danger)';
        indicator.style.fontWeight = 'bold';
        indicator.style.fontSize = '1.2rem';
        indicator.style.pointerEvents = 'none';
        indicator.style.zIndex = '1000';
        
        document.body.appendChild(indicator);
        
        // Animation
        indicator.style.transform = 'translateY(0)';
        indicator.style.opacity = '1';
        
        setTimeout(() => {
            indicator.style.transform = 'translateY(-30px)';
            indicator.style.opacity = '0';
            indicator.style.transition = 'all 0.8s ease-out';
        }, 100);
        
        setTimeout(() => {
            document.body.removeChild(indicator);
        }, 1000);
        
        // Element selbst animieren
        this.animateElement(element, 'bounce');
    }

    /**
     * Zeigt Konfetti-Effekt
     */
    showConfetti(duration = 2000) {
        // Einfacher Konfetti-Effekt mit CSS
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        confettiContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10000;
        `;
        
        // Konfetti-Partikel erstellen
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'confetti-particle';
            particle.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                background: ${this.getRandomColor()};
                top: -10px;
                left: ${Math.random() * 100}%;
                animation: confettiFall ${Math.random() * 3 + 2}s linear forwards;
            `;
            confettiContainer.appendChild(particle);
        }
        
        // CSS-Animation für Konfetti hinzufügen
        if (!document.getElementById('confetti-styles')) {
            const style = document.createElement('style');
            style.id = 'confetti-styles';
            style.textContent = `
                @keyframes confettiFall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(confettiContainer);
        
        setTimeout(() => {
            document.body.removeChild(confettiContainer);
        }, duration);
    }

    /**
     * Holt zufällige Farbe
     */
    getRandomColor() {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', 
            '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Animiert Seitenwechsel
     */
    animatePageTransition(callback) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--primary-bg);
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(overlay);
        
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
        
        setTimeout(() => {
            if (callback) callback();
            
            overlay.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        }, 300);
    }

    /**
     * Tippt Text animiert
     */
    typeWriter(element, text, speed = 50) {
        if (!element) return;
        
        element.textContent = '';
        let i = 0;
        
        const type = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        };
        
        type();
    }

    /**
     * Erstellt Ripple-Effekt für Buttons
     */
    createRippleEffect(event) {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        if (!document.getElementById('ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => {
            button.removeChild(ripple);
        }, 600);
    }

    /**
     * Richtet Ripple-Effekte für alle relevanten Buttons ein
     */
    setupRippleEffects() {
        const buttons = document.querySelectorAll(
            '.submit-button, .btn-secondary, .btn-danger, .map-control, .tab-button'
        );
        
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.createRippleEffect(e);
            });
        });
    }

    /**
     * Cleanup-Funktion
     */
    cleanup() {
        // Alle Toasts entfernen
        if (this.toastContainer) {
            this.toastContainer.innerHTML = '';
            this.toastCount = 0;
        }
        
        // Alle Animationen stoppen
        this.animationQueue = [];
        this.isAnimating = false;
    }
}

// Globale Effects-Instanz und Initialisierungsfunktion
let effectsManager;

function initializeEffects() {
    effectsManager = new EffectsManager();
    effectsManager.initialize();
    
    // Ripple-Effekte nach kurzer Verzögerung einrichten
    setTimeout(() => {
        effectsManager.setupRippleEffects();
    }, 1000);
}
=======
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF'
diff --git a/effects.js b/effects.js
--- a/effects.js
+++ b/effects.js
@@ -0,0 +1,624 @@
+/**
+ * Effects-Modul für das Tabletop-Kampagnentool
+ * Animationen, Toast-Nachrichten und visuelle Effekte
+ */
+
+class EffectsManager {
+    constructor() {
+        this.toastContainer = null;
+        this.toastCount = 0;
+        this.maxToasts = 5;
+        this.defaultToastDuration = 4000;
+        this.animationQueue = [];
+        this.isAnimating = false;
+    }
+
+    /**
+     * Initialisiert das Effects-System
+     */
+    initialize() {
+        this.toastContainer = document.getElementById('toastContainer');
+        
+        if (!this.toastContainer) {
+            console.warn('Toast-Container nicht gefunden');
+        }
+
+        this.setupGlobalEffects();
+        this.createToastStyles();
+        
+        // Globale Toast-Funktion verfügbar machen
+        window.showToast = (message, type = 'info', duration) => {
+            this.showToast(message, type, duration);
+        };
+
+        console.log('Effects-System initialisiert');
+    }
+
+    /**
+     * Richtet globale Effekte ein
+     */
+    setupGlobalEffects() {
+        // Smooth-Scroll für interne Links
+        document.addEventListener('click', (e) => {
+            if (e.target.matches('a[href^="#"]')) {
+                e.preventDefault();
+                const target = document.querySelector(e.target.getAttribute('href'));
+                if (target) {
+                    target.scrollIntoView({ behavior: 'smooth' });
+                }
+            }
+        });
+
+        // Loading-Indikator für längere Operationen
+        this.setupLoadingIndicator();
+
+        // Intersection Observer für Scroll-Animationen
+        this.setupScrollAnimations();
+    }
+
+    /**
+     * Erstellt dynamische Toast-Styles
+     */
+    createToastStyles() {
+        if (document.getElementById('dynamic-toast-styles')) return;
+
+        const style = document.createElement('style');
+        style.id = 'dynamic-toast-styles';
+        style.textContent = `
+            .toast-enter {
+                animation: toastEnter 0.3s ease-out forwards;
+            }
+            
+            .toast-exit {
+                animation: toastExit 0.3s ease-in forwards;
+            }
+            
+            @keyframes toastEnter {
+                from {
+                    transform: translateX(100%) scale(0.8);
+                    opacity: 0;
+                }
+                to {
+                    transform: translateX(0) scale(1);
+                    opacity: 1;
+                }
+            }
+            
+            @keyframes toastExit {
+                from {
+                    transform: translateX(0) scale(1);
+                    opacity: 1;
+                }
+                to {
+                    transform: translateX(100%) scale(0.8);
+                    opacity: 0;
+                }
+            }
+
+            .pulse {
+                animation: pulse 2s infinite;
+            }
+
+            @keyframes pulse {
+                0% { transform: scale(1); }
+                50% { transform: scale(1.05); }
+                100% { transform: scale(1); }
+            }
+
+            .shake {
+                animation: shake 0.5s ease-in-out;
+            }
+
+            @keyframes shake {
+                0%, 100% { transform: translateX(0); }
+                25% { transform: translateX(-5px); }
+                75% { transform: translateX(5px); }
+            }
+
+            .bounce {
+                animation: bounce 0.6s ease-out;
+            }
+
+            @keyframes bounce {
+                0% { transform: translateY(0); }
+                25% { transform: translateY(-10px); }
+                50% { transform: translateY(0); }
+                75% { transform: translateY(-5px); }
+                100% { transform: translateY(0); }
+            }
+
+            .fade-in {
+                animation: fadeIn 0.5s ease-out;
+            }
+
+            @keyframes fadeIn {
+                from { opacity: 0; }
+                to { opacity: 1; }
+            }
+
+            .slide-up {
+                animation: slideUp 0.4s ease-out;
+            }
+
+            @keyframes slideUp {
+                from {
+                    transform: translateY(20px);
+                    opacity: 0;
+                }
+                to {
+                    transform: translateY(0);
+                    opacity: 1;
+                }
+            }
+        `;
+        
+        document.head.appendChild(style);
+    }
+
+    /**
+     * Zeigt eine Toast-Nachricht an
+     */
+    showToast(message, type = 'info', duration = null) {
+        if (!this.toastContainer) {
+            console.warn('Toast-Container nicht verfügbar');
+            return;
+        }
+
+        // Maximale Anzahl Toasts prüfen
+        if (this.toastCount >= this.maxToasts) {
+            this.removeOldestToast();
+        }
+
+        const toast = this.createToastElement(message, type);
+        this.toastContainer.appendChild(toast);
+        this.toastCount++;
+
+        // Enter-Animation
+        requestAnimationFrame(() => {
+            toast.classList.add('toast-enter');
+        });
+
+        // Auto-Remove nach Dauer
+        const toastDuration = duration || this.getToastDuration(type);
+        setTimeout(() => {
+            this.removeToast(toast);
+        }, toastDuration);
+
+        // Klick zum Entfernen
+        toast.addEventListener('click', () => {
+            this.removeToast(toast);
+        });
+
+        return toast;
+    }
+
+    /**
+     * Erstellt ein Toast-Element
+     */
+    createToastElement(message, type) {
+        const toast = document.createElement('div');
+        toast.className = `toast ${type}`;
+        
+        // Icon basierend auf Typ
+        const icon = this.getToastIcon(type);
+        
+        toast.innerHTML = `
+            <div class="toast-content">
+                <span class="toast-icon">${icon}</span>
+                <span class="toast-message">${this.escapeHtml(message)}</span>
+                <button class="toast-close" aria-label="Schließen">×</button>
+            </div>
+        `;
+
+        // Close-Button Event
+        const closeBtn = toast.querySelector('.toast-close');
+        closeBtn.addEventListener('click', (e) => {
+            e.stopPropagation();
+            this.removeToast(toast);
+        });
+
+        return toast;
+    }
+
+    /**
+     * Holt Icon für Toast-Typ
+     */
+    getToastIcon(type) {
+        const icons = {
+            success: '✅',
+            error: '❌', 
+            warning: '⚠️',
+            info: 'ℹ️'
+        };
+        return icons[type] || icons.info;
+    }
+
+    /**
+     * Holt Dauer für Toast-Typ
+     */
+    getToastDuration(type) {
+        const durations = {
+            success: 3000,
+            error: 6000,
+            warning: 5000,
+            info: 4000
+        };
+        return durations[type] || this.defaultToastDuration;
+    }
+
+    /**
+     * Entfernt einen Toast
+     */
+    removeToast(toast) {
+        if (!toast.parentNode) return;
+
+        toast.classList.remove('toast-enter');
+        toast.classList.add('toast-exit');
+
+        setTimeout(() => {
+            if (toast.parentNode) {
+                toast.parentNode.removeChild(toast);
+                this.toastCount--;
+            }
+        }, 300);
+    }
+
+    /**
+     * Entfernt den ältesten Toast
+     */
+    removeOldestToast() {
+        const oldestToast = this.toastContainer.querySelector('.toast');
+        if (oldestToast) {
+            this.removeToast(oldestToast);
+        }
+    }
+
+    /**
+     * Escapes HTML für sichere Anzeige
+     */
+    escapeHtml(unsafe) {
+        return unsafe
+            .replace(/&/g, "&amp;")
+            .replace(/</g, "&lt;")
+            .replace(/>/g, "&gt;")
+            .replace(/"/g, "&quot;")
+            .replace(/'/g, "&#039;");
+    }
+
+    /**
+     * Richtet Loading-Indikator ein
+     */
+    setupLoadingIndicator() {
+        // Globaler Loading-State
+        window.showLoading = (message = 'Lädt...') => {
+            return this.showLoading(message);
+        };
+
+        window.hideLoading = (loadingToast) => {
+            this.hideLoading(loadingToast);
+        };
+    }
+
+    /**
+     * Zeigt Loading-Indikator
+     */
+    showLoading(message = 'Lädt...') {
+        const loadingToast = this.showToast(`⏳ ${message}`, 'info', 30000); // 30 Sekunden max
+        loadingToast.classList.add('loading-toast');
+        return loadingToast;
+    }
+
+    /**
+     * Versteckt Loading-Indikator
+     */
+    hideLoading(loadingToast) {
+        if (loadingToast && loadingToast.parentNode) {
+            this.removeToast(loadingToast);
+        }
+    }
+
+    /**
+     * Richtet Scroll-Animationen ein
+     */
+    setupScrollAnimations() {
+        if (!('IntersectionObserver' in window)) return;
+
+        const observerOptions = {
+            threshold: 0.1,
+            rootMargin: '0px 0px -50px 0px'
+        };
+
+        const observer = new IntersectionObserver((entries) => {
+            entries.forEach(entry => {
+                if (entry.isIntersecting) {
+                    entry.target.classList.add('fade-in');
+                }
+            });
+        }, observerOptions);
+
+        // Beobachte relevante Elemente
+        const animatedElements = document.querySelectorAll(
+            '.faction-card, .poi-item, .history-item, .map-legend'
+        );
+        
+        animatedElements.forEach(el => observer.observe(el));
+    }
+
+    /**
+     * Fügt Animation zu Element hinzu
+     */
+    animateElement(element, animationClass, duration = null) {
+        if (!element) return;
+
+        element.classList.add(animationClass);
+
+        const cleanup = () => {
+            element.classList.remove(animationClass);
+        };
+
+        if (duration) {
+            setTimeout(cleanup, duration);
+        } else {
+            // Event-Listener für Animationsende
+            const handleAnimationEnd = () => {
+                cleanup();
+                element.removeEventListener('animationend', handleAnimationEnd);
+            };
+            element.addEventListener('animationend', handleAnimationEnd);
+        }
+    }
+
+    /**
+     * Animiert Punkteänderung
+     */
+    animatePointsChange(element, oldValue, newValue) {
+        if (!element || oldValue === newValue) return;
+
+        const isIncrease = newValue > oldValue;
+        const difference = newValue - oldValue;
+        
+        // Punkteänderungs-Indikator erstellen
+        const indicator = document.createElement('div');
+        indicator.className = `points-indicator ${isIncrease ? 'positive' : 'negative'}`;
+        indicator.textContent = `${isIncrease ? '+' : ''}${difference}`;
+        
+        // Position relativ zum Element
+        const rect = element.getBoundingClientRect();
+        indicator.style.position = 'fixed';
+        indicator.style.left = `${rect.right + 10}px`;
+        indicator.style.top = `${rect.top}px`;
+        indicator.style.color = isIncrease ? 'var(--success)' : 'var(--danger)';
+        indicator.style.fontWeight = 'bold';
+        indicator.style.fontSize = '1.2rem';
+        indicator.style.pointerEvents = 'none';
+        indicator.style.zIndex = '1000';
+        
+        document.body.appendChild(indicator);
+        
+        // Animation
+        indicator.style.transform = 'translateY(0)';
+        indicator.style.opacity = '1';
+        
+        setTimeout(() => {
+            indicator.style.transform = 'translateY(-30px)';
+            indicator.style.opacity = '0';
+            indicator.style.transition = 'all 0.8s ease-out';
+        }, 100);
+        
+        setTimeout(() => {
+            document.body.removeChild(indicator);
+        }, 1000);
+        
+        // Element selbst animieren
+        this.animateElement(element, 'bounce');
+    }
+
+    /**
+     * Zeigt Konfetti-Effekt
+     */
+    showConfetti(duration = 2000) {
+        // Einfacher Konfetti-Effekt mit CSS
+        const confettiContainer = document.createElement('div');
+        confettiContainer.className = 'confetti-container';
+        confettiContainer.style.cssText = `
+            position: fixed;
+            top: 0;
+            left: 0;
+            width: 100%;
+            height: 100%;
+            pointer-events: none;
+            z-index: 10000;
+        `;
+        
+        // Konfetti-Partikel erstellen
+        for (let i = 0; i < 50; i++) {
+            const particle = document.createElement('div');
+            particle.className = 'confetti-particle';
+            particle.style.cssText = `
+                position: absolute;
+                width: 10px;
+                height: 10px;
+                background: ${this.getRandomColor()};
+                top: -10px;
+                left: ${Math.random() * 100}%;
+                animation: confettiFall ${Math.random() * 3 + 2}s linear forwards;
+            `;
+            confettiContainer.appendChild(particle);
+        }
+        
+        // CSS-Animation für Konfetti hinzufügen
+        if (!document.getElementById('confetti-styles')) {
+            const style = document.createElement('style');
+            style.id = 'confetti-styles';
+            style.textContent = `
+                @keyframes confettiFall {
+                    to {
+                        transform: translateY(100vh) rotate(360deg);
+                        opacity: 0;
+                    }
+                }
+            `;
+            document.head.appendChild(style);
+        }
+        
+        document.body.appendChild(confettiContainer);
+        
+        setTimeout(() => {
+            document.body.removeChild(confettiContainer);
+        }, duration);
+    }
+
+    /**
+     * Holt zufällige Farbe
+     */
+    getRandomColor() {
+        const colors = [
+            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', 
+            '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe'
+        ];
+        return colors[Math.floor(Math.random() * colors.length)];
+    }
+
+    /**
+     * Animiert Seitenwechsel
+     */
+    animatePageTransition(callback) {
+        const overlay = document.createElement('div');
+        overlay.style.cssText = `
+            position: fixed;
+            top: 0;
+            left: 0;
+            width: 100%;
+            height: 100%;
+            background: var(--primary-bg);
+            z-index: 9999;
+            opacity: 0;
+            transition: opacity 0.3s ease;
+        `;
+        
+        document.body.appendChild(overlay);
+        
+        requestAnimationFrame(() => {
+            overlay.style.opacity = '1';
+        });
+        
+        setTimeout(() => {
+            if (callback) callback();
+            
+            overlay.style.opacity = '0';
+            setTimeout(() => {
+                document.body.removeChild(overlay);
+            }, 300);
+        }, 300);
+    }
+
+    /**
+     * Tippt Text animiert
+     */
+    typeWriter(element, text, speed = 50) {
+        if (!element) return;
+        
+        element.textContent = '';
+        let i = 0;
+        
+        const type = () => {
+            if (i < text.length) {
+                element.textContent += text.charAt(i);
+                i++;
+                setTimeout(type, speed);
+            }
+        };
+        
+        type();
+    }
+
+    /**
+     * Erstellt Ripple-Effekt für Buttons
+     */
+    createRippleEffect(event) {
+        const button = event.currentTarget;
+        const rect = button.getBoundingClientRect();
+        const size = Math.max(rect.width, rect.height);
+        const x = event.clientX - rect.left - size / 2;
+        const y = event.clientY - rect.top - size / 2;
+        
+        const ripple = document.createElement('div');
+        ripple.style.cssText = `
+            position: absolute;
+            width: ${size}px;
+            height: ${size}px;
+            left: ${x}px;
+            top: ${y}px;
+            background: rgba(255, 255, 255, 0.3);
+            border-radius: 50%;
+            transform: scale(0);
+            animation: ripple 0.6s linear;
+            pointer-events: none;
+        `;
+        
+        if (!document.getElementById('ripple-styles')) {
+            const style = document.createElement('style');
+            style.id = 'ripple-styles';
+            style.textContent = `
+                @keyframes ripple {
+                    to {
+                        transform: scale(4);
+                        opacity: 0;
+                    }
+                }
+            `;
+            document.head.appendChild(style);
+        }
+        
+        button.style.position = 'relative';
+        button.style.overflow = 'hidden';
+        button.appendChild(ripple);
+        
+        setTimeout(() => {
+            button.removeChild(ripple);
+        }, 600);
+    }
+
+    /**
+     * Richtet Ripple-Effekte für alle relevanten Buttons ein
+     */
+    setupRippleEffects() {
+        const buttons = document.querySelectorAll(
+            '.submit-button, .btn-secondary, .btn-danger, .map-control, .tab-button'
+        );
+        
+        buttons.forEach(button => {
+            button.addEventListener('click', (e) => {
+                this.createRippleEffect(e);
+            });
+        });
+    }
+
+    /**
+     * Cleanup-Funktion
+     */
+    cleanup() {
+        // Alle Toasts entfernen
+        if (this.toastContainer) {
+            this.toastContainer.innerHTML = '';
+            this.toastCount = 0;
+        }
+        
+        // Alle Animationen stoppen
+        this.animationQueue = [];
+        this.isAnimating = false;
+    }
+}
+
+// Globale Effects-Instanz und Initialisierungsfunktion
+let effectsManager;
+
+function initializeEffects() {
+    effectsManager = new EffectsManager();
+    effectsManager.initialize();
+    
+    // Ripple-Effekte nach kurzer Verzögerung einrichten
+    setTimeout(() => {
+        effectsManager.setupRippleEffects();
+    }, 1000);
+}
EOF
)

