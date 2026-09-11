// ====== URL DO APPS SCRIPT ======
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzEV93O9WDLkkjv2q_K7BrzZ3TMnfLvAcYFo6S1YTRvXXP_OF3kLcnk9bHL6jTQPn9M/exec";

// ====== FIREBASE CONFIG ======
const firebaseConfig = {
  apiKey: "AIzaSyBMfrhe57eSgCCfZriUoETbqVISsWgk9c0",
  authDomain: "album-casamento-dani-fe.firebaseapp.com",
  projectId: "album-casamento-dani-fe",
  storageBucket: "album-casamento-dani-fe.appspot.com",
  messagingSenderId: "182190323408",
  appId: "1:182190323408:web:6a83b55a075a824e2950d5"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Guarda o listener para poder cancelar depois
let listenerFirestore = null;

// ====== FUNÇÃO CAPITALIZAR ======
function capitalizarNome(nome) {
    return nome.split(' ').map(palavra => {
        if (palavra.length === 0) return '';
        return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
    }).join(' ');
}

// ====== ELEMENTOS ======
const overlay = document.getElementById('overlay');
const scene = document.getElementById('scene');
const inputNome = document.getElementById('inputNome');
const btnConfirmar = document.getElementById('btnConfirmarNome');
const mainContent = document.getElementById('main-content');

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const statusDiv = document.getElementById('status');
const btnCapturar = document.getElementById('btnCapturar');
const placeholder = document.getElementById('placeholderCamera');
const btnTrocarCamera = document.getElementById('btnTrocarCamera');
const cameraWrapper = document.getElementById('cameraWrapper');

const galeriaGrid = document.getElementById('galeriaGrid');
const modalImagem = document.getElementById('modalImagem');
const modalImg = document.getElementById('modalImg');
const fecharModal = document.getElementById('fecharModal');

const modalPreview = document.getElementById('modalPreview');
const previewImg = document.getElementById('previewImg');
const btnEnviarPreview = document.getElementById('btnEnviarPreview');
const btnFecharPreview = document.getElementById('btnFecharPreview');
const fecharPreview = document.getElementById('fecharPreview');
const prevFoto = document.getElementById('prevFoto');
const nextFoto = document.getElementById('nextFoto');
const contadorFotos = document.getElementById('contadorFotos');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const progressPercent = document.getElementById('progressPercent');
const spinnerLoading = document.getElementById('spinnerLoading');

const exposureControl = document.getElementById('exposureControl');
const exposureSlider = document.getElementById('exposureSlider');
const exposureValue = document.getElementById('exposureValue');

const btnUpload = document.getElementById('btnUpload');
const fileInput = document.getElementById('fileInput');
const contadorAlbum = document.getElementById('contadorFotosAlbum');

const coverElement = document.querySelector('.cover');
const btnSair = document.getElementById('btnSair');
const modalSair = document.getElementById('modalSair');
const btnCancelarSair = document.getElementById('btnCancelarSair');
const btnConfirmarSair = document.getElementById('btnConfirmarSair');
const pagesElement = document.querySelector('.pages');
const inputNomeEl = document.getElementById('inputNome');
const btnConfirmarEl = document.getElementById('btnConfirmarNome');

const filtrosContainer = document.getElementById('filtrosContainer');
let filtroAtual = 'none';
const filtrosMap = {
    'none': 'none',
    'grayscale': 'grayscale(100%)',
    'sepia': 'sepia(100%)',
    'vintage': 'sepia(50%) contrast(1.2) brightness(0.9) saturate(0.8)',
    'bright': 'brightness(1.3) contrast(1.1) saturate(0.9)'
};

// ====== VARIÁVEIS ======
let nomeConvidado = '';
let fotoCapturada = null;
let fotosParaEnviar = [];
let indiceAtual = 0;
let cameraPronta = false;
let streamAtual = null;
let facingMode = "environment";
let intervaloAutoReload = null;
let ultimosIds = new Set();
let primeiraCarga = true;
let carregandoGaleria = false;
let nomeConfirmado = false;
let ultimoCount = -1;

// ---- NOVAS VARIÁVEIS PARA NAVEGAÇÃO NA GALERIA ----
let fotosGaleria = [];          // Array com { url, fileId, nome }
let indiceGaleriaAtual = 0;

// ====== FUNÇÕES AUXILIARES ======
function formatarDataHora(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = String(data.getFullYear()).slice(-2);
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
}

function setupExposureControl() {
    exposureControl.style.display = 'flex';
    exposureSlider.value = 1.15;
    exposureValue.textContent = '1.15';
    video.style.filter = 'brightness(1.15)';

    let rafId = null;
    exposureSlider.oninput = function() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            const val = parseFloat(this.value);
            exposureValue.textContent = val.toFixed(2);
            video.style.filter = `brightness(${val})`;
            rafId = null;
        });
    };
}

