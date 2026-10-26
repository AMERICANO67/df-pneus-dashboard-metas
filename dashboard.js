const STORAGE_CONFIG = "dfpneus_config";
const STORAGE_LANCAMENTOS = "dfpneus_lancamentos";
const STORAGE_THEME = "dfpneus_theme";

const DEFAULT_CONFIG = {
    metaLucro: 70000,
    metaVeiculos: 125,
    feriados: 1,
    margemBase: 42,
    mesReferencia: "2026-10"
};

let idEditando = null;
let lancamentosVisiveis = true;

function $(id) {
    return document.getElementById(id);
}

function obterDataHojeISO() {
    return new Date().toLocaleDateString("sv-SE");
}

function gerarMesReferenciaPadrao() {
    return obterDataHojeISO().slice(0, 7);
}

function paraDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function gerarPeriodoPorMesReferencia(mesReferencia) {
    const valor = /^\d{4}-\d{2}$/.test(mesReferencia || "") ? mesReferencia : gerarMesReferenciaPadrao();
    const [ano, mes] = valor.split("-").map(Number);
    const inicio = new Date(ano, mes - 1, 26);
    const fim = new Date(ano, mes, 25);

    return {
        mesReferencia: valor,
        dataInicio: paraDataISO(inicio),
        dataFim: paraDataISO(fim)
    };
}

function parseNumeroBR(valor) {
    if (typeof valor === "number") {
        return Number.isNaN(valor) ? 0 : valor;
    }

    if (!valor) {
        return 0;
    }

    let texto = String(valor).trim().replace(/^R\$\s?/, "").trim();

    if (!texto) {
        return 0;
    }

    if (texto.includes(",") && texto.includes(".")) {
        texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (texto.includes(",")) {
        texto = texto.replace(",", ".");
    }

    const numero = Number(texto);
    return Number.isNaN(numero) ? 0 : numero;
}

function moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function percentual(valor) {
    return `${Number(valor || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}%`;
}

function formatarData(dataStr) {
    if (!dataStr) {
        return "";
    }

    const [ano, mes, dia] = dataStr.split("-");
    return `${dia}/${mes}/${ano}`;
}

function normalizarConfiguracoes(configRecebida = {}) {
    const base = {
        ...DEFAULT_CONFIG,
        ...configRecebida
    };

    const mesReferencia = base.mesReferencia || (base.dataFim ? base.dataFim.slice(0, 7) : gerarMesReferenciaPadrao());
    const periodo = gerarPeriodoPorMesReferencia(mesReferencia);

    return {
        ...base,
        mesReferencia: periodo.mesReferencia,
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim,
        metaLucro: parseNumeroBR(base.metaLucro),
        metaVeiculos: parseNumeroBR(base.metaVeiculos),
        feriados: parseNumeroBR(base.feriados),
        margemBase: parseNumeroBR(base.margemBase) || 42
    };
}

function obterConfiguracoes() {
    try {
        const salvas = JSON.parse(localStorage.getItem(STORAGE_CONFIG) || "null");
        const config = normalizarConfiguracoes(salvas || {
            ...DEFAULT_CONFIG,
            mesReferencia: gerarMesReferenciaPadrao()
        });
        salvarConfiguracoes(config);
        return config;
    } catch (error) {
        const config = normalizarConfiguracoes({
            ...DEFAULT_CONFIG,
            mesReferencia: gerarMesReferenciaPadrao()
        });
        salvarConfiguracoes(config);
        return config;
    }
}

function salvarConfiguracoes(config) {
    localStorage.setItem(STORAGE_CONFIG, JSON.stringify(normalizarConfiguracoes(config)));
}

function obterLancamentos() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_LANCAMENTOS) || "[]");
    } catch (error) {
        return [];
    }
}

function salvarLancamentos(lista) {
    localStorage.setItem(STORAGE_LANCAMENTOS, JSON.stringify(lista));
}

function obterTema() {
    const temaSalvo = localStorage.getItem(STORAGE_THEME);
    return temaSalvo === "light" ? "light" : "dark";
}

function atualizarRotuloTema(tema) {
    const botao = $("btnTema");
    if (!botao) {
        return;
    }

    botao.textContent = tema === "light" ? "☀ Tema Claro" : "🌙 Tema Escuro";
    botao.setAttribute("aria-label", `Tema atual: ${tema === "light" ? "claro" : "escuro"}`);
}

function aplicarTema(tema) {
    const temaNormalizado = tema === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", temaNormalizado);
    localStorage.setItem(STORAGE_THEME, temaNormalizado);
    atualizarRotuloTema(temaNormalizado);
}

