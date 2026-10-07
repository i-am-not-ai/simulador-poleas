interface Particula {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radio: number;
    alfa: number;
    color: string;
}

class MinijuegoPoleas {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    // Valores internos en el Sistema Internacional (kg, m)
    private m1: number = 5;
    private m2: number = 15;
    private alturaX: number = 10;
    private g: number = 9.81;
    private aceleracion: number = 0;
    private tiempoTotal: number = 0;

    private tiempoSimulado: number = 0;
    private enEjecucion: boolean = false;
    private lastTime: number = 0;

    // Estado del sistema de unidades: 'SI' (m, kg) o 'ALT' (cm, g)
    private sistemaUnidades: 'SI' | 'ALT' = 'SI';

    // Coordenadas fijas de la interfaz (en píxeles)
    private yM1: number = 380;
    private yM2: number = 170;
    private sueloY: number = 450;
    private poleaX: number = 200;
    private poleaY: number = 80;
    private radioPolea: number = 30;
    private alturaMaximaMoverse: number = 240;

    // Sistema de partículas para el impacto
    private particulas: Particula[] = [];

    constructor() {
        this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
        this.registrarEventos();
        this.reiniciarEntorno();
    }

    private registrarEventos(): void {
        const btnIniciar = document.getElementById("btnIniciar");
        if (btnIniciar) {
            btnIniciar.addEventListener("click", () => this.iniciarSimulacion());
        }

        const btnUnidades = document.getElementById("btnUnidades");
        if (btnUnidades) {
            btnUnidades.addEventListener("click", () => this.conmutarUnidades());
        }
    }

    private conmutarUnidades(): void {
        if (this.enEjecucion) return;

        const inputM1 = document.getElementById("m1") as HTMLInputElement;
        const inputM2 = document.getElementById("m2") as HTMLInputElement;
        const inputX = document.getElementById("alturaX") as HTMLInputElement;

        let v1 = parseFloat(inputM1.value);
        let v2 = parseFloat(inputM2.value);
        let vx = parseFloat(inputX.value);

        if (this.sistemaUnidades === 'SI') {
            this.sistemaUnidades = 'ALT';
            document.getElementById("btnUnidades")!.innerText = "Cambiar a: Métrico (m / kg)";
            inputM1.value = (v1 * 1000).toFixed(0);
            inputM2.value = (v2 * 1000).toFixed(0);
            inputX.value = (vx * 100).toFixed(0);
            this.actualizarLabelsTexto("g", "cm", "cm/s²");
        } else {
            this.sistemaUnidades = 'SI';
            document.getElementById("btnUnidades")!.innerText = "Cambiar a: Métrico (cm / g)";
            inputM1.value = (v1 / 1000).toFixed(1);
            inputM2.value = (v2 / 1000).toFixed(1);
            inputX.value = (vx / 100).toFixed(1);
            this.actualizarLabelsTexto("kg", "m", "m/s²");
        }
        this.reiniciarEntorno();
    }

    private actualizarLabelsTexto(masaStr: string, distStr: string, acelStr: string): void {
        document.querySelectorAll(".lblMasa").forEach(el => (el as HTMLElement).innerText = masaStr);
        document.querySelectorAll(".lblDist").forEach(el => (el as HTMLElement).innerText = distStr);
        document.querySelectorAll(".lblAcel").forEach(el => (el as HTMLElement).innerText = acelStr);
    }

    private reiniciarEntorno(): boolean {
        let rawM1 = parseFloat((document.getElementById("m1") as HTMLInputElement).value);
        let rawM2 = parseFloat((document.getElementById("m2") as HTMLInputElement).value);
        let rawX = parseFloat((document.getElementById("alturaX") as HTMLInputElement).value);

        if (this.sistemaUnidades === 'ALT') {
            this.m1 = rawM1 / 1000;
            this.m2 = rawM2 / 1000;
            this.alturaX = rawX / 100;
        } else {
            this.m1 = rawM1;
            this.m2 = rawM2;
            this.alturaX = rawX;
        }

        if (this.m2 <= this.m1) {
            alert("La masa m2 debe ser estrictamente mayor que m1 para efectuar la caída.");
            return false;
        }

        // Física cinemática invariable
        this.aceleracion = this.g * (this.m2 - this.m1) / (this.m1 + this.m2);
        this.tiempoTotal = Math.sqrt((2 * this.alturaX) / this.aceleracion);

        let acelMostrar = this.sistemaUnidades === 'ALT' ? this.aceleracion * 100 : this.aceleracion;
        (document.getElementById("txtAcel") as HTMLElement).innerText = acelMostrar.toFixed(2);
        (document.getElementById("txtTiempo") as HTMLElement).innerText = this.tiempoTotal.toFixed(2);
        (document.getElementById("txtActual") as HTMLElement).innerText = "0.00";

        // --- CORRECCIÓN DE ALTURA INICIAL PARA CILINDROS (60px) ---
        // El espacio útil de movimiento termina exactamente a (this.sueloY - 60) para que m2 no atraviese el suelo
        this.yM2 = this.sueloY - 60 - this.alturaMaximaMoverse; 
        this.yM1 = 140 + this.alturaMaximaMoverse;             

        this.tiempoSimulado = 0;
        this.enEjecucion = false;
        this.particulas = []; 

        this.dibujar();
        return true;
    }