// ====== NAVEGAÇÃO NO MODAL DA GALERIA ======
function abrirModalGaleria(index) {
    if (fotosGaleria.length === 0) return;
    indiceGaleriaAtual = index;
    atualizarModalGaleria();
    modalImagem.classList.add('active');
}

function atualizarModalGaleria() {
    const foto = fotosGaleria[indiceGaleriaAtual];
    if (!foto) return;
    const fileId = foto.fileId;
    const urlModal = `https://lh3.googleusercontent.com/d/${fileId}=w1200?authuser=0&t=${new Date().getTime()}`;
    modalImg.onerror = function() {
        this.onerror = null;
        this.src = `https://drive.usercontent.google.com/download?id=${fileId}&export=view&authuser=0&t=${new Date().getTime()}`;
    };
    modalImg.src = urlModal;
    document.getElementById('contadorGaleria').textContent = `${indiceGaleriaAtual+1}/${fotosGaleria.length}`;
}

// Eventos dos botões de navegação da galeria
document.getElementById('prevGaleria').addEventListener('click', function(e) {
    e.stopPropagation();
    if (fotosGaleria.length === 0) return;
    indiceGaleriaAtual = (indiceGaleriaAtual - 1 + fotosGaleria.length) % fotosGaleria.length;
    atualizarModalGaleria();
});

document.getElementById('nextGaleria').addEventListener('click', function(e) {
    e.stopPropagation();
    if (fotosGaleria.length === 0) return;
    indiceGaleriaAtual = (indiceGaleriaAtual + 1) % fotosGaleria.length;
    atualizarModalGaleria();
});

// Fechar modal da galeria
modalImagem.addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('active');
    }
});
fecharModal.addEventListener('click', function() {
    modalImagem.classList.remove('active');
});

// ====== LISTENER DE TECLADO (ATUALIZADO) ======
document.addEventListener('keydown', function(e) {
    // Se o modal da galeria estiver ativo, navega pelas fotos da galeria
    if (modalImagem.classList.contains('active')) {
        if (e.key === 'ArrowLeft') {
            document.getElementById('prevGaleria').click();
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            document.getElementById('nextGaleria').click();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            modalImagem.classList.remove('active');
        }
        return;
    }

    // Se o modal de prévia estiver ativo, navega pelas fotos da prévia
    if (modalPreview.classList.contains('active')) {
        if (e.key === 'ArrowLeft') {
            document.getElementById('prevFoto').click();
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            document.getElementById('nextFoto').click();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            modalPreview.classList.remove('active');
        }
        return;
    }
});

// ====== FUNÇÃO LIBERAR FORMULÁRIO ======
function liberarFormulario() {
    inputNomeEl.disabled = false;
    btnConfirmarEl.disabled = false;
    pagesElement.classList.add('interactive');
    coverElement.removeEventListener('animationend', liberarFormulario);
}

coverElement.addEventListener('animationend', liberarFormulario);

setTimeout(() => {
    if (!pagesElement.classList.contains('interactive')) {
        liberarFormulario();
    }
}, 5000);

function setsIguais(setA, setB) {
    if (setA.size !== setB.size) return false;
    for (let item of setA) {
        if (!setB.has(item)) return false;
    }
    return true;
}

// ====== LISTENER EM TEMPO REAL ======
function iniciarListenerFirestore() {
    if (listenerFirestore) return;   // já está rodando

    listenerFirestore = db.collection('fotos')
        .orderBy('created', 'desc')
        .onSnapshot(snapshot => {
            // Monta o mesmo formato que o resto do código espera
            fotosGaleria = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    url: d.url,
                    fileId: d.fileId,
                    nome: d.nome || 'Foto',
                    created: d.created || 0
                };
            }).filter(f => f.fileId);

            fotosGaleria.sort((a, b) => (b.created || 0) - (a.created || 0));

            renderizarGaleria(fotosGaleria);
            contadorAlbum.textContent = `(${fotosGaleria.length})`;

            // console.log('🔴 Firestore atualizou:', fotosGaleria.length, 'fotos');
        }, erro => {
            // console.error('❌ Erro no listener Firestore:', erro);
        });
}

