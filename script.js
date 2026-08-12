// ====== URL DO APPS SCRIPT ======
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDmp8Q1b5R4hjvf20oVY6MhKo9Vdx37ZHVJ_PNru0QQkF17w6M55Zp3MsvTVKglUbf/exec";

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

// ====== GALERIA ======
async function carregarGaleria(forcar = false) {
    if (carregandoGaleria) return;
    carregandoGaleria = true;
    try {
        const response = await fetch(SCRIPT_URL, { method: 'GET' });
        const data = await response.json();

        if (data.status === "sucesso" && data.images && data.images.length > 0) {
            const novosIds = new Set();
            data.images.forEach(img => {
                const match = img.url.match(/[?&]id=([^&]+)/);
                if (match) novosIds.add(match[1]);
            });

            if (!forcar && primeiraCarga === false && setsIguais(ultimosIds, novosIds)) {
                return;
            }

            ultimosIds = novosIds;
            primeiraCarga = false;

            galeriaGrid.innerHTML = '';
            data.images.forEach((img, index) => {
                const fileIdMatch = img.url.match(/[?&]id=([^&]+)/);
                const fileId = fileIdMatch ? fileIdMatch[1] : null;
                if (!fileId) return;

                const div = document.createElement('div');
                div.className = 'galeria-item';

                const imgEl = document.createElement('img');
                imgEl.src = `https://lh3.googleusercontent.com/d/${fileId}=s400?authuser=0&t=${new Date().getTime()}`;
                imgEl.alt = img.name || `Foto ${index + 1}`;
                imgEl.loading = 'lazy';

                div.addEventListener('click', function() {
                    const urlModal = `https://lh3.googleusercontent.com/d/${fileId}=w1200?authuser=0&t=${new Date().getTime()}`;
                    modalImg.onerror = function() {
                        this.onerror = null;
                        this.src = `https://drive.usercontent.google.com/download?id=${fileId}&export=view&authuser=0&t=${new Date().getTime()}`;
                    };
                    modalImg.src = urlModal;
                    modalImagem.classList.add('active');
                });

                div.appendChild(imgEl);
                galeriaGrid.appendChild(div);
            });

            const totalFotos = data.images.length;
            contadorAlbum.textContent = `(${totalFotos})`;

        } else {
            if (galeriaGrid.innerHTML !== '<div class="galeria-vazio">📭 Nenhuma foto enviada ainda. Seja o primeiro(a)!</div>') {
                galeriaGrid.innerHTML = '<div class="galeria-vazio">📭 Nenhuma foto enviada ainda. Seja o primeiro(a)!</div>';
            }
            ultimosIds = new Set();
            contadorAlbum.textContent = '(0)';
        }
    } catch (error) {
        console.error('❌ Erro ao carregar galeria:', error);
        galeriaGrid.innerHTML = '<div class="galeria-vazio">❌ Erro ao carregar fotos. Aguarde...</div>';
        contadorAlbum.textContent = '(0)';
    } finally {
        carregandoGaleria = false;
    }
}

function liberarFormulario() {
    // Habilita os campos
    inputNomeEl.disabled = false;
    // O botão será habilitado pelo próprio evento 'input', mas podemos remover o atributo
    btnConfirmarEl.disabled = false;
    // Libera os cliques
    pagesElement.classList.add('interactive');

    // Remove o listener para não executar mais de uma vez
    coverElement.removeEventListener('animationend', liberarFormulario);
}

// Escuta o fim da animação da capa
coverElement.addEventListener('animationend', liberarFormulario);

// Fallback por segurança (caso o evento não dispare)
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

function atualizarGaleria() {
    ultimosIds = new Set();
    primeiraCarga = true;
    setTimeout(() => carregarGaleria(true), 1500);
}

// ====== RECARREGA IMEDIATA E REINICIA AUTO-RELOAD ======
function recarregarGaleriaAgora() {
    pararAutoReload();
    carregarGaleria(true);
    setTimeout(() => {
        iniciarAutoReload(3000);
    }, 500);
}

function iniciarAutoReload(intervaloMs) {
    if (intervaloAutoReload) clearInterval(intervaloAutoReload);
    intervaloAutoReload = setInterval(() => {
        carregarGaleria(false);
    }, intervaloMs);
}

function pararAutoReload() {
    if (intervaloAutoReload) {
        clearInterval(intervaloAutoReload);
        intervaloAutoReload = null;
    }
}

// ====== MODAL GALERIA ======
modalImagem.addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('active');
    }
});
fecharModal.addEventListener('click', function() {
    modalImagem.classList.remove('active');
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        modalImagem.classList.remove('active');
        modalPreview.classList.remove('active');
    }
});

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

