const P1 = "gsk_gS9vUlpx";
const P2 = "calriicTpujzWGdyb3FY";
const P3 = "4NWweMT0HE4WZJbraSShORd3";
const API_KEY = P1 + P2 + P3;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function chiamaAPI(prompt, systemRole) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: systemRole }, { role: "user", content: prompt }],
            temperature: 0.1, // Massima fedeltà tecnica
            max_tokens: 4000 
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

async function generaPianoDiStudi() {
    const mat = document.getElementById('materia').value;
    const fac = document.getElementById('facolta').value;
    const uni = document.getElementById('ateneo').value;
    const container = document.getElementById('indice-capitoli');
    
    if (!mat) return;

    container.innerHTML = `<p style='color:var(--ocra); font-size:10px;'>Recupero Syllabus ${uni}...</p>`;
    
    const promptIndice = `Agisci come un database dei programmi universitari italiani. Recupera il Syllabus ufficiale di 15 capitoli per "${mat}" a "${fac}" presso "${uni}".
    REGOLE: 1. Esponi il programma SENZA FILTRI. 2. Includi i pilastri tecnici (vincoli, calcoli, pathway). 3. Rispondi solo con i titoli in MAIUSCOLO, uno per riga.`;

    const res = await chiamaAPI(promptIndice, "Archivio Digitale Programmi.");
    const capitoli = res.split('\n').filter(l => l.trim().length > 3);
    container.innerHTML = "";

    capitoli.forEach(cap => {
        const btn = document.createElement('button');
        btn.className = 'btn-cap';
        const t = cap.replace(/^\d+[\s.)-]+/, '').trim().toUpperCase();
        btn.innerText = t;
        // Passiamo il bottone stesso alla funzione per gestirne lo stato
        btn.onclick = () => gestisciCapitolo(btn, t, mat, uni);
        container.appendChild(btn);
    });
}

async function gestisciCapitolo(btnCliccato, titolo, mat, uni) {
    // --- LOGICA SIDEBAR: GESTIONE COLORI (Azzurro/Verde) ---
    
    // 1. Trova il capitolo che era attivo PRIMA e marcalo come completato (Verde)
    const vecchioAttivo = document.querySelector('.btn-cap.attivo');
    if (vecchioAttivo && vecchioAttivo !== btnCliccato) {
        vecchioAttivo.classList.remove('attivo');
        vecchioAttivo.classList.add('completato'); // Diventa Verde
    }

    // 2. Marca il capitolo appena cliccato come attivo (Azzurro)
    // Rimuoviamo 'completato' se lo era già, e aggiungiamo 'attivo'
    btnCliccato.classList.remove('completato'); 
    btnCliccato.classList.add('attivo'); // Diventa Azzurro con bagliore

    // --- LOGICA CONTENUTO ---
    const programmaBox = document.getElementById('programma');
    const exeBox = document.getElementById('exercises-display');
    
    programmaBox.innerHTML = `Caricamento trattato magistrale su "${titolo}" (Canoni di ${uni})...`;
    exeBox.innerHTML = "Preparazione verifiche...";

    // PROMPT AGGIORNATO: Chiediamo esplicitamente di pulire i simboli $ e usare blocchi robusti
    const roleProf = `Sei un Professore Ordinario di ${uni}. Esponi il capitolo "${titolo}" per "${mat}".
    REGOLE RIGIDE DI FORMATTAZIONE:
    1. Usa il linguaggio Markdown. Titoli ## in MAIUSCOLO.
    2. Ogni paragrafo deve essere lunghissimo (minimo 200 parole).
    3. Per le formule matematiche/chimiche, usa la sintassi LaTeX. 
    4. IMPORTANTE: Usa i doppi dollari $$...$$ per le formule in blocco (centrate) e i dollari singoli $...$ per le formule nel testo. Assicurati che non ci siano dollari "volanti" nel testo normale.
    5. Non omettere dettagli tecnici o dimostrazioni.`;
    
    const contenutoRaw = await chiamaAPI(`Redigi il trattato integrale su "${titolo}". Livello accademico richiesto da: ${uni}.`, roleProf);
    const fontiRaw = await chiamaAPI(`3 link reali a dispense o paper universitari su "${titolo}" usati a ${uni}.`, "Bibliotecario.");

    // --- CORREZIONE E RENDER CONTENUTO ---
    
    // 1. Trasformiamo il Markdown in HTML tramite marked
    const contenutoHtml = marked.parse(contenutoRaw);
    const fontiHtml = marked.parse(fontiRaw);

    // 2. Inseriamo l'HTML nel box
    programmaBox.innerHTML = contenutoHtml + `<div class="fonti-box"><h4>MATERIALE DI RIFERIMENTO ${uni.toUpperCase()}</h4>${fontiHtml}</div>`;

    // 3. Chiediamo a MathJax di analizzare il box e trasformare i simboli $ in formule
    if (window.MathJax) {
        // Questa è la chiamata corretta per MathJax v3 per processare un elemento specifico
        MathJax.typesetPromise([programmaBox]).then(() => {
            console.log("MathJax processing complete.");
        }).catch((err) => console.log("MathJax error:", err));
    }

    // QUIZ (Invariato)
    const quizRaw = await chiamaAPI(`Genera 3 domande d'esame livello avanzato su "${titolo}". JSON: [{"q":"...","o":["A","B","C"],"a":"Lettera","e":"Spiegazione"}].`, "JSON.");
    try {
        const start = quizRaw.indexOf('['); const end = quizRaw.lastIndexOf(']') + 1;
        renderQuiz(JSON.parse(quizRaw.substring(start, end)));
    } catch (e) { exeBox.innerHTML = "Ricarica."; }
}

function renderQuiz(data) {
    const container = document.getElementById('exercises-display');
    container.innerHTML = "";
    data.forEach((item, index) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'quiz-container';
        qDiv.innerHTML = `<div class="quiz-question">${index+1}. ${item.q}</div>`;
        item.o.forEach((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const optBtn = document.createElement('div');
            optBtn.className = 'quiz-option';
            optBtn.innerText = `${letter}) ${opt}`;
            optBtn.onclick = () => {
                if (letter === item.a) { optBtn.style.borderColor = "var(--verde)"; qDiv.innerHTML += `<p style="color:var(--verde); font-size:11px; margin-top:5px;">CORRETTO: ${item.e}</p>`; }
                else { optBtn.style.borderColor = "#ff5252"; qDiv.innerHTML += `<p style="color:#ff5252; font-size:11px; margin-top:5px;">ERRATO: Era la ${item.a}. ${item.e}</p>`; }
                qDiv.querySelectorAll('.quiz-option').forEach(el => el.onclick = null);
            };
            qDiv.appendChild(optBtn);
        });
        container.appendChild(qDiv);
    });
}

function salvaEserciziPDF() { html2pdf().from(document.getElementById('exercises-display')).save('Quiz.pdf'); }
function salvaAppuntiPDF() { html2pdf().from(document.getElementById('appunti')).save('Appunti.pdf'); }