// ====== RENDERIZA A GALERIA (extraída de carregarGaleria) ======
function renderizarGaleria(fotos) {
    if (!fotos || fotos.length === 0) {
        galeriaGrid.innerHTML = '<div class="galeria-vazio">📭 Nenhuma foto enviada ainda. Seja o primeiro(a)!</div>';
        return;
    }

    galeriaGrid.innerHTML = '';
    fotos.forEach((foto, index) => {
        const fileId = foto.fileId;
        const div = document.createElement('div');
        div.className = 'galeria-item';
        div.dataset.index = index;

        const imgEl = document.createElement('img');
        imgEl.src = `https://lh3.googleusercontent.com/d/${fileId}=s400?authuser=0&t=${new Date().getTime()}`;
        imgEl.alt = foto.nome || `Foto ${index + 1}`;
        imgEl.loading = 'lazy';

        div.addEventListener('click', function(e) {
            e.stopPropagation();
            abrirModalGaleria(parseInt(this.dataset.index));
        });

        div.appendChild(imgEl);
        galeriaGrid.appendChild(div);
    });
}

// ====== FILTROS ======
function aplicarFiltroPreview() {
    const filtroCSS = filtrosMap[filtroAtual] || 'none';
    previewImg.style.filter = filtroCSS;
}

function selecionarFiltro(filtroId) {
    filtroAtual = filtroId;
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.classList.toggle('ativo', btn.dataset.filtro === filtroId);
    });
    aplicarFiltroPreview();
}

filtrosContainer.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-filtro');
    if (!btn) return;
    const filtroId = btn.dataset.filtro;
    if (filtroId) {
        selecionarFiltro(filtroId);
    }
});

// ====== PRÉVIA MÚLTIPLA ======
function atualizarPreviewMulti() {
    if (fotosParaEnviar.length === 0) {
        previewImg.src = '';
        contadorFotos.textContent = '0/0';
        prevFoto.style.display = 'none';
        nextFoto.style.display = 'none';
        return;
    }
    previewImg.src = fotosParaEnviar[indiceAtual];
    contadorFotos.textContent = `${indiceAtual + 1}/${fotosParaEnviar.length}`;
    prevFoto.style.display = fotosParaEnviar.length > 1 ? 'flex' : 'none';
    nextFoto.style.display = fotosParaEnviar.length > 1 ? 'flex' : 'none';
    aplicarFiltroPreview();
}

function navegarPrev() {
    if (fotosParaEnviar.length === 0) return;
    indiceAtual = (indiceAtual - 1 + fotosParaEnviar.length) % fotosParaEnviar.length;
    atualizarPreviewMulti();
}

function navegarNext() {
    if (fotosParaEnviar.length === 0) return;
    indiceAtual = (indiceAtual + 1) % fotosParaEnviar.length;
    atualizarPreviewMulti();
}

prevFoto.addEventListener('click', navegarPrev);
nextFoto.addEventListener('click', navegarNext);

function cancelarEnvio() {
    modalPreview.classList.remove('active');
    fotoCapturada = null;
    fotosParaEnviar = [];
    indiceAtual = 0;
    fileInput.value = '';
    btnEnviarPreview.innerHTML = '💌 Enviar com Amor';
    statusDiv.innerHTML = `📸 ${nomeConvidado}, tire outra foto ou selecione arquivos!`;
    statusDiv.className = "info";
    progressContainer.style.display = 'none';
    progressBar.value = 0;
    progressLabel.textContent = 'Enviando 0/0';
    progressPercent.textContent = '0%';
    setButtonsVisible(true);
    selecionarFiltro('none');
    spinnerLoading.classList.add('hidden');
    progressContainer.classList.remove('carregando');
}

fecharPreview.addEventListener('click', cancelarEnvio);
modalPreview.addEventListener('click', function(e) {
    if (e.target === this) {
        cancelarEnvio();
    }
});
btnFecharPreview.addEventListener('click', cancelarEnvio);