function alternarTema() {
    aplicarTema(obterTema() === "dark" ? "light" : "dark");
}

function atualizarResumoPeriodo(config) {
    $("subtituloPeriodo").textContent = `Período: ${formatarData(config.dataInicio)} até ${formatarData(config.dataFim)}`;
    $("descricaoPeriodoCiclo").textContent =
        `Ciclo comercial ativo: ${formatarData(config.dataInicio)} a ${formatarData(config.dataFim)}.`;
}

function sincronizarCamposConfiguracao(config) {
    if (document.activeElement !== $("inputMetaLucro")) {
        $("inputMetaLucro").value = config.metaLucro;
    }

    if (document.activeElement !== $("inputMetaVeiculos")) {
        $("inputMetaVeiculos").value = config.metaVeiculos;
    }

    if (document.activeElement !== $("inputFeriados")) {
        $("inputFeriados").value = config.feriados;
    }

    if (document.activeElement !== $("inputMargemBase")) {
        $("inputMargemBase").value = config.margemBase;
    }

    $("inputMesReferencia").value = config.mesReferencia;
    $("inputDataInicio").value = config.dataInicio;
    $("inputDataFim").value = config.dataFim;
    atualizarResumoPeriodo(config);
}

function obterLancamentosDoPeriodo(config, lista = obterLancamentos()) {
    return lista.filter((item) => item.data >= config.dataInicio && item.data <= config.dataFim);
}

