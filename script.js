// ============================================================
//  EXPLORADOR DE SUMAS DE RIEMANN — SCRIPT PRINCIPAL
//  Incluye: Pestañas, Simulador, Desafío (5 Retos), Quiz
// ============================================================

// --- AUDIO: Web Audio API (efectos sintetizados) ---
const AudioFX = (() => {
    let ctx = null;
    function getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return ctx;
    }

    function playTone(freq, duration, type = 'sine', volume = 0.15) {
        try {
            const c = getCtx();
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, c.currentTime);
            gain.gain.setValueAtTime(volume, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(c.currentTime);
            osc.stop(c.currentTime + duration);
        } catch (e) { /* silencio si el navegador bloquea audio */ }
    }

    return {
        correct() {
            playTone(523.25, 0.12, 'sine', 0.12);
            setTimeout(() => playTone(659.25, 0.12, 'sine', 0.12), 100);
            setTimeout(() => playTone(783.99, 0.2, 'sine', 0.12), 200);
        },
        incorrect() {
            playTone(330, 0.15, 'square', 0.08);
            setTimeout(() => playTone(262, 0.25, 'square', 0.08), 120);
        },
        victory() {
            const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.50];
            notes.forEach((n, i) => {
                setTimeout(() => playTone(n, 0.18, 'sine', 0.1), i * 100);
            });
        },
        click() {
            playTone(1200, 0.04, 'sine', 0.06);
        },
        star() {
            playTone(880, 0.1, 'triangle', 0.1);
            setTimeout(() => playTone(1108.73, 0.15, 'triangle', 0.1), 80);
        }
    };
})();


// ============================================================
// 1. LÓGICA DE LAS PESTAÑAS
// ============================================================
function abrirPestana(evt, nombrePestana) {
    try {
        AudioFX.click();

        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.remove('active');
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const target = document.getElementById(nombrePestana);
        if (target) target.classList.add('active');

        if (evt && evt.currentTarget) {
            evt.currentTarget.classList.add('active');
        }

        // Refrescar gráficos de Plotly
        if (typeof actualizarGrafica === 'function') {
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
                actualizarGrafica();
            }, 80);
        }

        // Si abrimos el desafío, inicializar si no se ha hecho
        if (nombrePestana === 'desafio') {
            setTimeout(() => {
                if (!window._desafioInit && typeof inicializarDesafio === 'function') {
                    inicializarDesafio();
                    window._desafioInit = true;
                }
                window.dispatchEvent(new Event('resize'));
            }, 100);
        }
    } catch (e) {
        console.error("Error en pestañas:", e);
    }
}


// ============================================================
// 2. SIMULADOR INTERACTIVO
// ============================================================
let actualizarGrafica;