// ===================================================================
// ===== FILA DE UPLOAD COM RETRY E CONCORRÊNCIA LIMITADA ============
// ===================================================================
const FILA_UPLOAD = {
    itens: [],
    processando: 0,
    MAX_CONCORRENTES: 3,    // 3 uploads simultâneos por cliente
    MAX_TENTATIVAS: 1,
};

function enfileirarUpload(item) {
    return new Promise((resolve, reject) => {
        FILA_UPLOAD.itens.push({ item, resolve, reject, tentativa: 1 });
        atualizarStatusFila();
        processarFila();
    });
}

async function processarFila() {
    if (FILA_UPLOAD.processando >= FILA_UPLOAD.MAX_CONCORRENTES) return;
    if (FILA_UPLOAD.itens.length === 0) return;

    const tarefa = FILA_UPLOAD.itens.shift();
    FILA_UPLOAD.processando++;
    atualizarStatusFila();

    try {
        const resultado = await executarUpload(tarefa.item);
        tarefa.resolve(resultado);
    } catch (erro) {
        if (tarefa.tentativa < FILA_UPLOAD.MAX_TENTATIVAS) {
            const espera = 1000 * Math.pow(2, tarefa.tentativa - 1); // 1s, 2s, 4s
            console.warn(`⚠️ Tentativa ${tarefa.tentativa} falhou. Retry em ${espera}ms...`);
            await new Promise(r => setTimeout(r, espera));
            tarefa.tentativa++;
            FILA_UPLOAD.itens.unshift(tarefa);
        } else {
            console.error(`❌ Upload falhou após ${FILA_UPLOAD.MAX_TENTATIVAS} tentativas`);
            tarefa.reject(erro);
        }
    } finally {
        FILA_UPLOAD.processando--;
        atualizarStatusFila();
        processarFila();
    }
}

async function executarUpload(item) {
    const formData = new FormData();
    formData.append('imageData', item.imagemFinal);
    formData.append('fileName', item.nomeArquivo);
    formData.append('nomeConvidado', item.nomeConvidado);

    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('HTTP ' + response.status);
    }

    const result = await response.json();
    if (result.status !== 'sucesso') {
        throw new Error(result.message || 'Erro no servidor');
    }
    return result;
}

// Mostra o status da fila no console (opcional, ajuda a debugar)
function atualizarStatusFila() {
    const total = FILA_UPLOAD.itens.length + FILA_UPLOAD.processando;
    if (total > 0) {
        // console.log(`📋 Fila: ${FILA_UPLOAD.processando} enviando, ${FILA_UPLOAD.itens.length} aguardando`);
    }
}

// ====== CONFETES ======
function soltarConfetes() {
    if (typeof confetti !== 'function') {
        // console.warn('Biblioteca confetti não carregada.');
        return;
    }
    confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        startVelocity: 30,
        colors: ['#d4af37', '#f7d875', '#ffb6c1', '#ff69b4', '#ff1493', '#fff']
    });
    setTimeout(() => {
        confetti({
            particleCount: 100,
            spread: 60,
            origin: { y: 0.5, x: 0.2 },
            colors: ['#d4af37', '#ffb6c1', '#ff69b4']
        });
        confetti({
            particleCount: 100,
            spread: 60,
            origin: { y: 0.5, x: 0.8 },
            colors: ['#d4af37', '#ffb6c1', '#ff69b4']
        });
    }, 150);
    setTimeout(() => {
        confetti({
            particleCount: 80,
            spread: 100,
            origin: { y: 0.3 },
            colors: ['#d4af37', '#fff', '#ffb6c1']
        });
    }, 400);
}

// ====== BARRA DE PROGRESSO ======
function atualizarProgresso(valor, label, percent, mostrarSpinner = false) {
    progressBar.value = valor;
    progressLabel.textContent = label || `Enviando ${Math.round(valor)}%`;
    progressPercent.textContent = (percent !== undefined) ? percent : `${Math.round(valor)}%`;

    if (mostrarSpinner) {
        spinnerLoading.classList.remove('hidden');
        progressContainer.classList.add('carregando');
    } else {
        spinnerLoading.classList.add('hidden');
        progressContainer.classList.remove('carregando');
    }
}

function setButtonsVisible(visible) {
    if (visible) {
        btnEnviarPreview.style.display = 'flex';
        btnFecharPreview.style.display = 'flex';
        btnEnviarPreview.disabled = false;
        btnFecharPreview.disabled = false;
        filtrosContainer.style.display = 'flex';
    } else {
        btnEnviarPreview.style.display = 'none';
        btnFecharPreview.style.display = 'none';
        btnEnviarPreview.disabled = true;
        btnFecharPreview.disabled = true;
        filtrosContainer.style.display = 'none';
    }
}