function calcularDiasUteis(dataInicioStr, dataFimStr, feriados, lancamentos) {
    if (!dataInicioStr || !dataFimStr) {
        return { totais: 24, passados: 0, restantes: 24 };
    }

    let diasTotais = 0;
    let cursor = new Date(`${dataInicioStr}T00:00:00`);
    const fim = new Date(`${dataFimStr}T23:59:59`);

    while (cursor <= fim) {
        if (cursor.getDay() !== 0) {
            diasTotais += 1;
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    diasTotais = Math.max(diasTotais - feriados, 1);

    const datasLancadas = new Set();
    lancamentos.forEach((item) => {
        if (item.data >= dataInicioStr && item.data <= dataFimStr) {
            datasLancadas.add(item.data);
        }
    });

    let diasPassados = datasLancadas.size;
    let diasCalendario = 0;
    let cursorCalendario = new Date(`${dataInicioStr}T00:00:00`);
    const hoje = new Date(`${obterDataHojeISO()}T00:00:00`);

    while (cursorCalendario < hoje && cursorCalendario <= fim) {
        if (cursorCalendario.getDay() !== 0) {
            diasCalendario += 1;
        }
        cursorCalendario.setDate(cursorCalendario.getDate() + 1);
    }

    diasCalendario = Math.max(diasCalendario - feriados, 0);
    diasPassados = Math.max(diasPassados, diasCalendario);
    diasPassados = Math.min(diasPassados, diasTotais);

    return {
        totais: diasTotais,
        passados: diasPassados,
        restantes: Math.max(diasTotais - diasPassados, 1)
    };
}

function atualizarStatusRag(progressoLucro, diasUteis) {
    const badge = $("statusRagBadge");
    if (!badge) {
        return;
    }

    const percDiasDecorridos = diasUteis.totais > 0 ? (diasUteis.passados / diasUteis.totais) * 100 : 0;

    if (diasUteis.passados === 0) {
        badge.className = "rag-badge rag-green";
        badge.innerHTML = "🟢 NO RITMO (INÍCIO DO PERÍODO)";
        return;
    }

    if (progressoLucro >= percDiasDecorridos) {
        badge.className = "rag-badge rag-green";
        badge.innerHTML = `🟢 NO RITMO (${progressoLucro.toFixed(1)}% Lucro vs ${percDiasDecorridos.toFixed(1)}% Tempo)`;
        return;
    }

    if (progressoLucro >= percDiasDecorridos * 0.85) {
        badge.className = "rag-badge rag-yellow";
        badge.innerHTML = `🟡 ATENÇÃO (${progressoLucro.toFixed(1)}% Lucro vs ${percDiasDecorridos.toFixed(1)}% Tempo)`;
        return;
    }

    badge.className = "rag-badge rag-red";
    badge.innerHTML = `🔴 FORA DA META (${progressoLucro.toFixed(1)}% Lucro vs ${percDiasDecorridos.toFixed(1)}% Tempo)`;
}

function atualizarMixDeVendas(mix, totalVendas) {
    const percOficina = totalVendas > 0 ? (mix.Oficina.venda / totalVendas) * 100 : 0;
    const percPecas = totalVendas > 0 ? (mix["Peças"].venda / totalVendas) * 100 : 0;
    const percPneus = totalVendas > 0 ? (mix.Pneus.venda / totalVendas) * 100 : 0;

    $("percMixOficina").textContent = percentual(percOficina);
    $("barMixOficina").style.width = `${percOficina}%`;

    $("percMixPecas").textContent = percentual(percPecas);
    $("barMixPecas").style.width = `${percPecas}%`;

    $("percMixPneus").textContent = percentual(percPneus);
    $("barMixPneus").style.width = `${percPneus}%`;

    const ranking = [
        { nome: "Oficina (Serviços)", valor: percOficina },
        { nome: "Peças", valor: percPecas },
        { nome: "Pneus", valor: percPneus }
    ].sort((a, b) => b.valor - a.valor);

    $("segmentoDominanteMix").textContent =
        ranking[0].valor > 0 ? `${ranking[0].nome} (${ranking[0].valor.toFixed(1)}%)` : "Nenhum dado";

    const margemOficina = mix.Oficina.venda > 0 ? (mix.Oficina.lucro / mix.Oficina.venda) * 100 : 0;
    const margemPecas = mix["Peças"].venda > 0 ? (mix["Peças"].lucro / mix["Peças"].venda) * 100 : 0;
    const margemPneus = mix.Pneus.venda > 0 ? (mix.Pneus.lucro / mix.Pneus.venda) * 100 : 0;

    $("vendaCatOficina").textContent = `R$ ${moeda(mix.Oficina.venda)}`;
    $("lucroCatOficina").textContent = `R$ ${moeda(mix.Oficina.lucro)}`;
    $("margemCatOficina").textContent = percentual(margemOficina);

    $("vendaCatPecas").textContent = `R$ ${moeda(mix["Peças"].venda)}`;
    $("lucroCatPecas").textContent = `R$ ${moeda(mix["Peças"].lucro)}`;
    $("margemCatPecas").textContent = percentual(margemPecas);

    $("vendaCatPneus").textContent = `R$ ${moeda(mix.Pneus.venda)}`;
    $("lucroCatPneus").textContent = `R$ ${moeda(mix.Pneus.lucro)}`;
    $("margemCatPneus").textContent = percentual(margemPneus);
}

function criarGrafico(meta, realizado, vendas) {
    const dados = [
        {
            nome: "Meta Lucro",
            valor: meta,
            cor: "linear-gradient(180deg, #8b5cf6, #6d28d9)",
            sombra: "rgba(139, 92, 246, 0.25)"
        },
        {
            nome: "Lucro Realizado",
            valor: realizado,
            cor: "linear-gradient(180deg, #22c55e, #15803d)",
            sombra: "rgba(34, 197, 94, 0.25)"
        },
        {
            nome: "Vendas Totais",
            valor: vendas,
            cor: "linear-gradient(180deg, #38bdf8, #0284c7)",
            sombra: "rgba(56, 189, 248, 0.25)"
        }
    ];

    const maiorValor = Math.max(...dados.map((item) => item.valor), 1);
    const chart = $("chart");
    chart.innerHTML = "";

    dados.forEach((item) => {
        const wrap = document.createElement("div");
        wrap.className = "bar-wrap";

        const percentualAltura = (item.valor / maiorValor) * 100;
        const valorCurto = item.valor >= 1000 ? `${(item.valor / 1000).toFixed(1)}k` : item.valor.toFixed(0);

        wrap.innerHTML = `
            <div class="bar-value">R$ ${valorCurto}</div>
            <div class="bar" style="height: ${Math.max(percentualAltura, 3)}%; background: ${item.cor}; box-shadow: 0 8px 25px ${item.sombra}"></div>
            <div class="bar-label">${item.nome}</div>
        `;

        chart.appendChild(wrap);
    });
}

function calcularSimulador() {
    const venda = parseNumeroBR($("simVenda").value);
    const margem = parseNumeroBR($("simMargem").value);
    const lucro = (venda * margem) / 100;
    $("simLucro").textContent = `R$ ${moeda(lucro)}`;
}

function salvarEAtualizar() {
    const periodo = gerarPeriodoPorMesReferencia($("inputMesReferencia").value);
    const config = normalizarConfiguracoes({
        metaLucro: parseNumeroBR($("inputMetaLucro").value),
        metaVeiculos: parseNumeroBR($("inputMetaVeiculos").value),
        feriados: parseNumeroBR($("inputFeriados").value),
        margemBase: parseNumeroBR($("inputMargemBase").value) || 42,
        mesReferencia: periodo.mesReferencia
    });

    salvarConfiguracoes(config);
    sincronizarCamposConfiguracao(config);
    renderizarLancamentos();
    atualizarDashboard();
}

function atualizarDashboard() {
    const config = obterConfiguracoes();
    const lancamentos = obterLancamentosDoPeriodo(config);

    sincronizarCamposConfiguracao(config);

    let lucroRealizado = 0;
    let vendasRealizadas = 0;
    let veiculosRealizados = 0;

    const mix = {
        Oficina: { venda: 0, lucro: 0 },
        "Peças": { venda: 0, lucro: 0 },
        Pneus: { venda: 0, lucro: 0 }
    };

    lancamentos.forEach((item) => {
        const categoria = item.categoria || "Oficina";
        const venda = Number(item.venda) || 0;
        const lucro = Number(item.lucro) || 0;
        const veiculos = Number(item.veiculos) || 0;

        lucroRealizado += lucro;
        vendasRealizadas += venda;
        veiculosRealizados += veiculos;

        if (mix[categoria]) {
            mix[categoria].venda += venda;
            mix[categoria].lucro += lucro;
        }
    });

    const diasUteis = calcularDiasUteis(config.dataInicio, config.dataFim, config.feriados, lancamentos);
    const metaLucro = config.metaLucro;
    const lucroFaltante = Math.max(metaLucro - lucroRealizado, 0);
    const progressoLucro = metaLucro > 0 ? Math.min((lucroRealizado / metaLucro) * 100, 100) : 0;
    const lucroDiarioNecessario = lucroFaltante / diasUteis.restantes;
    const margemBaseNum = config.margemBase || 42;
    const faturamentoEstimadoMeta = metaLucro > 0 && margemBaseNum > 0 ? metaLucro / (margemBaseNum / 100) : 0;
    const margemReal = vendasRealizadas > 0 ? (lucroRealizado / vendasRealizadas) * 100 : config.margemBase;
    const vendasNecessarias = margemReal > 0 ? lucroFaltante / (margemReal / 100) : 0;
    const vendaDiariaNecessaria = vendasNecessarias / diasUteis.restantes;
    const metaVeiculos = config.metaVeiculos;
    const veiculosFaltantes = Math.max(metaVeiculos - veiculosRealizados, 0);
    const veiculosPorDiaRestante = veiculosFaltantes / diasUteis.restantes;
    const lucroPorVeiculoRealizado = veiculosRealizados > 0 ? lucroRealizado / veiculosRealizados : 0;
    const lucroPorVeiculoMeta = metaVeiculos > 0 ? metaLucro / metaVeiculos : 0;
    const ticketMedioVeiculo = veiculosRealizados > 0 ? vendasRealizadas / veiculosRealizados : 0;
    const diferencaLucroVeiculo = lucroPorVeiculoRealizado - lucroPorVeiculoMeta;

    $("vendasEstimadasConfig").textContent = moeda(faturamentoEstimadoMeta);
    $("metaKpi").textContent = moeda(metaLucro);
    $("lucroKpi").textContent = moeda(lucroRealizado);
    $("faltanteKpi").textContent = moeda(lucroFaltante);
    $("metaDiariaKpi").textContent = moeda(lucroDiarioNecessario);
    $("subtituloDiasRestantes").textContent =
        diasUteis.restantes === 1 ? "1 dia útil restante" : `${diasUteis.restantes} dias úteis restantes`;

    $("metaVeiculosKpi").textContent = metaVeiculos;
    $("veiculosRealizadosKpi").textContent = veiculosRealizados;
    $("veiculosFaltantesKpi").textContent = veiculosFaltantes;
    $("veiculosDiaKpi").textContent = veiculosPorDiaRestante.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });

    $("lucroPorVeiculoKpi").textContent = moeda(lucroPorVeiculoRealizado);
    $("metaLucroPorVeiculoKpi").textContent = `Meta planejada: R$ ${moeda(lucroPorVeiculoMeta)} / un.`;
    $("ticketMedioVeiculoKpi").textContent = moeda(ticketMedioVeiculo);
    $("margemVeiculoKpi").textContent = percentual(margemReal);

    const diferenca = $("diferencaLucroVeiculoKpi");
    if (diferencaLucroVeiculo >= 0) {
        diferenca.className = "kpi-value green";
        diferenca.textContent = `+R$ ${moeda(diferencaLucroVeiculo)}`;
    } else {
        diferenca.className = "kpi-value orange-text";
        diferenca.textContent = `-R$ ${moeda(Math.abs(diferencaLucroVeiculo))}`;
    }

    $("percentualMeta").textContent = percentual(progressoLucro);
    $("progressBar").style.width = `${progressoLucro}%`;
    $("diasUteisTotaisStat").textContent = `${diasUteis.totais} dias`;
    $("diasUteisPassadosStat").textContent = `${diasUteis.passados} dias`;
    $("vendasNecessarias").textContent = moeda(vendasNecessarias);
    $("vendaDiariaNecessaria").textContent = moeda(vendaDiariaNecessaria);

    atualizarMixDeVendas(mix, vendasRealizadas);
    atualizarStatusRag(progressoLucro, diasUteis);
    criarGrafico(metaLucro, lucroRealizado, vendasRealizadas);
    calcularSimulador();
}