document.addEventListener('DOMContentLoaded', () => {

    // --- Elementos del DOM ---
    const selFuncion = document.getElementById('funcion');
    const inA = document.getElementById('valA');
    const inB = document.getElementById('valB');
    const inN = document.getElementById('rectangulos');
    const selMetodo = document.getElementById('metodo');
    const txtNumRect = document.getElementById('numRectVisual');
    const txtResultado = document.getElementById('resultado');
    const panelDidactico = document.getElementById('mensajeDidactico');

    // --- Diccionario de funciones ---
    const funcionesMath = {
        'lineal':         (x) => x + 2,
        'cuadratica':     (x) => x * x,
        'cubica':         (x) => x * x * x,
        'raiz':           (x) => Math.sqrt(Math.abs(x)),
        'exponencial':    (x) => Math.exp(x),
        'trigonometrica': (x) => Math.sin(x) + 2,
        'gaussiana':      (x) => Math.exp(-x * x),
        'absoluto':       (x) => Math.abs(x)
    };

    window.funcionesMathGlobal = funcionesMath;

    // --- Nombres legibles ---
    const nombresFunciones = {
        'lineal':         'f(x) = x + 2',
        'cuadratica':     'f(x) = x²',
        'cubica':         'f(x) = x³',
        'raiz':           'f(x) = √x',
        'exponencial':    'f(x) = eˣ',
        'trigonometrica': 'f(x) = sen(x) + 2',
        'gaussiana':      'f(x) = e^(−x²)',
        'absoluto':       'f(x) = |x|'
    };
    window.nombresFuncionesGlobal = nombresFunciones;

    // --- Mensajes didácticos por función ---
    const mensajesLeccion = {
        'lineal':         '💡 <strong>Lección:</strong> La función lineal es perfecta para comprobar tus cálculos. El área bajo esta recta forma figuras geométricas simples (trapecios y triángulos).',
        'cuadratica':     '💡 <strong>Lección:</strong> Con la curva parabólica notarás claramente cómo los rectángulos dejan "huecos" o se "pasan" del área real.',
        'cubica':         '💡 <strong>Lección:</strong> Las funciones cúbicas pueden tener áreas negativas si cruzan el eje X. ¿Qué pasa si pones el inicio (a) en un número negativo?',
        'raiz':           '💡 <strong>Lección:</strong> La curva de la raíz cuadrada crece muy rápido al principio y luego se aplana. Observa el comportamiento del error.',
        'exponencial':    '💡 <strong>Lección:</strong> ¡Crecimiento explosivo! Aquí verás que un extremo falla por muchísimo si usas pocos rectángulos.',
        'trigonometrica': '💡 <strong>Lección:</strong> Las ondas son ideales para ver cómo los errores se comportan en las subidas y bajadas de la curva.',
        'gaussiana':      '💡 <strong>Lección:</strong> La famosa Campana de Gauss. Su área total tiene importancia crucial en probabilidad y estadística.',
        'absoluto':       '💡 <strong>Lección:</strong> El valor absoluto crea un "pico" afilado. Fíjate qué sucede cerca del vértice central.'
    };

    // --- Mensajes didácticos por método ---
    const mensajesMetodo = {
        'izquierda': '🔹 <strong>Método Izquierdo:</strong> La altura de cada rectángulo se toma del borde izquierdo. Fíjate si los rectángulos quedan por debajo o por encima de la curva.',
        'derecha':   '🔹 <strong>Método Derecho:</strong> Se usa el borde derecho del rectángulo. Compara cómo cambia el área sobrante respecto al método izquierdo.',
        'central':   '⭐ <strong>Punto Medio:</strong> ¡El más exacto! Al tomar la mitad del intervalo, el error que sobra de un lado suele compensar al que falta del otro.'
    };

    // --- Valores por defecto para cada función ---
    const rangosPorDefecto = {
        'lineal':         { a: 0, b: 5 },
        'cuadratica':     { a: -2, b: 2 },
        'cubica':         { a: -2, b: 2 },
        'raiz':           { a: 0, b: 4 },
        'exponencial':    { a: -1, b: 2 },
        'trigonometrica': { a: 0, b: 6.28 },
        'gaussiana':      { a: -3, b: 3 },
        'absoluto':       { a: -3, b: 3 }
    };

    let modoSimulador = 'didactico';

    window.cambiarModoSimulador = function(modo) {
        modoSimulador = modo;
        document.getElementById('btnSimuladorDidactico').classList.toggle('active', modo === 'didactico');
        document.getElementById('btnSimuladorLibre').classList.toggle('active', modo === 'libre');
        
        document.getElementById('contenedorFuncionDidactica').style.display = modo === 'didactico' ? 'block' : 'none';
        const panelDidactico = document.getElementById('mensajeDidactico');
        if (panelDidactico) panelDidactico.style.display = modo === 'didactico' ? 'block' : 'none';
        document.getElementById('contenedorFuncionLibre').style.display = modo === 'libre' ? 'block' : 'none';
        
        actualizarGrafica();
    };

    // --- Función principal de actualización ---
    actualizarGrafica = function () {
        try {
            if (!selFuncion || !inA || !inB || !inN || !selMetodo) return;

            const a = parseFloat(inA.value);
            const b = parseFloat(inB.value);
            const n = parseInt(inN.value);
            const claveMetodo = selMetodo.value || 'central';
            
            if (isNaN(a) || isNaN(b) || a >= b || isNaN(n) || n < 1) return;

            if (txtNumRect) txtNumRect.textContent = n;

            let f;
            let nombreCurva = 'Función';
            
            if (modoSimulador === 'didactico') {
                const claveFuncion = selFuncion.value || 'lineal';
                f = funcionesMath[claveFuncion] || funcionesMath['lineal'];
                nombreCurva = nombresFunciones[claveFuncion] || 'Función';
                
                // Mensajes didácticos
                if (panelDidactico) {
                    const msgF = mensajesLeccion[claveFuncion] || '';
                    const msgM = mensajesMetodo[claveMetodo] || '';
                    panelDidactico.innerHTML = `<p style="margin-bottom:6px;">${msgF}</p><p>${msgM}</p>`;
                }
            } else {
                const formulaInput = document.getElementById('formulaInput');
                // getValue('ascii-math') convierte el LaTeX de math-field a algo que math.js entiende fácil
                const mathExpr = formulaInput ? formulaInput.getValue('ascii-math') : 'x^2+2';
                try {
                    const nodo = math.compile(mathExpr);
                    f = (x) => nodo.evaluate({x: x});
                    f(0); // Validar que la función no lance error inmediato
                    nombreCurva = 'f(x) = ' + mathExpr;
                } catch (e) {
                    return; // Fórmula inválida o incompleta, simplemente no dibuja
                }
            }

            const dx = (b - a) / n;
            let areaSuma = 0;
            const datosRectangulos = [];

            // Colores por método
            const coloresMetodo = {
                'izquierda': { fill: 'rgba(244,63,94,0.3)', line: 'rgba(244,63,94,0.6)' },
                'derecha':   { fill: 'rgba(245,158,11,0.3)', line: 'rgba(245,158,11,0.6)' },
                'central':   { fill: 'rgba(16,185,129,0.3)', line: 'rgba(16,185,129,0.6)' }
            };
            const color = coloresMetodo[claveMetodo] || coloresMetodo['central'];
            
            let diverge = false;

            for (let i = 0; i < n; i++) {
                const xInicio = a + i * dx;
                const xFin = a + (i + 1) * dx;
                let xEval;
                if (claveMetodo === 'izquierda') xEval = xInicio;
                else if (claveMetodo === 'derecha') xEval = xFin;
                else xEval = xInicio + dx / 2;

                let altura = f(xEval);
                if (!isFinite(altura) || Math.abs(altura) > 1e6) {
                    diverge = true;
                    altura = 0; // Prevenir crash de Plotly pero marcamos como infinito
                }
                areaSuma += altura * dx;

                if (!diverge) {
                    datosRectangulos.push({
                        x: [xInicio, xFin, xFin, xInicio, xInicio],
                        y: [0, 0, altura, altura, 0],
                        fill: 'toself',
                        fillcolor: color.fill,
                        line: { color: color.line, width: 1 },
                        type: 'scatter',
                        mode: 'lines',
                        hoverinfo: 'skip',
                        showlegend: false
                    });
                }
            }

            if (txtResultado) {
                if (diverge) {
                    txtResultado.innerHTML = `<span style="font-size:18px;">∞ Infinito</span>`;
                } else {
                    txtResultado.textContent = areaSuma.toFixed(4) + ' u²';
                }
            }

            // Curva continua
            const xCurva = [], yCurva = [];
            const margen = (b - a) * 0.1;
            const plotA = a - margen;
            const plotB = b + margen;

            for (let i = 0; i <= 300; i++) {
                const x = plotA + i * ((plotB - plotA) / 300);
                xCurva.push(x);
                yCurva.push(f(x));
            }

            const trazoCurva = {
                x: xCurva,
                y: yCurva,
                mode: 'lines',
                line: { color: '#1f2937', width: 3 },
                name: nombreCurva,
                showlegend: true
            };

            const isMobile = window.innerWidth <= 600;
            
            const layout = {
                title: {
                    text: isMobile ? '<b>Sumas de Riemann</b>' : '<b>Área bajo la curva - Sumas de Riemann</b>',
                    font: { family: 'Plus Jakarta Sans, sans-serif', size: isMobile ? 14 : 17, color: '#111827' },
                    y: 0.96
                },
                autosize: true,
                xaxis: {
                    title: { text: 'x', font: { family: 'Plus Jakarta Sans', size: isMobile ? 12 : 14 } },
                    range: [plotA, plotB],
                    zeroline: true,
                    zerolinecolor: '#d1d5db',
                    gridcolor: '#f3f4f6',
                    linecolor: '#e5e7eb'
                },
                yaxis: {
                    title: { text: 'f(x)', font: { family: 'Plus Jakarta Sans', size: isMobile ? 12 : 14 } },
                    zeroline: true,
                    zerolinecolor: '#d1d5db',
                    gridcolor: '#f3f4f6',
                    linecolor: '#e5e7eb'
                },
                margin: isMobile ? { l: 40, r: 15, b: 40, t: 40 } : { l: 55, r: 25, b: 50, t: 55 },
                showlegend: true,
                legend: isMobile 
                    ? { orientation: 'h', x: 0, y: -0.15, font: { family: 'Plus Jakarta Sans', size: 10 } }
                    : { x: 0.02, y: 0.98, font: { family: 'Plus Jakarta Sans', size: 12 } },
                plot_bgcolor: '#ffffff',
                paper_bgcolor: '#ffffff',
                dragmode: 'pan'
            };

            const divGrafico = document.getElementById('grafico');
            if (divGrafico && typeof Plotly !== 'undefined') {
                Plotly.react('grafico', [trazoCurva, ...datosRectangulos], layout, { responsive: true });
            }
        } catch (error) {
            console.error("Error en el simulador:", error);
        }
    };

    // --- Eventos del simulador ---
    if (selFuncion) {
        selFuncion.addEventListener('change', () => {
            try {
                const clave = selFuncion.value || 'lineal';
                if (rangosPorDefecto[clave]) {
                    if (inA) inA.value = rangosPorDefecto[clave].a;
                    if (inB) inB.value = rangosPorDefecto[clave].b;
                }
                actualizarGrafica();
            } catch (e) {
                console.error("Error al cambiar función:", e);
            }
        });
    }

    if (inA) inA.addEventListener('input', actualizarGrafica);
    if (inB) inB.addEventListener('input', actualizarGrafica);
    if (inN) inN.addEventListener('input', actualizarGrafica);
    if (selMetodo) selMetodo.addEventListener('change', actualizarGrafica);
    
    const formulaInput = document.getElementById('formulaInput');
    if (formulaInput) {
        formulaInput.addEventListener('input', actualizarGrafica);
    }

    // Inicialización diferida
    setTimeout(() => {
        try { actualizarGrafica(); } catch (e) {}
    }, 150);


    // ============================================================
    // 3. DESAFÍO — 5 RETOS PROGRESIVOS
    // ============================================================

    // Funciones auxiliares para los retos
    const funcionesReto = {
        'lineal_simple': (x) => x + 1,
        'cuadratica':    (x) => x * x,
        'lineal':        (x) => x + 2
    };

    const nombresReto = {
        'lineal_simple': 'f(x) = x + 1',
        'cuadratica':    'f(x) = x²',
        'lineal':        'f(x) = x + 2'
    };

    // Definición de los 5 retos
    const retosDefinidos = [
        {
            id: 1,
            titulo: 'Identifica el Método',
            descripcion: 'Observa cómo los rectángulos se alinean con la curva y determina qué método de evaluación se usó para dibujarlos.',
            claveFunc: 'lineal_simple',
            a: 0, b: 4, n: 4,
            metodoUsado: 'izquierda',
            tipo: 'opcion_multiple',
            pregunta: '¿Qué método de evaluación se usó para construir estos rectángulos?',
            opciones: ['Extremo Izquierdo', 'Extremo Derecho', 'Punto Medio'],
            respuestaCorrecta: 0,
            pista: 'Fíjate en qué parte del rectángulo toca la curva: ¿el borde izquierdo, el derecho o el centro?',
            explicacion: 'Los rectángulos tocan la curva en su <strong>borde izquierdo</strong>. Esto indica que se usó el método del <strong>Extremo Izquierdo</strong>, donde la altura de cada rectángulo se determina evaluando f(x) en el punto inicial de cada subintervalo.'
        },
        {
            id: 2,
            titulo: '¿Sobreestima o Subestima?',
            descripcion: 'Analiza si la aproximación produce un resultado mayor o menor que el área real bajo la curva.',
            claveFunc: 'cuadratica',
            a: 0, b: 3, n: 5,
            metodoUsado: 'derecha',
            tipo: 'opcion_multiple',
            pregunta: 'Con el método del extremo derecho en esta función creciente (x²), la suma de Riemann...',
            opciones: ['Sobreestima el área real', 'Subestima el área real', 'Da el valor exacto'],
            respuestaCorrecta: 0,
            pista: 'En una función creciente, ¿el valor al borde derecho de cada subintervalo es mayor o menor que en el resto?',
            explicacion: 'En una función <strong>creciente</strong> como x², el valor en el extremo derecho es siempre el <strong>mayor</strong> del subintervalo. Por eso los rectángulos "sobresalen" por encima de la curva, <strong>sobreestimando</strong> el área real.'
        },
        {
            id: 3,
            titulo: 'Calcula Δx',
            descripcion: 'Aplica la fórmula del ancho de los subintervalos para determinar Δx.',
            claveFunc: 'lineal',
            a: 1, b: 5, n: 4,
            metodoUsado: 'izquierda',
            tipo: 'numerico',
            pregunta: 'Si el intervalo es [1, 5] y se usan 4 rectángulos, ¿cuánto vale Δx?',
            respuestaCorrecta: 1,
            tolerancia: 0.01,
            pista: 'Recuerda la fórmula: Δx = (b − a) / n',
            explicacion: '<strong>Δx = (b − a) / n = (5 − 1) / 4 = 4/4 = 1</strong>. Cada rectángulo tiene un ancho de 1 unidad sobre el eje x.'
        },
        {
            id: 4,
            titulo: 'Calcula la Altura',
            descripcion: 'Determina la altura de un rectángulo específico evaluando la función en el punto correcto.',
            claveFunc: 'cuadratica',
            a: 0, b: 4, n: 4,
            metodoUsado: 'izquierda',
            tipo: 'numerico',
            pregunta: 'Usando el extremo izquierdo con Δx = 1, los subintervalos son [0,1], [1,2], [2,3], [3,4]. ¿Cuál es la altura del tercer rectángulo?',
            respuestaCorrecta: 4,
            tolerancia: 0.01,
            pista: 'El tercer subintervalo es [2, 3]. Con el extremo izquierdo, evalúa la función en x = 2.',
            explicacion: 'El tercer subintervalo es [2, 3]. Con el método del extremo izquierdo, evaluamos en <strong>x = 2</strong>: f(2) = 2² = <strong>4</strong>. La altura del tercer rectángulo es 4.'
        },
        {
            id: 5,
            titulo: 'La Suma Completa',
            descripcion: 'Calcula el valor total de la Suma de Riemann combinando todos los conceptos aprendidos.',
            claveFunc: 'cuadratica',
            a: 0, b: 2, n: 2,
            metodoUsado: 'izquierda',
            tipo: 'numerico',
            pregunta: 'Calcula la Suma de Riemann: f(x) = x², intervalo [0, 2], n = 2, extremo izquierdo. ¿Cuál es el resultado?',
            respuestaCorrecta: 1,
            tolerancia: 0.1,
            pista: 'Δx = (2−0)/2 = 1. Los puntos de evaluación son x₀ = 0 y x₁ = 1. Suma = f(0)·Δx + f(1)·Δx',
            explicacion: '<strong>Δx = (2−0)/2 = 1</strong>. Puntos de evaluación: x₀ = 0, x₁ = 1.<br><strong>Suma = f(0)·1 + f(1)·1 = 0 + 1 = 1</strong>.<br>El área aproximada es 1 u² (el área real es 8/3 ≈ 2.67, lo cual muestra el error con solo 2 rectángulos).'
        }
    ];

    let desafioState = {
        retoActual: 0,
        puntaje: 0,
        respondido: false,
        pistaUsada: false
    };

    // Dibujar gráfico del reto
    function dibujarGraficoDesafio(reto) {
        const f = funcionesReto[reto.claveFunc];
        const a = reto.a;
        const b = reto.b;
        const n = reto.n;
        const metodo = reto.metodoUsado;
        const margen = (b - a) * 0.15;
        const plotA = a - margen;
        const plotB = b + margen;
        const xCurva = [], yCurva = [];

        for (let i = 0; i <= 300; i++) {
            const x = plotA + i * ((plotB - plotA) / 300);
            xCurva.push(x);
            yCurva.push(f(x));
        }

        const trazos = [{
            x: xCurva, y: yCurva,
            mode: 'lines',
            line: { color: '#111827', width: 3 },
            name: nombresReto[reto.claveFunc],
            showlegend: true
        }];

        // Dibujar rectángulos
        const dx = (b - a) / n;
        for (let i = 0; i < n; i++) {
            const xInicio = a + i * dx;
            const xFin = a + (i + 1) * dx;
            let xEval;
            if (metodo === 'izquierda') xEval = xInicio;
            else if (metodo === 'derecha') xEval = xFin;
            else xEval = xInicio + dx / 2;

            const altura = f(xEval);
            trazos.push({
                x: [xInicio, xFin, xFin, xInicio, xInicio],
                y: [0, 0, altura, altura, 0],
                fill: 'toself',
                fillcolor: 'rgba(99,102,241,0.25)',
                line: { color: 'rgba(79,70,229,0.5)', width: 1.5 },
                type: 'scatter', mode: 'lines',
                hoverinfo: 'skip', showlegend: false
            });
        }

        const layout = {
            title: {
                text: `<b>Reto ${reto.id}: ${reto.titulo}</b>`,
                font: { family: 'Plus Jakarta Sans, sans-serif', size: 16, color: '#111827' }
            },
            autosize: true,
            xaxis: { range: [plotA, plotB], zeroline: true, zerolinecolor: '#d1d5db', gridcolor: '#f3f4f6' },
            yaxis: { zeroline: true, zerolinecolor: '#d1d5db', gridcolor: '#f3f4f6' },
            margin: { l: 50, r: 20, b: 40, t: 50 },
            showlegend: true,
            legend: { x: 0.02, y: 0.98, font: { family: 'Plus Jakarta Sans', size: 12 } },
            plot_bgcolor: '#ffffff',
            paper_bgcolor: '#ffffff',
            dragmode: 'pan'
        };

        const div = document.getElementById('graficoDesafio');
        if (div && typeof Plotly !== 'undefined') {
            Plotly.react('graficoDesafio', trazos, layout, { responsive: true });
        }
    }

    // Mostrar el reto actual
    function mostrarRetoActual() {
        const idx = desafioState.retoActual;
        if (idx >= retosDefinidos.length) {
            mostrarDesafioCompletado();
            return;
        }

        const reto = retosDefinidos[idx];
        desafioState.respondido = false;
        desafioState.pistaUsada = false;

        // Actualizar barra de progreso
        const pasos = document.querySelectorAll('.progress-step');
        pasos.forEach((paso, i) => {
            paso.classList.remove('completed', 'current');
            if (i < idx) paso.classList.add('completed');
            else if (i === idx) paso.classList.add('current');
        });
        document.getElementById('desafioProgressLabel').textContent = `${idx + 1}/5`;

        // Info del reto
        document.getElementById('desafioBadgeNum').textContent = reto.id;
        document.getElementById('desafioTitulo').textContent = reto.titulo;
        document.getElementById('desafioDescripcion').textContent = reto.descripcion;

        // Info de la función
        document.getElementById('desafioFuncNombre').textContent = nombresReto[reto.claveFunc];
        document.getElementById('desafioIntervalo').textContent = `[${reto.a}, ${reto.b}]`;
        document.getElementById('desafioNumRect').textContent = `${reto.n} rectángulos`;

        // Pregunta
        document.getElementById('desafioPregunta').textContent = reto.pregunta;

        // Generar opciones o input
        const areaRespuesta = document.getElementById('desafioRespuestaArea');
        if (reto.tipo === 'opcion_multiple') {
            const letras = ['A', 'B', 'C', 'D'];
            areaRespuesta.innerHTML = `<div class="desafio-opciones" id="desafioOpciones">
                ${reto.opciones.map((opt, i) => `
                    <button class="desafio-opcion" data-idx="${i}" onclick="seleccionarOpcionDesafio(${i})">
                        <span class="opcion-letra">${letras[i]}</span>
                        <span>${opt}</span>
                    </button>
                `).join('')}
            </div>`;
        } else {
            areaRespuesta.innerHTML = `<div class="desafio-input-group">
                <input type="number" id="desafioInputNumerico" class="desafio-input" placeholder="Tu respuesta" step="any">
            </div>`;
        }

        // Ocultar feedback, pista y botón siguiente
        document.getElementById('desafioFeedback').classList.add('hidden');
        document.getElementById('desafioSiguienteBtn').classList.add('hidden');
        document.getElementById('desafioVerificarBtn').classList.remove('hidden');
        document.getElementById('desafioVerificarBtn').disabled = false;

        // Mostrar panel de reto, ocultar completado
        document.getElementById('desafioContenido').classList.remove('hidden');
        document.getElementById('desafioCompletado').classList.add('hidden');

        // Dibujar gráfico
        setTimeout(() => {
            dibujarGraficoDesafio(reto);
        }, 50);
    }

    window.seleccionarOpcionDesafio = function (idx) {
        if (desafioState.respondido) return;
        document.querySelectorAll('.desafio-opcion').forEach((btn, i) => {
            btn.classList.toggle('selected', i === idx);
        });
    };

    window.verificarDesafio = function () {
        if (desafioState.respondido) return;

        const reto = retosDefinidos[desafioState.retoActual];
        let esCorrecta = false;
        let respuestaUsuario;

        if (reto.tipo === 'opcion_multiple') {
            const seleccionada = document.querySelector('.desafio-opcion.selected');
            if (!seleccionada) return; // No ha seleccionado nada
            respuestaUsuario = parseInt(seleccionada.getAttribute('data-idx'));
            esCorrecta = respuestaUsuario === reto.respuestaCorrecta;

            // Marcar opciones
            document.querySelectorAll('.desafio-opcion').forEach((btn, i) => {
                btn.classList.add('disabled');
                if (i === reto.respuestaCorrecta) btn.classList.add('correct');
                if (i === respuestaUsuario && !esCorrecta) btn.classList.add('incorrect');
            });
        } else {
            const input = document.getElementById('desafioInputNumerico');
            if (!input || input.value === '') return;
            respuestaUsuario = parseFloat(input.value);
            esCorrecta = Math.abs(respuestaUsuario - reto.respuestaCorrecta) <= (reto.tolerancia || 0.01);
            input.classList.add(esCorrecta ? 'correct' : 'incorrect');
            input.readOnly = true;
        }

        desafioState.respondido = true;

        if (esCorrecta) {
            desafioState.puntaje++;
            AudioFX.correct();
        } else {
            AudioFX.incorrect();
        }

        // Mostrar feedback
        const feedbackEl = document.getElementById('desafioFeedback');
        feedbackEl.classList.remove('hidden', 'correct', 'incorrect');
        feedbackEl.classList.add(esCorrecta ? 'correct' : 'incorrect');
        feedbackEl.innerHTML = (esCorrecta ? '✅ <strong>¡Correcto!</strong> ' : '❌ <strong>Incorrecto.</strong> ') + reto.explicacion;

        // Ocultar botón verificar, mostrar siguiente
        document.getElementById('desafioVerificarBtn').classList.add('hidden');
        const btnSig = document.getElementById('desafioSiguienteBtn');
        btnSig.classList.remove('hidden');
        btnSig.textContent = (desafioState.retoActual < retosDefinidos.length - 1) ? 'Siguiente Reto →' : 'Ver Resultados →';
    };

    window.siguienteDesafio = function () {
        AudioFX.click();
        desafioState.retoActual++;
        mostrarRetoActual();
    };

    window.mostrarPistaDesafio = function () {
        if (desafioState.respondido) return;
        const reto = retosDefinidos[desafioState.retoActual];
        const feedbackEl = document.getElementById('desafioFeedback');
        feedbackEl.classList.remove('hidden', 'correct', 'incorrect');
        feedbackEl.classList.add('pista');
        feedbackEl.innerHTML = '💡 <strong>Pista:</strong> ' + reto.pista;
        desafioState.pistaUsada = true;
    };

    function mostrarDesafioCompletado() {
        document.getElementById('desafioContenido').classList.add('hidden');
        document.getElementById('desafioProgreso').classList.add('hidden');
        const completadoEl = document.getElementById('desafioCompletado');
        completadoEl.classList.remove('hidden');

        const puntaje = desafioState.puntaje;
        const total = retosDefinidos.length;

        document.getElementById('completadoScoreNum').textContent = puntaje;
        document.getElementById('completadoScoreTotal').textContent = '/ ' + total;

        let titulo, msg;
        if (puntaje >= 5) {
            titulo = '🏆 ¡Perfecto!';
            msg = 'Has dominado todos los conceptos de las Sumas de Riemann.';
        } else if (puntaje >= 4) {
            titulo = '🎉 ¡Excelente!';
            msg = '¡Casi perfecto! Tienes un gran dominio del tema.';
        } else if (puntaje >= 3) {
            titulo = '👍 ¡Buen trabajo!';
            msg = 'Vas por buen camino. Repasa los conceptos para perfeccionar.';
        } else {
            titulo = '💪 ¡Sigue practicando!';
            msg = 'Revisa la sección teórica y vuelve a intentarlo.';
        }

        document.getElementById('completadoTitulo').textContent = titulo;
        document.getElementById('completadoMsg').textContent = msg;

        // Estrellas
        let estrellas = 0;
        if (puntaje >= 5) estrellas = 3;
        else if (puntaje >= 4) estrellas = 2;
        else if (puntaje >= 3) estrellas = 1;

        const estrellasHTML = [];
        for (let i = 0; i < 3; i++) {
            if (i < estrellas) {
                estrellasHTML.push(`<i class="fa-solid fa-star star-filled" style="animation: bounceIn 0.4s ${i * 0.2}s both;"></i>`);
            } else {
                estrellasHTML.push(`<i class="fa-regular fa-star star-empty"></i>`);
            }
        }
        document.getElementById('completadoEstrellas').innerHTML = estrellasHTML.join(' ');

        // Efectos
        if (puntaje >= 4) {
            AudioFX.victory();
            lanzarConfeti();
        } else if (puntaje >= 3) {
            AudioFX.correct();
        }

        // Marcar progreso completado
        document.querySelectorAll('.progress-step').forEach(p => {
            p.classList.remove('current');
            p.classList.add('completed');
        });
    }

    window.reiniciarDesafio = function () {
        AudioFX.click();
        desafioState = { retoActual: 0, puntaje: 0, respondido: false, pistaUsada: false };
        // Volver a la pantalla de inicio
        document.getElementById('desafioInicio').classList.remove('hidden');
        document.getElementById('desafioProgreso').classList.add('hidden');
        document.getElementById('desafioContenido').classList.add('hidden');
        document.getElementById('desafioCompletado').classList.add('hidden');
    };

    window.inicializarDesafio = function () {
        // Solo mostrar la pantalla de inicio, no auto-arrancar los retos
        document.getElementById('desafioInicio').classList.remove('hidden');
        document.getElementById('desafioProgreso').classList.add('hidden');
        document.getElementById('desafioContenido').classList.add('hidden');
        document.getElementById('desafioCompletado').classList.add('hidden');
    };

    window.comenzarPractica = function () {
        AudioFX.click();
        desafioState = { retoActual: 0, puntaje: 0, respondido: false, pistaUsada: false };
        // Ocultar inicio, mostrar progreso y contenido
        document.getElementById('desafioInicio').classList.add('hidden');
        document.getElementById('desafioProgreso').classList.remove('hidden');
        document.getElementById('desafioContenido').classList.remove('hidden');
        mostrarRetoActual();
    };


    // ============================================================
    // 4. QUIZ DE CONCEPTOS
    // ============================================================
    const preguntas = [
        {
            pregunta: '¿Qué representa el símbolo Σ (Sigma) en la fórmula de las Sumas de Riemann?',
            opciones: ['Multiplicación', 'Sumatoria', 'Derivada', 'Límite'],
            correcta: 1,
            explicacion: 'El símbolo Σ (Sigma mayúscula) indica una sumatoria: sumar todos los elementos desde i=1 hasta i=n.'
        },
        {
            pregunta: '¿Cómo se calcula Δx (el ancho de cada rectángulo)?',
            opciones: ['a × b', 'n / (b − a)', '(b − a) / n', 'b − a'],
            correcta: 2,
            explicacion: 'Δx = (b − a) / n. Se divide el ancho total del intervalo entre el número de rectángulos.'
        },
        {
            pregunta: 'Si una función es creciente en [a, b], el método del extremo izquierdo...',
            opciones: ['Sobreestima el área', 'Subestima el área', 'Da el valor exacto', 'No se puede determinar'],
            correcta: 1,
            explicacion: 'En una función creciente, el valor izquierdo es siempre menor que el derecho, así que los rectángulos quedan por debajo de la curva.'
        },
        {
            pregunta: '¿Qué sucede con la aproximación de Riemann cuando n → ∞?',
            opciones: ['Se vuelve infinita', 'Se vuelve cero', 'Converge a la integral definida', 'Oscila sin converger'],
            correcta: 2,
            explicacion: 'Al aumentar n al infinito, los rectángulos se hacen infinitamente delgados y la suma converge exactamente a la integral definida.'
        },
        {
            pregunta: '¿Cuál método suele dar la mejor aproximación con pocos rectángulos?',
            opciones: ['Extremo izquierdo', 'Extremo derecho', 'Punto medio', 'Todos dan lo mismo'],
            correcta: 2,
            explicacion: 'El punto medio compensa errores: lo que sobra por un lado tiende a cancelarse con lo que falta por el otro.'
        },
        {
            pregunta: 'Si f(x) = x² en [0, 2] con n = 2, ¿cuánto vale Δx?',
            opciones: ['0.5', '1', '2', '4'],
            correcta: 1,
            explicacion: 'Δx = (b − a) / n = (2 − 0) / 2 = 1.'
        },
        {
            pregunta: 'La integral definida es...',
            opciones: [
                'Una aproximación del área',
                'El límite de la suma de Riemann cuando n → ∞',
                'El promedio de los tres métodos',
                'Solo válida para funciones lineales'
            ],
            correcta: 1,
            explicacion: 'La integral definida se define formalmente como el límite de la suma de Riemann cuando el número de subdivisiones tiende a infinito.'
        },
        {
            pregunta: 'En la fórmula Σ f(xᵢ)·Δx, ¿qué representa f(xᵢ)?',
            opciones: ['La base del rectángulo', 'La altura del rectángulo', 'El área total', 'El número de rectángulos'],
            correcta: 1,
            explicacion: 'f(xᵢ) es el valor de la función evaluada en el punto xᵢ, que corresponde a la altura del i-ésimo rectángulo.'
        },
        {
            pregunta: 'Si usas el método del extremo derecho en una función decreciente, el resultado...',
            opciones: ['Subestima el área real', 'Sobreestima el área real', 'Es exacto', 'Es siempre negativo'],
            correcta: 0,
            explicacion: 'En una función decreciente, el extremo derecho da valores menores, por lo que los rectángulos quedan por debajo de la curva.'
        },
        {
            pregunta: '¿Cuál es una aplicación real de las Sumas de Riemann?',
            opciones: [
                'Solo sirven en matemáticas puras',
                'Calcular áreas, volúmenes y acumulaciones',
                'Solo para funciones lineales',
                'No tienen aplicación práctica'
            ],
            correcta: 1,
            explicacion: 'Las Sumas de Riemann (y las integrales) se usan en física, ingeniería, economía, estadística y muchas otras disciplinas para calcular áreas, volúmenes, trabajo, probabilidades, etc.'
        }
    ];

    let quizState = {
        actual: 0,
        puntaje: 0,
        respondida: false
    };

    window.cambiarModoJuego = function (modo) {
        AudioFX.click();
        document.getElementById('panelDesafio').classList.toggle('hidden', modo !== 'desafio');
        document.getElementById('panelQuiz').classList.toggle('hidden', modo !== 'quiz');

        document.getElementById('btnModoDesafio').classList.toggle('active', modo === 'desafio');
        document.getElementById('btnModoQuiz').classList.toggle('active', modo === 'quiz');

        if (modo === 'desafio') {
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
                if (!window._desafioInit && typeof inicializarDesafio === 'function') {
                    inicializarDesafio();
                    window._desafioInit = true;
                }
            }, 100);
        }
    };

    window.iniciarQuiz = function () {
        AudioFX.click();
        quizState = { actual: 0, puntaje: 0, respondida: false };
        // Ocultar inicio, mostrar preguntas directamente
        document.getElementById('quizInicio').classList.add('hidden');
        document.getElementById('quizPreguntas').classList.remove('hidden');
        document.getElementById('quizFinal').classList.add('hidden');
        mostrarPregunta();
    };

    function mostrarPregunta() {
        const p = preguntas[quizState.actual];
        document.getElementById('quizPreguntaTexto').textContent = p.pregunta;
        document.getElementById('quizActual').textContent = quizState.actual + 1;
        document.getElementById('quizProgressBar').style.width = ((quizState.actual + 1) / preguntas.length * 100) + '%';

        const letras = ['A', 'B', 'C', 'D'];
        const opcionesHTML = p.opciones.map((opt, i) => {
            return `<button class="quiz-option" onclick="responderQuiz(${i})" data-idx="${i}">
                <span class="option-letter">${letras[i]}</span>
                <span>${opt}</span>
            </button>`;
        }).join('');

        document.getElementById('quizOpciones').innerHTML = opcionesHTML;

        const feedbackEl = document.getElementById('quizFeedback');
        feedbackEl.classList.add('hidden');
        feedbackEl.classList.remove('correct', 'incorrect');
        document.getElementById('btnSiguiente').classList.add('hidden');

        quizState.respondida = false;
    }

    window.responderQuiz = function (idx) {
        if (quizState.respondida) return;
        quizState.respondida = true;

        const p = preguntas[quizState.actual];
        const esCorrecta = idx === p.correcta;

        if (esCorrecta) {
            quizState.puntaje++;
            AudioFX.correct();
        } else {
            AudioFX.incorrect();
        }

        // Marcar opciones
        const botones = document.querySelectorAll('.quiz-option');
        botones.forEach((btn, i) => {
            btn.classList.add('disabled');
            if (i === p.correcta) btn.classList.add('correct');
            if (i === idx && !esCorrecta) btn.classList.add('incorrect');
        });

        // Mostrar feedback
        const feedbackEl = document.getElementById('quizFeedback');
        feedbackEl.classList.remove('hidden', 'correct', 'incorrect');
        feedbackEl.classList.add(esCorrecta ? 'correct' : 'incorrect');
        document.getElementById('quizFeedbackTexto').innerHTML =
            (esCorrecta ? '✅ <strong>¡Correcto!</strong> ' : '❌ <strong>Incorrecto.</strong> ') + p.explicacion;

        // Mostrar botón siguiente
        const btnSig = document.getElementById('btnSiguiente');
        btnSig.classList.remove('hidden');
        btnSig.textContent = (quizState.actual < preguntas.length - 1) ? 'Siguiente →' : 'Ver resultados →';
    };

    window.siguientePregunta = function () {
        AudioFX.click();
        quizState.actual++;
        if (quizState.actual < preguntas.length) {
            mostrarPregunta();
        } else {
            mostrarResultadosQuiz();
        }
    };

    function mostrarResultadosQuiz() {
        document.getElementById('quizPreguntas').classList.add('hidden');
        const finalEl = document.getElementById('quizFinal');
        finalEl.classList.remove('hidden');

        const puntaje = quizState.puntaje;

        document.getElementById('quizFinalPuntaje').textContent = puntaje;

        let titulo, mensaje, iconClass;
        if (puntaje >= 9) {
            titulo = '🏆 ¡Extraordinario!';
            mensaje = 'Tienes un dominio excepcional de las Sumas de Riemann.';
            iconClass = 'gold';
        } else if (puntaje >= 7) {
            titulo = '🎉 ¡Muy bien!';
            mensaje = 'Demuestras un buen conocimiento. ¡Sigue así!';
            iconClass = 'gold';
        } else if (puntaje >= 5) {
            titulo = '👍 ¡Buen intento!';
            mensaje = 'Vas por buen camino. Repasa la sección teórica para mejorar.';
            iconClass = 'silver';
        } else {
            titulo = '💪 ¡No te rindas!';
            mensaje = 'Lee la sección de contenido teórico y vuelve a intentarlo.';
            iconClass = 'bronze';
        }

        document.getElementById('quizFinalTitulo').textContent = titulo;
        document.getElementById('quizFinalMensaje').textContent = mensaje;

        const iconEl = document.getElementById('quizFinalIcon');
        iconEl.className = 'final-icon ' + iconClass;

        let estrellas = 0;
        if (puntaje >= 9) estrellas = 3;
        else if (puntaje >= 7) estrellas = 2;
        else if (puntaje >= 5) estrellas = 1;

        const estrellasHTML = [];
        for (let i = 0; i < 3; i++) {
            if (i < estrellas) {
                estrellasHTML.push(`<i class="fa-solid fa-star star-filled" style="animation: bounceIn 0.4s ${i * 0.2}s both;"></i>`);
            } else {
                estrellasHTML.push(`<i class="fa-regular fa-star star-empty"></i>`);
            }
        }
        document.getElementById('quizFinalEstrellas').innerHTML = estrellasHTML.join(' ');

        if (puntaje >= 7) {
            AudioFX.victory();
            lanzarConfeti();
        } else if (puntaje >= 5) {
            AudioFX.correct();
        }
    }

    window.reiniciarQuiz = function () {
        AudioFX.click();
        document.getElementById('quizFinal').classList.add('hidden');
        document.getElementById('quizInicio').classList.remove('hidden');
        document.getElementById('confettiContainer').innerHTML = '';
    };


    // ============================================================
    // 5. CONFETI
    // ============================================================
    function lanzarConfeti() {
        const container = document.getElementById('confettiContainer');
        container.innerHTML = '';
        const colores = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#ec4899', '#0ea5e9'];

        for (let i = 0; i < 80; i++) {
            const piece = document.createElement('div');
            piece.classList.add('confetti-piece');
            piece.style.left = Math.random() * 100 + '%';
            piece.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
            piece.style.animationDuration = (2 + Math.random() * 3) + 's';
            piece.style.animationDelay = Math.random() * 1.5 + 's';
            piece.style.width = (6 + Math.random() * 8) + 'px';
            piece.style.height = (6 + Math.random() * 8) + 'px';
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            container.appendChild(piece);
        }

        setTimeout(() => { container.innerHTML = ''; }, 6000);
    }

}); // fin DOMContentLoaded