// ====== APLICAR FILTRO NO CANVAS ======
function aplicarFiltroCanvas(dataURL, filtroId) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d');
            const filtroCSS = filtrosMap[filtroId] || 'none';
            ctx.filter = filtroCSS;
            ctx.drawImage(img, 0, 0);
            resolve(c.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = function() {
            resolve(dataURL);
        };
        img.src = dataURL;
    });
}

// ====== ANIMAÇÃO DE PROGRESSO ======
function animarProgresso(de, para, duracao, label) {
    return new Promise((resolve) => {
        const startTime = performance.now();
        const startVal = de;
        const diff = para - de;

        function step(timestamp) {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duracao, 1);
            const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
            const currentVal = startVal + diff * eased;
            const percent = Math.round(currentVal);
            const labelFinal = label || `Enviando... ${percent}%`;
            atualizarProgresso(currentVal, labelFinal, `${percent}%`, true);
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                const finalLabel = label || `Enviando... ${Math.round(para)}%`;
                atualizarProgresso(para, finalLabel, `${Math.round(para)}%`, true);
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

// ====== ENVIO CÂMERA ======
async function enviarFotoCamera() {

    if (btnEnviarPreview.disabled) return;
        btnEnviarPreview.disabled = true;

    if (!fotoCapturada) {
        alert("Nenhuma foto para enviar.");
        return;
    }

    setButtonsVisible(false);
    btnEnviarPreview.textContent = "⏳ Enviando...";

    progressContainer.style.display = 'block';
    atualizarProgresso(0, 'Preparando...', '0%', true);

    await animarProgresso(0, 90, 6000, 'Enviando...');

    const imagemFinal = await aplicarFiltroCanvas(fotoCapturada, filtroAtual);
    const agora = new Date();
    const nomeArquivo = `Capturado por ${nomeConvidado}.png`;

   try {
        const result = await enfileirarUpload({
            imagemFinal,
            nomeArquivo,
            nomeConvidado
        });

        await animarProgresso(90, 100, 500, '✅ Concluído!');

        if (result.status === "sucesso") {
            statusDiv.innerHTML = `✅ Foto de ${nomeConvidado} enviada com sucesso! Muito obrigado(a)! 💖`;
            statusDiv.className = "sucesso";

            modalPreview.classList.remove('active');
            fotoCapturada = null;
            fileInput.value = '';

            btnEnviarPreview.innerHTML = '💌 Enviar com Amor';

            progressContainer.style.display = 'none';
            progressBar.value = 0;
            progressLabel.textContent = 'Enviando 0/0';
            progressPercent.textContent = '0%';
            setButtonsVisible(true);
            selecionarFiltro('none');
            spinnerLoading.classList.add('hidden');
            progressContainer.classList.remove('carregando');

            await new Promise(resolve => setTimeout(resolve, 300));
            soltarConfetes();

        } else {
            throw new Error(result.message || "Erro inesperado.");
        }
    } catch (err) {
        await animarProgresso(90, 100, 500, '❌ Falha');
        statusDiv.innerHTML = "❌ Erro ao enviar. Tente novamente.";
        statusDiv.className = "erro";
        btnEnviarPreview.innerHTML = '💌 Enviar com Amor';
        progressContainer.style.display = 'none';
        progressBar.value = 0;
        progressLabel.textContent = 'Enviando 0/0';
        progressPercent.textContent = '0%';
        setButtonsVisible(true);
        spinnerLoading.classList.add('hidden');
        progressContainer.classList.remove('carregando');
    }
}

// ====== ENVIO MÚLTIPLO ======
async function enviarMultiplasFotos() {

    if (btnEnviarPreview.disabled) return;
        btnEnviarPreview.disabled = true;

    if (fotosParaEnviar.length === 0) {
        alert("Nenhuma foto para enviar.");
        return;
    }

    setButtonsVisible(false);
    btnEnviarPreview.textContent = "⏳ Enviando...";

    progressContainer.style.display = 'block';
    const total = fotosParaEnviar.length;
    atualizarProgresso(0, `Preparando 0/${total}`, '0%', true);
    await new Promise(resolve => setTimeout(resolve, 100));

    let sucesso = 0;
    let falhas = 0;

    for (let i = 0; i < total; i++) {
        const imgDataOriginal = fotosParaEnviar[i];
        statusDiv.innerHTML = `📤 Enviando foto ${i+1} de ${total}...`;
        statusDiv.className = "loading";

        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 400));
            atualizarProgresso(0, `Preparando foto ${i+1}/${total}`, '0%', true);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const label = `Enviando foto ${i+1}/${total}`;
        await animarProgresso(0, 90, 6000, label);

        try {
            
            const imagemFinal = await aplicarFiltroCanvas(imgDataOriginal, filtroAtual);
            const agora = new Date();
            const nomeArquivo = `Capturado por ${nomeConvidado}.png`;

            await enfileirarUpload({
                imagemFinal,
                nomeArquivo,
                nomeConvidado
            });
            sucesso++;
        } catch (err) {
            falhas++;
            console.error(`Erro ao enviar foto ${i+1}:`, err);
        }

        await animarProgresso(90, 100, 500, `✅ Foto ${i+1}/${total} concluída!`);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    fotosParaEnviar = [];
    indiceAtual = 0;
    fileInput.value = '';
    btnEnviarPreview.innerHTML = '💌 Enviar com Amor';

    modalPreview.classList.remove('active');

    progressContainer.style.display = 'none';
    progressBar.value = 0;
    progressLabel.textContent = 'Enviando 0/0';
    progressPercent.textContent = '0%';
    setButtonsVisible(true);
    selecionarFiltro('none');
    spinnerLoading.classList.add('hidden');
    progressContainer.classList.remove('carregando');

    await new Promise(resolve => setTimeout(resolve, 300));

    if (falhas === 0 && sucesso > 0) {
        if (sucesso == 1) {
            statusDiv.innerHTML = `✅ Foto de ${nomeConvidado} enviada com sucesso! Muito obrigado(a)! 💖`;
            statusDiv.className = "sucesso";
        } else {
            statusDiv.innerHTML = `✅ As ${sucesso} fotos foram enviadas com sucesso! Muito obrigado(a)! 💖`;
            statusDiv.className = "sucesso";
        }
        soltarConfetes();
    } else if (sucesso > 0 && falhas > 0) {
        statusDiv.innerHTML = `⚠️ ${sucesso} foto(s) enviada(s), ${falhas} falha(s). Tente novamente mais tarde.`;
        statusDiv.className = "erro";
    } else {
        statusDiv.innerHTML = "❌ Erro ao enviar as fotos. Tente novamente.";
        statusDiv.className = "erro";
    }
}

function handleEnviar() {
    if (fotoCapturada) {
        enviarFotoCamera();
    } else if (fotosParaEnviar.length > 0) {
        enviarMultiplasFotos();
    } else {
        alert("Nenhuma foto para enviar.");
    }
}

// ====== UPLOAD ======
btnUpload.addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxFiles = 3;
    const filesToProcess = Array.from(files).slice(0, maxFiles);

    for (let file of filesToProcess) {
        if (!file.type.startsWith('image/')) {
            statusDiv.innerHTML = "❌ Por favor, selecione apenas imagens.";
            statusDiv.className = "erro";
            fileInput.value = '';
            return;
        }
    }

    fotoCapturada = null;
    fotosParaEnviar = [];
    indiceAtual = 0;
    let lidos = 0;

    filesToProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            fotosParaEnviar.push(event.target.result);
            lidos++;
            if (lidos === filesToProcess.length) {
                if (fotosParaEnviar.length > 0) {
                    indiceAtual = 0;
                    atualizarPreviewMulti();
                    modalPreview.classList.add('active');
                    statusDiv.innerHTML = `📸 ${nomeConvidado}, você selecionou ${fotosParaEnviar.length} foto(s). Navegue e envie!`;
                    statusDiv.className = "info";
                    progressContainer.style.display = 'none';
                    progressBar.value = 0;
                    setButtonsVisible(true);
                    btnEnviarPreview.innerHTML = '💌 Enviar com Amor';
                    selecionarFiltro('none');
                    spinnerLoading.classList.add('hidden');
                    progressContainer.classList.remove('carregando');
                }
            }
        };
        reader.onerror = function() {
            statusDiv.innerHTML = "❌ Erro ao ler um dos arquivos. Tente novamente.";
            statusDiv.className = "erro";
            fileInput.value = '';
        };
        reader.readAsDataURL(file);
    });

    if (filesToProcess.length === 0) {
        fileInput.value = '';
    }
});