function atualizarResumoLancamentos(totalNoPeriodo, totalGeral) {
    if (totalNoPeriodo === 0 && totalGeral > 0) {
        $("resumoLancamentos").textContent = "Nenhum lançamento encontrado no período selecionado.";
        return;
    }

    const plural = totalNoPeriodo === 1 ? "lançamento" : "lançamentos";
    $("resumoLancamentos").textContent = `Exibindo ${totalNoPeriodo} ${plural} do ciclo selecionado.`;
}

function alternarVisibilidadeLancamentos() {
    const conteudo = $("conteudoLancamentos");
    const icone = $("iconeOlho");
    const texto = $("textoOlho");

    lancamentosVisiveis = !lancamentosVisiveis;

    if (lancamentosVisiveis) {
        conteudo.style.display = "block";
        texto.textContent = "Ocultar";
        icone.innerHTML =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        return;
    }

    conteudo.style.display = "none";
    texto.textContent = "Mostrar";
    icone.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
}

function prepararEdicao(id) {
    const item = obterLancamentos().find((lancamento) => lancamento.id === id);
    if (!item) {
        return;
    }

    idEditando = id;
    $("dataLancamento").value = item.data;
    $("categoriaLancamento").value = item.categoria || "Oficina";
    $("vendaLancamento").value = item.venda || "";
    $("lucroLancamento").value = item.lucro || "";
    $("veiculosLancamento").value = item.veiculos || "";
    $("btnAcaoLancamento").textContent = "Salvar Alteração";
    $("btnCancelarEdicao").style.display = "inline-flex";

    rolarParaLancamento();
}