    private iniciarSimulacion(): void {
        if (!this.reiniciarEntorno()) return;
        this.enEjecucion = true;
        this.lastTime = performance.now();
        requestAnimationFrame((timestamp) => this.loopPrincipal(timestamp));
    }

    private generarImpacto(): void {
        // Generar 15 partículas rápidas en la base donde choca m2
        let impactoX = this.poleaX + this.radioPolea;
        let impactoY = this.sueloY;

        for (let i = 0; i < 15; i++) {
            this.particulas.push({
                x: impactoX,
                y: impactoY - 5,
                // Velocidad aleatoria hacia los lados (vx) y hacia arriba (vy)
                vx: (Math.random() - 0.5) * 200,
                vy: -Math.random() * 150 - 50,
                radio: Math.random() * 3 + 2,
                alfa: 1.0,
                color: Math.random() > 0.5 ? "#e9cb23" : "#dd4f24" // Tonos azules de m2
            });
        }
    }

    private loopPrincipal(timestamp: number): void {
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        if (dt > 0.1) dt = 0.1; 

        if (this.enEjecucion) {
            this.tiempoSimulado += dt;

            if (this.tiempoSimulado >= this.tiempoTotal) {
                this.tiempoSimulado = this.tiempoTotal;
                this.enEjecucion = false;
                this.generarImpacto(); 
            }

            let porcentajeProgreso = (0.5 * this.aceleracion * Math.pow(this.tiempoSimulado, 2)) / this.alturaX;
            if (porcentajeProgreso > 1) porcentajeProgreso = 1;

            let desplazamientoPixeles = porcentajeProgreso * this.alturaMaximaMoverse;
            
            // --- CORRECCIÓN DINÁMICA DE LA ANIMACIÓN ---
            // m2 parte desde el techo de la simulación y desciende sumando píxeles. Su tope máximo final exacto será (sueloY - 60)
            this.yM2 = (this.sueloY - 60 - this.alturaMaximaMoverse) + desplazamientoPixeles;
            
            // m1 parte desde la base de la simulación y asciende restando píxeles
            this.yM1 = (140 + this.alturaMaximaMoverse) - desplazamientoPixeles; 

            (document.getElementById("txtActual") as HTMLElement).innerText = this.tiempoSimulado.toFixed(2);
        }

        for (let i = this.particulas.length - 1; i >= 0; i--) {
            let p = this.particulas[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 400 * dt; 
            p.alfa -= 1.5 * dt; 

            if (p.alfa <= 0) {
                this.particulas.splice(i, 1);
            }
        }

        this.dibujar();

        if (this.enEjecucion || this.particulas.length > 0) {
            requestAnimationFrame((t) => this.loopPrincipal(t));
        }
    }

    private dibujar(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Dibujar Suelo con Gradiente
        let gradienteSuelo = this.ctx.createLinearGradient(0, this.sueloY, 0, this.sueloY + 20);
        gradienteSuelo.addColorStop(0, "#495057");
        gradienteSuelo.addColorStop(1, "#1a1d20");
        this.ctx.fillStyle = gradienteSuelo;
        this.ctx.fillRect(0, this.sueloY, this.canvas.width, 20);

        // 2. Soporte de la polea
        this.ctx.strokeStyle = "#343a40";
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(this.poleaX, 0);
        this.ctx.lineTo(this.poleaX, this.poleaY);
        this.ctx.stroke();

        // 3. Cuerdas
        this.ctx.save();
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = "#adb5bd";
        this.ctx.beginPath();
        this.ctx.moveTo(this.poleaX - this.radioPolea, this.poleaY);
        this.ctx.lineTo(this.poleaX - this.radioPolea, this.yM1);
        this.ctx.moveTo(this.poleaX + this.radioPolea, this.poleaY);
        this.ctx.lineTo(this.poleaX + this.radioPolea, this.yM2);
        this.ctx.stroke();
        this.ctx.restore();

        // 4. Dibujar la Polea con Volumen
        let gradientePolea = this.ctx.createRadialGradient(
            this.poleaX - 5, this.poleaY - 5, 2,
            this.poleaX, this.poleaY, this.radioPolea
        );
        gradientePolea.addColorStop(0, "#6c757d");
        gradientePolea.addColorStop(0.8, "#343a40");
        gradientePolea.addColorStop(1, "#212529");
        this.ctx.fillStyle = gradientePolea;
        this.ctx.beginPath();
        this.ctx.arc(this.poleaX, this.poleaY, this.radioPolea, 0, Math.PI * 2);
        this.ctx.fill();

        // Perno central
        this.ctx.fillStyle = "#ced4da";
        this.ctx.beginPath();
        this.ctx.arc(this.poleaX, this.poleaY, 5, 0, Math.PI * 2);
        this.ctx.fill();

        // --- 5. MASA 1 (Cilindro Rojo Alargado - Sube) ---
        this.ctx.save();
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetY = 4;

        let anchoCilindro = 34;  // Un poco más angosto para parecer esbelto
        let altoCilindro = 60;   // Más alargado hacia abajo
        let xM1 = this.poleaX - this.radioPolea - (anchoCilindro / 2);

        // Gradiente horizontal que simula la curvatura del cilindro (Luz desde el centro)
        let gradCilindroM1 = this.ctx.createLinearGradient(xM1, 0, xM1 + anchoCilindro, 0);
        gradCilindroM1.addColorStop(0, "#901a1a");   // Sombra izquierda
        gradCilindroM1.addColorStop(0.3, "#e64949"); // Color base
        gradCilindroM1.addColorStop(0.5, "#ff8787"); // Brillo reflejo central
        gradCilindroM1.addColorStop(0.8, "#e64949"); // Color base
        gradCilindroM1.addColorStop(1, "#5c1010");   // Sombra derecha profunda

        this.ctx.fillStyle = gradCilindroM1;
        this.ctx.beginPath();
        this.ctx.roundRect(xM1, this.yM1, anchoCilindro, altoCilindro, [4, 4, 8, 8]); // Bordes redondeados cilíndricos
        this.ctx.fill();

        // Texto m1 centrado
        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 13px sans-serif";
        this.ctx.shadowBlur = 0; this.ctx.shadowOffsetY = 0;
        this.ctx.fillText("m1", this.poleaX - this.radioPolea - 9, this.yM1 + (altoCilindro / 2) + 5);
        this.ctx.restore();

        // --- 6. MASA 2 (Cilindro Azul Alargado - Cae) ---
        this.ctx.save();
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetY = 4;

        let xM2 = this.poleaX + this.radioPolea - (anchoCilindro / 2);

        // Gradiente horizontal para el cilindro azul
        let gradCilindroM2 = this.ctx.createLinearGradient(xM2, 0, xM2 + anchoCilindro, 0);
        gradCilindroM2.addColorStop(0, "#1864ab");   // Sombra izquierda
        gradCilindroM2.addColorStop(0.3, "#228be6"); // Color base
        gradCilindroM2.addColorStop(0.5, "#74c0fc"); // Brillo reflejo central
        gradCilindroM2.addColorStop(0.8, "#228be6"); // Color base
        gradCilindroM2.addColorStop(1, "#0b3b66");   // Sombra derecha profunda

        this.ctx.fillStyle = gradCilindroM2;
        this.ctx.beginPath();
        this.ctx.roundRect(xM2, this.yM2, anchoCilindro, altoCilindro, [4, 4, 8, 8]);
        this.ctx.fill();

        // Texto m2 centrado
        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 13px sans-serif";
        this.ctx.shadowBlur = 0; this.ctx.shadowOffsetY = 0;
        this.ctx.fillText("m2", this.poleaX + this.radioPolea - 9, this.yM2 + (altoCilindro / 2) + 5);
        this.ctx.restore();

        // 7. Cota dinámica 'X'
        let baseM2 = this.yM2 + 60;
        let unidadTexto = this.sistemaUnidades === 'ALT' ? " cm" : " m";
        let distanciaRestanteFisica = this.alturaX - (0.5 * this.aceleracion * Math.pow(this.tiempoSimulado, 2));
        let valorMostrar = this.sistemaUnidades === 'ALT' ? distanciaRestanteFisica * 100 : distanciaRestanteFisica;

        this.ctx.strokeStyle = "#40c057"; 
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.poleaX + this.radioPolea + 40, baseM2);
        this.ctx.lineTo(this.poleaX + this.radioPolea + 40, this.sueloY);
        this.ctx.moveTo(this.poleaX + this.radioPolea + 33, baseM2);
        this.ctx.lineTo(this.poleaX + this.radioPolea + 47, baseM2);
        this.ctx.moveTo(this.poleaX + this.radioPolea + 33, this.sueloY);
        this.ctx.lineTo(this.poleaX + this.radioPolea + 47, this.sueloY);
        this.ctx.stroke();

        this.ctx.fillStyle = "#2b8a3e";
        this.ctx.font = "bold 13px sans-serif";
        let textoCota = `x = ${Math.max(0, valorMostrar).toFixed(1)}${unidadTexto}`;
        this.ctx.fillText(textoCota, this.poleaX + this.radioPolea + 54, baseM2 + (this.sueloY - baseM2) / 2 + 5);

        // --- 8. RENDERIZADO DE PARTÍCULAS DE IMPACTO ---
        this.particulas.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.alfa; // Aplicamos desvanecimiento individual
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
}

window.onload = () => { new MinijuegoPoleas(); };