// ====== OVERLAY - FORMULÁRIO ======
inputNome.addEventListener('input', function() {
    this.value = this.value.replace(/[^\p{L}\s]/gu, '');
    if (this.value.length > 0) {
        const capitalizado = capitalizarNome(this.value);
        this.value = capitalizado;
    }
    btnConfirmar.disabled = (this.value.trim() === '');
});

function confirmarNome() {
    const nome = inputNome.value.trim();
    if (nome === '') return;

    nomeConvidado = capitalizarNome(nome);
    nomeConfirmado = true;

    // 💾 Salva o nome para persistir após recarregar a página
    try {
        localStorage.setItem('nomeConvidadoAlbum', nomeConvidado);
    } catch (e) { /* ignora se localStorage indisponível */ }

    overlay.classList.add('hidden');
    mainContent.classList.add('visible');
    statusDiv.innerHTML = `💖 Olá, ${nomeConvidado}! Toque na área da câmera ou faça upload.`;
    statusDiv.className = "info";

    iniciarListenerFirestore();
}

// ====== PERSISTÊNCIA DO NOME (LOGIN) ======
function verificarNomeSalvo() {
    let nomeSalvo = null;
    try {
        nomeSalvo = localStorage.getItem('nomeConvidadoAlbum');
    } catch (e) { /* ignora */ }

    if (nomeSalvo && nomeSalvo.trim() !== '') {
        nomeConvidado = nomeSalvo;
        nomeConfirmado = true;

        overlay.classList.add('hidden');
        mainContent.classList.add('visible');
        statusDiv.innerHTML = `💖 Bem-vindo(a) de volta, ${nomeConvidado}! Toque na câmera ou faça upload.`;
        statusDiv.className = "info";

        iniciarListenerFirestore();
    }
}