// ====== CONFETES ======
function soltarConfetes() {
    if (typeof confetti !== 'function') {
        console.warn('Biblioteca confetti não carregada.');
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
            resolve(c.toDataURL('image/png'));
        };
        img.onerror = function() {
            resolve(dataURL);
        };
        img.src = dataURL;
    });
}

// ====== ANIMAÇÃO DE PROGRESSO (sem percentual no label) ======
function animarProgresso(de, para, duracao, label) {
    return new Promise((resolve) => {
        const startTime = performance.now();
        const startVal = de;
        const diff = para - de;

        function step(timestamp) {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duracao, 1);
            // Easing ease-in-out suave
            const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
            const currentVal = startVal + diff * eased;
            const percent = Math.round(currentVal);
            // Só exibe o label sem percentual se foi fornecido, senão usa o padrão com percentual
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

// ====== ENVIO CÂMERA (uma única foto) ======
async function enviarFotoCamera() {
    if (!fotoCapturada) {
        alert("Nenhuma foto para enviar.");
        return;
    }

    setButtonsVisible(false);
    btnEnviarPreview.textContent = "⏳ Enviando...";

    progressContainer.style.display = 'block';
    atualizarProgresso(0, 'Preparando...', '0%', true);

    // Animação mais lenta: 6 segundos para ir de 0 a 90%
    await animarProgresso(0, 90, 6000, 'Enviando...');

    // Envia a foto
    const imagemFinal = await aplicarFiltroCanvas(fotoCapturada, filtroAtual);
    const agora = new Date();
    const nomeArquivo = `Capturado por ${nomeConvidado}.png`;

    const formData = new FormData();
    formData.append('imageData', imagemFinal);
    formData.append('fileName', nomeArquivo);
    formData.append('nomeConvidado', nomeConvidado);

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
        });

        // Quando a resposta chegar, vai rapidamente a 100% (0.5s)
        await animarProgresso(90, 100, 500, '✅ Concluído!');

        const result = await response.json();

        if (result.status === "sucesso") {
            statusDiv.innerHTML = `✅ Foto de ${nomeConvidado} enviada com sucesso! Muito obrigado(a)! 💖`;
            statusDiv.className = "sucesso";

            modalPreview.classList.remove('active');
            fotoCapturada = null;
            fileInput.value = '';
            recarregarGaleriaAgora();

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

// ====== ENVIO MÚLTIPLO (cada foto com seu ciclo contínuo e mais lento) ======
async function enviarMultiplasFotos() {
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

    // Loop por cada foto
    for (let i = 0; i < total; i++) {
        const imgDataOriginal = fotosParaEnviar[i];
        statusDiv.innerHTML = `📤 Enviando foto ${i+1} de ${total}...`;
        statusDiv.className = "loading";

        // Se não for a primeira, reseta a barra para 0% com um pequeno delay
        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 400));
            atualizarProgresso(0, `Preparando foto ${i+1}/${total}`, '0%', true);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Anima de 0 a 90% em 6 segundos (mais lento) - label sem percentual
        const label = `Enviando foto ${i+1}/${total}`;
        await animarProgresso(0, 90, 6000, label);

        // Envia a foto (pode demorar)
        try {
            const imagemFinal = await aplicarFiltroCanvas(imgDataOriginal, filtroAtual);
            const agora = new Date();
            const nomeArquivo = `Capturado por ${nomeConvidado}.png`;

            const formData = new FormData();
            formData.append('imageData', imagemFinal);
            formData.append('fileName', nomeArquivo);
            formData.append('nomeConvidado', nomeConvidado);

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.status === "sucesso") {
                sucesso++;
            } else {
                falhas++;
            }
        } catch (err) {
            falhas++;
            console.error(`Erro ao enviar foto ${i+1}:`, err);
        }

        // Após a resposta, vai a 100% rapidamente (0.5s)
        await animarProgresso(90, 100, 500, `✅ Foto ${i+1}/${total} concluída!`);
        // Pequena pausa antes da próxima
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Todas as fotos foram processadas
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

    recarregarGaleriaAgora();

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
    overlay.classList.add('hidden');
    mainContent.classList.add('visible');
    statusDiv.innerHTML = `💖 Olá, ${nomeConvidado}! Toque na área da câmera ou faça upload.`;
    statusDiv.className = "info";

    carregarGaleria(true);
    iniciarAutoReload(3000);
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
                width: { ideal: 1920 },
                height: { ideal: 1080 }
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
                width: { ideal: 1920 },
                height: { ideal: 1080 }
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
    fotoCapturada = canvas.toDataURL('image/png');
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

// ====== AUTO-RECARREGAR ======
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        if (nomeConfirmado) {
            carregarGaleria(false);
        }
    }
});

window.addEventListener('beforeunload', function() {
    if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop());
    }
    pararAutoReload();
});

statusDiv.innerHTML = "💖 Digite seu nome para começar";
statusDiv.className = "info";