function cancelarEdicao() {
    idEditando = null;
    $("dataLancamento").value = obterDataHojeISO();
    $("categoriaLancamento").value = "Oficina";
    $("vendaLancamento").value = "";
    $("lucroLancamento").value = "";
    $("veiculosLancamento").value = "";
    $("btnAcaoLancamento").textContent = "Adicionar";
    $("btnCancelarEdicao").style.display = "none";
}

function validarDataNoPeriodo(data) {
    const config = obterConfiguracoes();
    return data >= config.dataInicio && data <= config.dataFim;
}

function adicionarOuSalvarLancamento() {
    let data = $("dataLancamento").value;

    if (!data) {
        data = obterDataHojeISO();
        $("dataLancamento").value = data;
    }

    if (!validarDataNoPeriodo(data)) {
        const config = obterConfiguracoes();
        alert(`A data do lançamento precisa estar dentro do ciclo ativo: ${formatarData(config.dataInicio)} até ${formatarData(config.dataFim)}.`);
        return;
    }

    const vendaPreenchida = $("vendaLancamento").value.trim() !== "";
    const lucroPreenchido = $("lucroLancamento").value.trim() !== "";
    const veiculosPreenchido = $("veiculosLancamento").value.trim() !== "";

    if (!vendaPreenchida && !lucroPreenchido && !veiculosPreenchido) {
        alert("Por favor, preencha ao menos um dos campos: Venda, Lucro ou Veículos.");
        return;
    }

    const categoria = $("categoriaLancamento").value;
    const venda = parseNumeroBR($("vendaLancamento").value);
    const lucro = parseNumeroBR($("lucroLancamento").value);
    const veiculos = parseNumeroBR($("veiculosLancamento").value);

    let lista = obterLancamentos();

    if (idEditando !== null) {
        lista = lista.map((item) => (
            item.id === idEditando
                ? { ...item, data, categoria, venda, lucro, veiculos }
                : item
        ));
        cancelarEdicao();
    } else {
        lista.push({ id: Date.now(), data, categoria, venda, lucro, veiculos });
        $("vendaLancamento").value = "";
        $("lucroLancamento").value = "";
        $("veiculosLancamento").value = "";
    }

    salvarLancamentos(lista);
    renderizarLancamentos();
    atualizarDashboard();
}