// ====== ABRIR MODAL DE SAIR ======
function abrirModalSair() {
    modalSair.classList.add('active');
}

// ====== CONFIRMAR SAÍDA (executa a limpeza) ======
function sair() {
    modalSair.classList.remove('active');

    try {
        localStorage.removeItem('nomeConvidadoAlbum');
    } catch (e) { /* ignora */ }

    nomeConvidado = '';
    nomeConfirmado = false;

    // Para a câmera, se estiver ativa
    if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop());
        streamAtual = null;
    }
    cameraPronta = false;
    facingMode = "environment";
    if (video) {
        video.srcObject = null;
        video.style.display = 'none';
        video.classList.remove('espelhado');
    }
    placeholder.style.display = 'flex';
    btnCapturar.style.display = 'none';
    btnTrocarCamera.style.display = 'none';
    exposureControl.style.display = 'none';

    // Para o auto-reload da galeria
    if (listenerFirestore) {
        listenerFirestore();
        listenerFirestore = null;
    }

    // Fecha modais se estiverem abertos
    modalPreview.classList.remove('active');
    modalImagem.classList.remove('active');

    // Limpa estados temporários
    fotoCapturada = null;
    fotosParaEnviar = [];
    indiceAtual = 0;
    if (fileInput) fileInput.value = '';
    filtroAtual = 'none';
    if (filtrosContainer) {
        document.querySelectorAll('.btn-filtro').forEach(btn => {
            btn.classList.toggle('ativo', btn.dataset.filtro === 'none');
        });
    }

    // Volta para a tela do livro / formulário
    overlay.classList.remove('hidden');
    mainContent.classList.remove('visible');

    // Reset do formulário
    inputNome.value = '';
    btnConfirmar.disabled = true;

    statusDiv.innerHTML = "💖 Digite seu nome para começar";
    statusDiv.className = "info";
}

// ====== EVENTO DO BOTÃO SAIR ======
if (btnSair) {
    btnSair.addEventListener('click', abrirModalSair);
    btnCancelarSair.addEventListener('click', () => modalSair.classList.remove('active'));
    btnConfirmarSair.addEventListener('click', sair);

    // Fecha o modal ao clicar fora do card
    modalSair.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });

    // Fecha o modal com a tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalSair.classList.contains('active')) {
            modalSair.classList.remove('active');
        }
    });
}

btnConfirmar.addEventListener('click', confirmarNome);
inputNome.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        confirmarNome();
    }
});

