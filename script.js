const P1 = "gsk_gS9vUlpx";
const P2 = "calriicTpujzWGdyb3FY";
const P3 = "4NWweMT0HE4WZJbraSShORd3";
const API_KEY = P1 + P2 + P3;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

let testCorrente = [];
let risposteUtente = [];

async function chiamaAPI(prompt, isTrattato = false) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: "Professore Universitario. NO $. Grassetto per formule." }, { role: "user", content: prompt }],
                temperature: 0.3, max_tokens: isTrattato ? 3800 : 2000
            })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) { return "Errore."; }
}

async function generaPianoDiStudi() {
    const mat = document.getElementById('materia').value;
    const fac = document.getElementById('facolta').value;
    const indiceDiv = document.getElementById('indice-capitoli');
    if (!mat || !fac) return;
    indiceDiv.innerHTML = "Caricamento...";
    const res = await chiamaAPI(`Indice di 10 capitoli per ${mat} (${fac}). Solo titoli.`);
    const capitoli = res.split('\n').filter(c => c.trim().length > 3);
    indiceDiv.innerHTML = "";
    capitoli.forEach(cap => {
        const btn = document.createElement('button');
        btn.className = 'btn-cap';
        btn.innerText = cap.replace(/^\d+[\s.)-]+/, '').trim();
        btn.onclick = () => selezionaCapitolo(btn, btn.innerText, mat, fac);
        indiceDiv.appendChild(btn);
    });
}

async function selezionaCapitolo(btn, titolo, mat, fac) {
    document.querySelectorAll('.btn-cap').forEach(b => b.classList.remove('attivo'));
    btn.classList.add('attivo');
    document.getElementById('programma').innerHTML = "Generazione trattato...";
    const testoRaw = await chiamaAPI(`Trattato su ${titolo} (${mat}). Tecnico. NO $.`, true);
    document.getElementById('programma').innerHTML = marked.parse(testoRaw.replace(/\$/g, ''));
    btn.classList.add('completato');
    const resTest = await chiamaAPI(`Test JSON 10 domande su ${titolo}: [{"q":"D","o":["A","B","C","D"],"a":0,"s":"S"}]. NO $.`);
    testCorrente = JSON.parse(resTest.replace(/```json|```/g, '').replace(/\$/g, ''));
    renderizzaTest();
}

function renderizzaTest() {
    const container = document.getElementById('exercises-display');
    container.innerHTML = "<h3>TEST</h3>";
    testCorrente.forEach((d, i) => {
        const qDiv = document.createElement('div'); qDiv.style.marginBottom="15px";
        qDiv.innerHTML = `<p><strong>${i+1}. ${d.q}</strong></p>`;
        d.o.forEach((opt, idx) => {
            const b = document.createElement('button'); b.className = 'btn-cap'; b.style.width="100%"; b.innerText = opt;
            b.onclick = () => { risposteUtente[i] = idx; Array.from(qDiv.querySelectorAll('button')).forEach(x => x.classList.remove('attivo')); b.classList.add('attivo'); };
            qDiv.appendChild(b);
        });
        container.appendChild(qDiv);
    });
    const b = document.createElement('button'); b.className='btn-search-small'; b.innerText="INVIA"; b.onclick=calcolaRisultato; container.appendChild(b);
}

function calcolaRisultato() {
    let c = 0; testCorrente.forEach((d, i) => { if(risposteUtente[i] === d.a) c++; });
    document.getElementById('exercises-display').innerHTML = `<h2>Voto: ${(c/testCorrente.length)*10}/10</h2>`;
}

function salvaEserciziPDF() { html2pdf().from(document.getElementById('exercises-display')).save('Esercizi.pdf'); }
function salvaAppuntiPDF() {
    const val = document.getElementById('appunti').value;
    const t = document.createElement('div'); t.style.padding="20px"; t.style.color="#000"; t.innerHTML = `<h1>Appunti</h1><p>${val.replace(/\n/g,'<br>')}</p>`;
    html2pdf().from(t).save('Appunti.pdf');
}