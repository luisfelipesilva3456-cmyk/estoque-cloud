let est = [];
let categorias = JSON.parse(localStorage.getItem('dark_stock_cats')) || ['REDES', 'ENERGIA', 'HARDWARE', 'PERIFÉRICOS'];
let filtroAtivo = 'TODOS';
let meuGrafico;

// VOZ E LOGS
function falar(texto) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = 'pt-BR';
    msg.rate = 1.1;
    window.speechSynthesis.speak(msg);
}

function addLog(msg, tipo = 'info') {
    const logBox = document.getElementById('log-box');
    const time = new Date().toLocaleTimeString();
    const color = tipo === 'critico' ? 'var(--danger)' : 'var(--accent)';
    logBox.innerHTML = `<div style="border-left: 2px solid ${color}; padding-left: 5px; margin-bottom: 5px;">
        <small style="color:var(--text-dim)">[${time}]</small> ${msg}
    </div>` + logBox.innerHTML;
}

// CONEXÃO FIREBASE
function conectarFirebase() {
    const estoqueRef = window.dbRef(window.db, 'estoque');
    // Escuta mudanças no banco em tempo real
    window.dbOnValue(estoqueRef, (snapshot) => {
        const data = snapshot.val();
        // Converte o objeto do Firebase de volta para array
        est = data ? Object.values(data) : [];
        render();
        atualizarGrafico();
        console.log("Banco sincronizado!");
    });
}

function save() {
    // Salva no Firebase (todos os dispositivos verão)
    window.dbSet(window.dbRef(window.db, 'estoque'), est);
    localStorage.setItem('dark_stock_cats', JSON.stringify(categorias));
}

// AÇÕES DE ESTOQUE
function add() {
    const nome = document.getElementById('n').value.trim().toUpperCase();
    const cat = document.getElementById('c').value;
    const qtd = parseInt(document.getElementById('q').value) || 0;

    if(nome) {
        est.push({ 
            id: Date.now(), 
            n: nome, 
            c: cat, 
            q: qtd, 
            i: `fotos/${nome.toLowerCase()}.jpg` 
        });
        addLog(`CADASTRO: ${nome} (+${qtd} un.)`);
        falar(`${nome} registrado.`);
        document.getElementById('n').value = '';
        save();
    }
}

function registrarSaida() {
    const id = parseInt(document.getElementById('select-saida').value);
    const qtdSaida = parseInt(document.getElementById('q-saida').value);
    const it = est.find(x => x.id === id);

    if (it && it.q >= qtdSaida) {
        it.q -= qtdSaida;
        addLog(`BAIXA: ${it.n} (-${qtdSaida} un.)`, 'critico');
        falar(`Saída de ${qtdSaida} unidades de ${it.n.toLowerCase()} confirmada.`);
        save();
    } else {
        falar("Estoque insuficiente.");
        alert("Erro: Quantidade indisponível!");
    }
}

function up(id, m) {
    const it = est.find(x => x.id === id);
    const anterior = it.q;
    it.q = Math.max(0, it.q + m);
    
    if (it.q > anterior) addLog(`AJUSTE: ${it.n} (+${m})`);
    else if (it.q < anterior) addLog(`AJUSTE: ${it.n} (-${Math.abs(m)})`, 'critico');

    if (it.q < 3 && m < 0) falar(`Estoque baixo de ${it.n}`);
    save();
}

function deletarItem(id) {
    if(confirm("Deseja apagar este item permanentemente da nuvem?")) {
        est = est.filter(x => x.id !== id);
        save();
    }
}

// INTERFACE E FILTROS
function render() {
    const grid = document.getElementById('g');
    const busca = document.getElementById('search-input').value.toUpperCase();
    const selectSaida = document.getElementById('select-saida');
    
    const filtrados = est.filter(it => it.n.includes(busca) && (filtroAtivo === 'TODOS' || it.c === filtroAtivo));

    document.getElementById('total-itens').innerText = est.length;
    document.getElementById('total-critico').innerText = est.filter(it => it.q < 3).length;

    // Atualiza lista de saída
    selectSaida.innerHTML = est.map(it => `<option value="${it.id}">${it.n} (${it.q} un.)</option>`).join('');

    grid.innerHTML = filtrados.map(it => `
        <div class="card" style="${it.q < 3 ? 'border-color:var(--danger)' : ''}">
            <button class="btn-delete" onclick="deletarItem(${it.id})">X</button>
            <img src="${it.i}" onerror="this.src='https://via.placeholder.com/400x200?text=${it.n}'">
            <div class="card-info">
                <small style="color:var(--accent)">${it.c}</small>
                <h4>${it.n}</h4>
                <div class="controls">
                    <button class="btn-q" onclick="up(${it.id}, -1)">-</button>
                    <span class="${it.q < 3 ? 'low-stock' : ''}">${it.q}</span>
                    <button class="btn-q" onclick="up(${it.id}, 1)">+</button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateInterface() {
    const select = document.getElementById('c');
    const filterBox = document.getElementById('filter-badges');
    select.innerHTML = categorias.map(c => `<option value="${c}">${c}</option>`).join('');
    filterBox.innerHTML = `<button class="btn-filter ${filtroAtivo === 'TODOS' ? 'active' : ''}" onclick="setFiltro('TODOS')">TODOS</button>` + 
        categorias.map(c => `<button class="btn-filter ${filtroAtivo === c ? 'active' : ''}" onclick="setFiltro('${c}')">${c}</button>`).join('');
}

function setFiltro(c) { filtroAtivo = c; updateInterface(); render(); }

function addCategory() {
    const input = document.getElementById('new-cat');
    const nome = input.value.trim().toUpperCase();
    if (nome && !categorias.includes(nome)) {
        categorias.push(nome);
        input.value = '';
        save();
        updateInterface();
    }
}

function atualizarGrafico() {
    const ctx = document.getElementById('meuGrafico').getContext('2d');
    const resumo = categorias.map(c => est.filter(it => it.c === c).reduce((sum, it) => sum + it.q, 0));
    
    if (meuGrafico) meuGrafico.destroy();
    meuGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: categorias, datasets: [{ data: resumo, backgroundColor: ['#3a86ff', '#00ff41', '#ffbe0b', '#fb5607', '#ff006e'], borderWidth: 0 }] },
        options: { cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#888', font: { size: 10 } } } } }
    });
}

function exportarExcel() {
    const dados = est.map(it => ({ ITEM: it.n, SETOR: it.c, QUANTIDADE: it.q, STATUS: it.q < 3 ? "CRÍTICO" : "OK" }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventário");
    XLSX.writeFile(wb, `Relatorio_Estoque_Cloud.xlsx`);
}

// INICIALIZAÇÃO
updateInterface();
conectarFirebase();