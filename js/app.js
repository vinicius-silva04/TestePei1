document.addEventListener("DOMContentLoaded", () => {

    // Elements
    const tela1 = document.getElementById("tela-1");
    const tela2 = document.getElementById("tela-2");

    const pesoInput = document.getElementById("peso");
    const unidadePeso = document.getElementById("unidade-peso");
    const atividadeSelect = document.getElementById("atividade");
    const idadeInput = document.getElementById("idade");

    const kcalMinInput = document.getElementById("kcal-min");
    const kcalMaxInput = document.getElementById("kcal-max");
    const btnCalcularKcal = document.getElementById("btn-calcular-kcal");
    const mediaBox = document.getElementById("media-box");
    const btnAvancar = document.getElementById("btn-avancar");

    const propModoRadios = document.getElementsByName("proporcao-modo");
    const proporcaoManualBox = document.getElementById("proporcao-manual");
    const propProtInput = document.getElementById("prop-proteina");
    const propCarbInput = document.getElementById("prop-carbo");
    const propVegInput = document.getElementById("prop-veg");
    const btnGerar = document.getElementById("btn-gerar-dieta");
    const btnVoltar1 = document.getElementById("btn-voltar-1");
    const dietaDiv = document.getElementById("dieta-gerada");
    const kcalMetaDisplay = document.getElementById("kcal-meta");

    // animal cards visual
    document.querySelectorAll(".animal-card").forEach(c => {
        c.addEventListener("click", () => {
            document.querySelectorAll(".animal-card").forEach(x => x.classList.remove("active"));
            c.classList.add("active");
        });
    });

    // banco kcal por 100g
    const kcalPor100g = {
        frango: 165,
        peixe: 130,
        carne: 250,
        arroz: 130,
        batata: 77,
        cenoura: 41,
        abobrinha: 17
    };

    // dieta base (nomes por categoria)
    let dietaBase = {
        proteina: "frango",
        carbo: "arroz",
        vegetal: "cenoura"
    };

    // proporções padrão
    const PADRAO_PROT = 45;
    const PADRAO_CARB = 35;
    const PADRAO_VEG = 20;

    // helpers
    function toKgIfNeeded(valor, unidade) {
        let v = parseFloat(valor);
        if (isNaN(v) || v <= 0) return NaN;
        if (unidade === "lb") v = v * 0.453592;
        return v;
    }

    // CALCULAR KCAL (RER -> DER, usando fator de atividade)
    function calcularCalorias() {
        const pesoKg = toKgIfNeeded(pesoInput.value, unidadePeso.value);
        if (isNaN(pesoKg)) {
            alert("Insira um peso válido.");
            return;
        }
        const fator = parseFloat(atividadeSelect.value) || 1.4;

        // RER = 70 * peso^0.75
        const rer = 70 * Math.pow(pesoKg, 0.75);
        const der = rer * fator;

        const kcalMin = Math.round(der * 0.9);
        const kcalMax = Math.round(der * 1.1);

        kcalMinInput.value = kcalMin;
        kcalMaxInput.value = kcalMax;

        mediaBox.style.display = "block";
        mediaBox.innerHTML = `RER: <b>${Math.round(rer)}</b> kcal · DER: <b>${Math.round(der)}</b> kcal`;
        btnAvancar.style.display = "inline-block";
    }

    btnCalcularKcal.addEventListener("click", calcularCalorias);

    // quando muda radio de proporção
    function atualizarModoProporcao() {
        const modo = Array.from(propModoRadios).find(r => r.checked).value;
        proporcaoManualBox.style.display = modo === "manual" ? "block" : "none";
    }
    Array.from(propModoRadios).forEach(r => r.addEventListener("change", atualizarModoProporcao));
    atualizarModoProporcao();

    // AVANÇAR para tela 2
    btnAvancar.addEventListener("click", () => {
        const min = parseFloat(kcalMinInput.value);
        const max = parseFloat(kcalMaxInput.value);
        if (isNaN(min) || isNaN(max)) {
            alert("Calcule as calorias antes de avançar.");
            return;
        }
        const meta = Math.round((min + max) / 2);
        window.__kcalMeta = meta;
        kcalMetaDisplay.textContent = meta;

        tela1.classList.remove("visible");
        tela2.classList.add("visible");
    });

    // VOLTAR
    btnVoltar1.addEventListener("click", () => {
        tela2.classList.remove("visible");
        tela1.classList.add("visible");
    });

    // GERAR DIETA
    btnGerar.addEventListener("click", () => {
        const modo = Array.from(propModoRadios).find(r => r.checked).value;
        let protPerc, carbPerc, vegPerc;

        if (modo === "padrao") {
            protPerc = PADRAO_PROT;
            carbPerc = PADRAO_CARB;
            vegPerc = PADRAO_VEG;
        } else {
            protPerc = parseFloat(propProtInput.value);
            carbPerc = parseFloat(propCarbInput.value);
            vegPerc = parseFloat(propVegInput.value);

            if (isNaN(protPerc) || isNaN(carbPerc) || isNaN(vegPerc)) {
                alert("Preencha todas as proporções ou selecione usar padrão.");
                return;
            }
            if (Math.round(protPerc + carbPerc + vegPerc) !== 100) {
                alert("As proporções devem somar 100%.");
                return;
            }
        }

        const proporcoes = {
            proteina: protPerc / 100,
            carbo: carbPerc / 100,
            vegetal: vegPerc / 100
        };

        const kcalMeta = window.__kcalMeta;
        if (!kcalMeta) {
            alert("Calcule kcal e avance antes de gerar a dieta.");
            return;
        }

        gerarDietaCompleta(kcalMeta, proporcoes);
    });

    // =============== NOVA FUNÇÃO DE ALTERNATIVAS (SEM REPETIR INGREDIENTE) ===============
    function gerarAlternativas(tipo, atual) {
        const banco = {
            proteina: ["frango", "peixe", "carne"],
            carbo: ["arroz", "batata"],
            vegetal: ["cenoura", "abobrinha"]
        };

        return banco[tipo]
            .filter(item => item !== atual)
            .map(a => `<button class="alt-btn" data-tipo="${tipo}" data-novo="${a}">${a.charAt(0).toUpperCase() + a.slice(1)}</button>`)
            .join("");
    }

    // função que monta a dieta completa
    function gerarDietaCompleta(alvoKcal, proporcoes) {
        let dietaDiv = document.getElementById("dieta-gerada");
        dietaDiv.innerHTML = "<h3>Dieta sugerida</h3>";

        const items = [
            { tipo: "proteina", nome: dietaBase.proteina, prop: proporcoes.proteina },
            { tipo: "carbo", nome: dietaBase.carbo, prop: proporcoes.carbo },
            { tipo: "vegetal", nome: dietaBase.vegetal, prop: proporcoes.vegetal }
        ];

        items.forEach(item => {
            const kcal100 = kcalPor100g[item.nome];
            if (!kcal100) {
                dietaDiv.innerHTML += `<div class="diet-item"><b>${item.tipo}</b>: ingrediente ${item.nome} sem kcal cadastrada</div>`;
                return;
            }

            const gramas = Math.round((alvoKcal * item.prop) / (kcal100 / 100));

            const alternativasHTML = gerarAlternativas(item.tipo, item.nome);

            dietaDiv.innerHTML += `
                <div class="diet-item">
                    <b>${item.tipo.toUpperCase()}</b><br>
                    Ingrediente: <b>${item.nome}</b><br>
                    Quantidade: <b>${gramas}g</b>
                    <div style="margin-top:8px;">Alternativas: ${alternativasHTML}</div>
                </div>
            `;
        });

        dietaDiv.style.display = "block";

        // eventos das alternativas
        dietaDiv.querySelectorAll(".alt-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const tipo = btn.getAttribute("data-tipo");
                const novo = btn.getAttribute("data-novo");
                substituirIngredientePorCategoria(tipo, novo, proporcoes, alvoKcal);
            });
        });
    }

    // substitui ingrediente por categoria
    function substituirIngredientePorCategoria(tipo, novoIngrediente, proporcoes, alvoKcal) {
        dietaBase[tipo] = novoIngrediente;
        gerarDietaCompleta(alvoKcal, proporcoes);
    }

}); // DOMContentLoaded end
