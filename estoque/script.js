import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "estoque-cb9dc.firebaseapp.com",
    databaseURL: "https://estoque-cb9dc-default-rtdb.firebaseio.com",
    projectId: "estoque-cb9dc",
    storageBucket: "estoque-cb9dc.appspot.com",
    messagingSenderId: "SEU_ID",
    appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let est = [];
let categorias = ['REDES', 'ENERGIA', 'HARDWARE'];
let meuGrafico;

// VOZ
function falar(t) { window.speechSynthesis.speak(new SpeechSynthesisUtterance(t)); }

// CATEGORIAS
window.addCategory = () => {
    const input = document.getElementById('new-cat');
    const nome = input.value.trim().toUpperCase();
    if (nome && !categorias.includes(nome)) {
        categorias.push(nome);
        set(ref(db, 'config/categorias'), categorias);
        input.value = '';
    }
};

// ADICIONAR ITEM
window.add = () => {
    const n = document.getElementById('n').value.trim().toLowerCase();
    const c = document.getElementById('c').value;
    const q = parseInt(document.getElementById('q').value) || 0;
    if(n) {
        push(ref(db, 'estoque'), { n: n.toUpperCase(), c: c, q: q, i: `fotos/${n}.jpg` });
        document.getElementById('n').value = '';
        falar(`${n} adicionado`);
    }
};

// ATUALIZAR QTD
window.up = (id, m) => {
    const it = est.find(x => x.id === id);
    update(ref(db, 'estoque/' + id), { q: Math.max(0, it.q + m) });
};

// DELETAR
window.deletarItem = (id) => {
    if(confirm("REMOVER?")) remove(ref(db, 'estoque/' + id));
};

// SINCRONIZAR DADOS
onValue(ref(db, 'estoque'), (snap) => {
    const data = snap.val();
    est = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
    render();
    atualizarGrafico();
});

onValue(ref(db, 'config/categorias'), (snap) => {
    if(snap.val()) categorias = snap.val();
    updateCatSelect();
});

function updateCatSelect() {
    document.getElementById('c').innerHTML = categorias.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function render() {
    document.getElementById('g').innerHTML = est.map(it => `
        <div class="card">
            <button class="btn-delete" onclick="deletarItem('${it.id}')">X</button>
            <img src="${it.i}" onerror="this.src='https://via.placeholder.com/400x250?text=Sem+Foto'">
            <div class="card-info">
                <small>${it.c}</small>
                <h4>${it.n}</h4>
                <div class="controls">
                    <button class="btn-q" onclick="up('${it.id}', -1)">-</button>
                    <span>${it.q}</span>
                    <button class="btn-q" onclick="up('${it.id}', 1)">+</button>
                </div>
            </div>
        </div>
    `).join('');
}

function atualizarGrafico() {
    const ctx = document.getElementById('meuGrafico');
    if(!ctx) return;
    const res = {};
    categorias.forEach(c => res[c] = 0);
    est.forEach(it => { if(res[it.c] !== undefined) res[it.c] += it.q; });
    if (meuGrafico) meuGrafico.destroy();
    meuGrafico = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(res),
            datasets: [{ data: Object.values(res), backgroundColor: ['#42a5f5', '#66bb6a', '#ffa726', '#ab47bc'], borderWidth: 0 }]
        }
    });
}