function excluirLancamento(id) {
    if (idEditando === id) {
        cancelarEdicao();
    }

    salvarLancamentos(obterLancamentos().filter((item) => item.id !== id));
    renderizarLancamentos();
    atualizarDashboard();
}

function renderizarLancamentos() {
    const tabela = $("tabelaLancamentos");
    const config = obterConfiguracoes();
    const listaGeral = obterLancamentos();
    const lista = obterLancamentosDoPeriodo(config, listaGeral)
        .sort((a, b) => b.data.localeCompare(a.data));

    tabela.innerHTML = "";
    atualizarResumoLancamentos(lista.length, listaGeral.length);

    if (lista.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; color:#667186; padding:25px">
                    Nenhum lançamento registrado para este ciclo.
                </td>
            </tr>
        `;
        return;
    }

    lista.forEach((item) => {
        const margem = item.venda > 0 ? (item.lucro / item.venda) * 100 : 0;
        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td><strong>${formatarData(item.data)}</strong></td>
            <td><span class="badge ${item.categoria === "Peças" ? "badge-orange" : item.categoria === "Pneus" ? "badge-blue" : "badge-green"}">${item.categoria || "Oficina"}</span></td>
            <td>R$ ${moeda(item.venda)}</td>
            <td class="green">R$ ${moeda(item.lucro)}</td>
            <td>${percentual(margem)}</td>
            <td><strong>${item.veiculos || 0}</strong> un.</td>
            <td style="white-space: nowrap;">
                <button class="edit-btn" onclick="prepararEdicao(${item.id})">Editar</button>
                <button class="delete-btn" onclick="excluirLancamento(${item.id})">Excluir</button>
            </td>
        `;

        tabela.appendChild(linha);
    });
}

function imprimirRelatorio() {
    window.print();
}

function exportarJSON() {
    const backup = {
        config: obterConfiguracoes(),
        lancamentos: obterLancamentos(),
        tema: obterTema(),
        dataBackup: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup-metas-dfpneus-${obterDataHojeISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function importarJSON() {
    $("inputImportarJSON").click();
}

function processarImportacaoJSON(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) {
        return;
    }

    const leitor = new FileReader();
    leitor.onload = (leitura) => {
        try {
            const dados = JSON.parse(leitura.target.result);

            if (!dados.config || !Array.isArray(dados.lancamentos)) {
                alert("Arquivo JSON inválido ou incompatível com o sistema DF PNEUS.");
                return;
            }

            salvarConfiguracoes(dados.config);
            salvarLancamentos(dados.lancamentos);
            if (dados.tema) {
                aplicarTema(dados.tema);
            }
            renderizarLancamentos();
            atualizarDashboard();
            alert("Backup restaurado com sucesso!");
        } catch (error) {
            alert("Erro ao ler o arquivo JSON de backup.");
        } finally {
            event.target.value = "";
        }
    };

    leitor.readAsText(arquivo);
}

function exportarCSV() {
    const config = obterConfiguracoes();
    const lista = obterLancamentosDoPeriodo(config);

    if (lista.length === 0) {
        alert("Não existem lançamentos no período selecionado para exportar.");
        return;
    }

    let csv = "Data;Categoria;Vendas (R$);Lucro (R$);Margem (%);Veiculos\n";

    lista.forEach((item) => {
        const margem = item.venda > 0 ? (item.lucro / item.venda) * 100 : 0;
        csv += `${formatarData(item.data)};${item.categoria || "Oficina"};${item.venda.toFixed(2)};${item.lucro.toFixed(2)};${margem.toFixed(2)};${item.veiculos || 0}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `metas-dfpneus-${config.mesReferencia}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function rolarParaLancamento() {
    $("lancamentos").scrollIntoView({ behavior: "smooth" });
}

function rolarParaConfig() {
    $("configSection").scrollIntoView({ behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", () => {
    aplicarTema(obterTema());
    const config = obterConfiguracoes();
    sincronizarCamposConfiguracao(config);
    $("dataLancamento").value = obterDataHojeISO();
    renderizarLancamentos();
    atualizarDashboard();
});