// ====== CÂMERA ======
async function iniciarCamera() {
    if (cameraPronta) return true;

    try {
        statusDiv.innerHTML = "⏳ Solicitando permissão da câmera...";
        statusDiv.className = "loading";

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                width: { ideal: 4000 },
                height: { ideal: 3000 }
            }
        });

        streamAtual = stream;
        video.srcObject = stream;

        placeholder.style.display = 'none';
        video.style.display = 'block';

        cameraPronta = true;
        statusDiv.innerHTML = `✅ Câmera pronta, ${nomeConvidado}! Toque no botão para tirar a foto. 😊`;
        statusDiv.className = "sucesso";

        btnCapturar.style.display = 'flex';
        btnTrocarCamera.style.display = 'flex';
        setupExposureControl();

        aplicarEspelhamento();

        return true;

    } catch (err) {
        let msg = "Permita o acesso à câmera no navegador.";
        if (err.message.includes("denied")) {
            msg = "Permissão negada! Vá nas configurações do site e permita a câmera.";
        } else if (err.message.includes("not found")) {
            msg = "Nenhuma câmera encontrada no seu dispositivo.";
        }
        statusDiv.innerHTML = "❌ " + msg;
        statusDiv.className = "erro";
        btnCapturar.disabled = false;
        return false;
    }
}

async function trocarCamera() {
    if (!cameraPronta) return;

    if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop());
    }

    facingMode = (facingMode === "environment") ? "user" : "environment";

    try {
        const novoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 4000 },
                height: { ideal: 3000 }
            }
        });

        streamAtual = novoStream;
        video.srcObject = novoStream;

        exposureSlider.value = 1.15;
        exposureValue.textContent = '1.15';
        video.style.filter = 'brightness(1.15)';

        aplicarEspelhamento();

    } catch (err) {
        statusDiv.innerHTML = "❌ Erro ao trocar câmera: " + err.message;
        statusDiv.className = "erro";
    }
}

function aplicarEspelhamento() {
    if (facingMode === 'user') {
        video.classList.add('espelhado');
    } else {
        video.classList.remove('espelhado');
    }
}

async function capturarFoto() {
    if (!cameraPronta) {
        const sucesso = await iniciarCamera();
        if (!sucesso) return;
        statusDiv.innerHTML = `✅ Câmera pronta, ${nomeConvidado}! Toque no botão para tirar a foto.`;
        statusDiv.className = "sucesso";
        return;
    }
    tirarFotoNow();
}

function tirarFotoNow() {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        statusDiv.innerHTML = "⏳ Aguarde a câmera estabilizar...";
        statusDiv.className = "loading";
        setTimeout(() => capturarFoto(), 500);
        return;
    }

    const context = canvas.getContext('2d');
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;

    const exp = parseFloat(exposureSlider.value);
    context.filter = `brightness(${exp})`;
    context.drawImage(video, 0, 0, w, h);
    context.filter = 'none';

    fotosParaEnviar = [];
    fotoCapturada = canvas.toDataURL('image/jpeg', 0.85);
    previewImg.src = fotoCapturada;
    contadorFotos.textContent = '1/1';
    prevFoto.style.display = 'none';
    nextFoto.style.display = 'none';
    modalPreview.classList.add('active');
    setButtonsVisible(true);
    btnEnviarPreview.innerHTML = '💌 Enviar com Amor';
    selecionarFiltro('none');
    progressContainer.style.display = 'none';
    spinnerLoading.classList.add('hidden');
    progressContainer.classList.remove('carregando');
}

cameraWrapper.addEventListener('click', function(e) {
    if (e.target.closest('button')) return;
    if (!cameraPronta) {
        capturarFoto();
    }
});

btnCapturar.addEventListener('click', capturarFoto);
btnTrocarCamera.addEventListener('click', trocarCamera);
btnEnviarPreview.addEventListener('click', handleEnviar);


window.addEventListener('beforeunload', function() {
    if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop());
    }
    // Cancela o listener do Firestore (libera a conexão WebSocket)
    if (listenerFirestore) {
        listenerFirestore();
        listenerFirestore = null;
    }
});

statusDiv.innerHTML = "💖 Digite seu nome para começar";
statusDiv.className = "info";

// Verifica se já existe um nome salvo (mantém o login após recarregar)
verificarNomeSalvo();