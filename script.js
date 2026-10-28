const numeroWhatsappEmpresa = '';
    const instagramUrl = 'https://www.instagram.com/ubatubaconecta/';
    const linksAplicativo = {
        android: '',
        ios: ''
    };
    let planoAtual = null;
    let urlsFotos = [];
    let urlLogo = null;
    let cliquesWhatsappDemo = 0;

    function mostrar(id) {
        document.getElementById(id).classList.toggle('open');
    }

    document.querySelectorAll('[data-toggle-target]').forEach(function(botao) {
        botao.addEventListener('click', function() {
            mostrar(botao.dataset.toggleTarget);
        });
    });

    function abrirView(nome) {
        document.querySelectorAll('.app-view').forEach(function(view) {
            view.classList.toggle('active', view.id === `view-${nome}`);
        });
        document.querySelectorAll('[data-view-link]').forEach(function(botao) {
            if (botao.dataset.viewLink === nome) {
                botao.setAttribute('aria-current', 'page');
            } else {
                botao.removeAttribute('aria-current');
            }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.querySelectorAll('[data-view-link]').forEach(function(botao) {
        botao.addEventListener('click', function(evento) {
            evento.preventDefault();
            abrirView(botao.dataset.viewLink);
        });
    });

    const agenteUsuario = navigator.userAgent;
    const plataformaMovel = /android/i.test(agenteUsuario)
        ? 'android'
        : /iPhone|iPad|iPod/i.test(agenteUsuario) ? 'ios' : '';
    const linkAndroid = document.getElementById('downloadAndroid');
    const linkIOS = document.getElementById('downloadIOS');
    const statusDownload = document.getElementById('download-status');

    function configurarLinkLoja(link, url, nomeLoja) {
        if (!url) return;
        link.href = url;
        link.removeAttribute('aria-disabled');
        link.removeAttribute('tabindex');
        link.querySelector('small').textContent = 'Baixar aplicativo';
        link.setAttribute('aria-label', `Baixar o Ubatuba Conecta na ${nomeLoja}`);
    }

    configurarLinkLoja(linkAndroid, linksAplicativo.android, 'Google Play');
    configurarLinkLoja(linkIOS, linksAplicativo.ios, 'App Store');

    const linkInstagram = document.getElementById('instagramLink');
    if (instagramUrl) {
        linkInstagram.href = instagramUrl;
        linkInstagram.removeAttribute('aria-disabled');
        linkInstagram.removeAttribute('tabindex');
        linkInstagram.target = '_blank';
        linkInstagram.rel = 'noopener noreferrer';
        document.getElementById('instagramStatus').textContent = 'Acompanhe as novidades';
        linkInstagram.setAttribute('aria-label', 'Acompanhe o Ubatuba Conecta no Instagram');
    }

    if (plataformaMovel && linksAplicativo[plataformaMovel]) {
        const lojaRecomendada = plataformaMovel === 'android' ? linkAndroid : linkIOS;
        const outraLoja = plataformaMovel === 'android' ? linkIOS : linkAndroid;
        lojaRecomendada.classList.add('recommended');
        outraLoja.hidden = true;
        statusDownload.textContent = 'Toque abaixo para abrir a loja do seu celular.';
    } else if (plataformaMovel) {
        const lojaRecomendada = plataformaMovel === 'android' ? linkAndroid : linkIOS;
        lojaRecomendada.classList.add('recommended');
    }

    document.querySelectorAll('[data-scroll-target]').forEach(function(botao) {
        botao.addEventListener('click', function() {
            document.getElementById(botao.dataset.scrollTarget).scrollIntoView({ behavior: 'smooth' });
        });
    });

    document.querySelectorAll('[data-filter]').forEach(function(botao) {
        botao.addEventListener('click', function() {
            document.querySelectorAll('[data-filter]').forEach(function(filtro) {
                filtro.setAttribute('aria-pressed', String(filtro === botao));
            });
            document.querySelectorAll('.city-card').forEach(function(cartao) {
                cartao.hidden = botao.dataset.filter !== 'todos' && cartao.dataset.category !== botao.dataset.filter;
            });
        });
    });

    const vagasPublicadas = [];
    const duracaoDivulgacaoVaga = 7 * 24 * 60 * 60 * 1000;
    const listaVagas = document.getElementById('listaVagas');
    const buscaVaga = document.getElementById('buscarVaga');
    const filtroRamoVaga = document.getElementById('filtroRamoVaga');

    function interpretarDataPublicacaoVaga(valor) {
        const dataSemHorario = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
        if (dataSemHorario) {
            return new Date(Number(dataSemHorario[1]), Number(dataSemHorario[2]) - 1, Number(dataSemHorario[3]), 12);
        }
        return new Date(valor);
    }

    function renderizarVagas() {
        const termo = buscaVaga.value.trim().toLocaleLowerCase('pt-BR');
        const areaSelecionada = filtroRamoVaga.value;
        const agora = Date.now();
        const vagasAtivas = vagasPublicadas.filter(function(vaga) {
            const publicadaEm = interpretarDataPublicacaoVaga(vaga.publicadaEm).getTime();
            return Number.isFinite(publicadaEm) && agora < publicadaEm + duracaoDivulgacaoVaga;
        });
        const vagasFiltradas = vagasAtivas.filter(function(vaga) {
            const textoBusca = `${vaga.cargo} ${vaga.empresa} ${vaga.local}`.toLocaleLowerCase('pt-BR');
            return (!termo || textoBusca.includes(termo))
                && (!areaSelecionada || vaga.area === areaSelecionada);
        });

        listaVagas.replaceChildren();
        if (!vagasFiltradas.length) {
            const vazio = document.createElement('div');
            vazio.className = 'jobs-empty';
            const titulo = document.createElement('h2');
            const mensagem = document.createElement('p');
            if (vagasAtivas.length) {
                titulo.textContent = 'Nenhuma vaga encontrada';
                mensagem.textContent = 'Tente mudar a busca ou escolher outra área profissional.';
            } else {
                titulo.textContent = 'Nenhuma vaga publicada no momento';
                mensagem.textContent = 'Volte em breve ou avise uma empresa de Ubatuba sobre esta área.';
            }
            vazio.append(titulo, mensagem);
            listaVagas.appendChild(vazio);
            return;
        }

        vagasFiltradas.forEach(function(vaga) {
            const cartao = document.createElement('article');
            cartao.className = 'job-card';

            const marcadores = document.createElement('div');
            marcadores.className = 'job-meta';
            [vaga.area, vaga.tipo].filter(Boolean).forEach(function(texto) {
                const marcador = document.createElement('span');
                marcador.className = 'status-tag';
                marcador.textContent = texto;
                marcadores.appendChild(marcador);
            });
            cartao.appendChild(marcadores);

            const titulo = document.createElement('h2');
            titulo.textContent = vaga.cargo;
            const empresa = document.createElement('p');
            empresa.textContent = vaga.empresa;
            const local = document.createElement('p');
            local.textContent = `Local: ${vaga.local}`;
            const descricao = document.createElement('p');
            descricao.textContent = vaga.descricao;
            cartao.append(titulo, empresa, local);
            if (vaga.salario) {
                const salario = document.createElement('p');
                salario.textContent = `Salário: ${vaga.salario}`;
                cartao.appendChild(salario);
            }
            cartao.appendChild(descricao);

            const publicadaEm = interpretarDataPublicacaoVaga(vaga.publicadaEm);
            const expiraEm = new Date(publicadaEm.getTime() + duracaoDivulgacaoVaga);
            const validade = document.createElement('p');
            validade.className = 'helper-text';
            validade.textContent = `Publicada em ${publicadaEm.toLocaleDateString('pt-BR')} · válida até ${expiraEm.toLocaleDateString('pt-BR')}`;
            cartao.appendChild(validade);

            const acoes = document.createElement('div');
            acoes.className = 'job-actions';
            if (vaga.email) {
                const email = document.createElement('a');
                email.className = 'button-primary';
                email.href = `mailto:${vaga.email}?subject=${encodeURIComponent(`Candidatura: ${vaga.cargo}`)}`;
                email.textContent = 'Candidatar-se por e-mail';
                acoes.appendChild(email);
            }
            const numeroWhatsapp = normalizarWhatsapp(vaga.whatsapp || '');
            if (numeroWhatsapp) {
                const whatsapp = document.createElement('a');
                whatsapp.className = 'button-secondary';
                whatsapp.href = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(`Olá! Tenho interesse na vaga de ${vaga.cargo} divulgada no Ubatuba Conecta.`)}`;
                whatsapp.target = '_blank';
                whatsapp.rel = 'noopener noreferrer';
                whatsapp.textContent = 'Falar pelo WhatsApp';
                acoes.appendChild(whatsapp);
            }
            if (acoes.childElementCount) cartao.appendChild(acoes);
            listaVagas.appendChild(cartao);
        });
    }

    buscaVaga.addEventListener('input', renderizarVagas);
    filtroRamoVaga.addEventListener('change', renderizarVagas);
    renderizarVagas();

    document.getElementById('formVaga').addEventListener('submit', function(evento) {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        const assunto = `Vaga para análise: ${dados.get('cargo')}`;
        const corpo = [
            'Solicitação de divulgação de vaga no Ubatuba Conecta',
            '',
            `Empresa: ${dados.get('empresa')}`,
            `Cargo: ${dados.get('cargo')}`,
            `Área: ${dados.get('area')}`,
            `Tipo de contratação: ${dados.get('tipo')}`,
            `Local de trabalho: ${dados.get('local')}`,
            `Salário: ${dados.get('salario') || 'Não informado'}`,
            `Descrição e candidatura: ${dados.get('descricao')}`,
            `E-mail para candidatura: ${dados.get('email')}`,
            `WhatsApp para candidatura: ${dados.get('whatsapp')}`,
            '',
            'Confirmo que represento a empresa e autorizo a divulgação das informações desta vaga.',
            'Estou ciente de que a vaga será publicada somente após revisão e ficará no ar por até 7 dias.'
        ].join('\n');
        document.getElementById('statusEnvioVaga').textContent = 'Confira e envie a mensagem no seu aplicativo de e-mail. A vaga só será publicada após aprovação.';
        window.location.href = `mailto:ubatubaconecta2026@gmail.com?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    });

    function adicionarLinha(resultado, rotulo, valor) {
        const detalhe = document.createElement('div');
        detalhe.className = 'quote-detail';
        const titulo = document.createElement('span');
        titulo.textContent = rotulo;
        const conteudo = document.createElement('strong');
        conteudo.textContent = valor;
        detalhe.append(titulo, conteudo);
        resultado.appendChild(detalhe);
    }

    const tipoServico = document.getElementById('tipo');
    const faixaBtus = document.getElementById('faixaBtus');
    const modeloAparelho = document.getElementById('modelo');
    const campoRelato = document.getElementById('relatoCampo');
    const relatoProblema = document.getElementById('relatoProblema');

    tipoServico.addEventListener('change', function() {
        const instalacaoSelecionada = tipoServico.value === 'Instalação';
        const manutencaoSelecionada = tipoServico.value === 'Manutenção';
        const visitaSelecionada = tipoServico.value === 'Visita técnica';
        const relatoNecessario = manutencaoSelecionada || visitaSelecionada;
        faixaBtus.style.display = instalacaoSelecionada ? 'block' : 'none';
        faixaBtus.required = instalacaoSelecionada;
        faixaBtus.value = '';
        campoRelato.style.display = relatoNecessario ? 'block' : 'none';
        relatoProblema.required = manutencaoSelecionada;
        document.getElementById('relatoLabel').textContent = manutencaoSelecionada
            ? 'O que está acontecendo com o aparelho?'
            : 'Conte o que percebeu no aparelho (opcional)';
        document.getElementById('relatoAjuda').textContent = visitaSelecionada
            ? 'Não precisa saber o defeito. Conte apenas o que percebeu, se quiser.'
            : '';
        modeloAparelho.required = !visitaSelecionada;
        document.getElementById('modeloLabel').textContent = visitaSelecionada
            ? 'Modelo do aparelho (se souber)'
            : 'Modelo do aparelho';
    });

    function obterPreco(tipo, capacidade) {
        if (tipo === 'Instalação') {
            const precosInstalacao = {
                '9000': 790,
                '12000': 790,
                '18000': 900,
                '24000': 900,
                '30000': 1200
            };
            return precosInstalacao[capacidade];
        }
        if (tipo === 'Manutenção') return 450;
        if (tipo === 'Higienização') return 150;
        return null;
    }

    function formatarPreco(preco) {
        return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function abrirWhatsapp(dadosOrcamento) {
        const numero = numeroWhatsappEmpresa.replace(/\D/g, '');
        if (!numero) {
            alert('O WhatsApp da RF Ar Condicionado ainda precisa ser configurado.');
            return;
        }
        const mensagem = [
            dadosOrcamento.visitaTecnica
                ? 'Olá! Quero solicitar uma visita técnica sem compromisso.'
                : 'Olá! Quero aprovar este orçamento e agendar o serviço.',
            `Nome: ${dadosOrcamento.nome}`,
            `Serviço: ${dadosOrcamento.servico}`,
            `Aparelho: ${dadosOrcamento.modelo}`,
            `Endereço: ${dadosOrcamento.endereco}`,
            dadosOrcamento.problema ? `O que está acontecendo: ${dadosOrcamento.problema}` : '',
            dadosOrcamento.visitaTecnica
                ? 'Taxa de visita: R$ 50,00 somente se o orçamento não for aprovado no local; se fechar o serviço durante a visita, a taxa é isenta.'
                : `Orçamento: ${dadosOrcamento.preco}`,
            `Meu WhatsApp: ${dadosOrcamento.telefone}`
        ].filter(Boolean).join('\n');
        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener');
    }

    document.getElementById('formOrcamento').addEventListener('submit', function(evento) {
        evento.preventDefault();
        const nome = document.getElementById('nome').value;
        const telefone = document.getElementById('telefone').value;
        const endereco = document.getElementById('endereco').value;
        const tipo = tipoServico.value;
        const modelo = modeloAparelho.value || 'Não informado';
        const problema = relatoProblema.value.trim();
        const visitaTecnica = tipo === 'Visita técnica';
        const capacidade = faixaBtus.value;
        const preco = obterPreco(tipo, capacidade);
        const servico = visitaTecnica
            ? 'Visita técnica sem compromisso'
            : tipo === 'Instalação'
            ? `${tipo} - ${faixaBtus.options[faixaBtus.selectedIndex].text}`
            : tipo === 'Manutenção' ? 'Manutenção - recarga de gás' : tipo;
        const precoFormatado = visitaTecnica ? '' : `A partir de ${formatarPreco(preco)}`;
        const resultado = document.getElementById('resultado');
        resultado.textContent = '';
        resultado.className = 'quote-review';

        const chamada = document.createElement('p');
        chamada.className = 'quote-kicker';
        chamada.textContent = 'RF Ar Condicionado';
        resultado.appendChild(chamada);

        const titulo = document.createElement('h3');
        titulo.textContent = visitaTecnica ? 'Solicite sua visita técnica' : 'Confira sua solicitação';
        resultado.appendChild(titulo);

        const introducao = document.createElement('p');
        introducao.className = 'quote-intro';
        introducao.textContent = visitaTecnica
            ? 'Não sabe o que acontece com o aparelho? Peça uma avaliação no local.'
            : 'Revise os dados e os itens incluídos antes de aprovar.';
        resultado.appendChild(introducao);

        const detalhes = document.createElement('div');
        detalhes.className = 'quote-details';
        adicionarLinha(detalhes, 'Cliente', nome);
        adicionarLinha(detalhes, 'WhatsApp', telefone);
        adicionarLinha(detalhes, 'Endereço do serviço', endereco);
        adicionarLinha(detalhes, 'Serviço', servico);
        adicionarLinha(detalhes, 'Aparelho', modelo);
        if (problema) adicionarLinha(detalhes, 'Relato do problema', problema);
        resultado.appendChild(detalhes);

        if (!visitaTecnica) {
            const caixaPreco = document.createElement('div');
            caixaPreco.className = 'quote-price-box';
            const rotuloPreco = document.createElement('span');
            rotuloPreco.textContent = 'Valor do orçamento:';
            caixaPreco.appendChild(rotuloPreco);
            const precoElemento = document.createElement('p');
            precoElemento.className = 'preco-orcamento';
            precoElemento.textContent = precoFormatado;
            caixaPreco.appendChild(precoElemento);
            resultado.appendChild(caixaPreco);
        }

        if (tipo === 'Instalação') {
            const incluidos = document.createElement('section');
            incluidos.className = 'quote-included';
            const tituloInclusos = document.createElement('h4');
            tituloInclusos.textContent = 'O que está incluso:';
            const textoInclusos = document.createElement('p');
            textoInclusos.textContent = 'Mão de obra e materiais: suporte, linha de cobre com isolamento e cabo PP. Inclui até 3 metros de linha de cobre para instalação padrão parede com parede, conforme as especificações do fabricante.';
            incluidos.append(tituloInclusos, textoInclusos);
            resultado.appendChild(incluidos);

            const observacao = document.createElement('section');
            observacao.className = 'quote-caution';
            const tituloObservacao = document.createElement('h4');
            tituloObservacao.textContent = 'Importante sobre a tubulação:';
            const textoObservacao = document.createElement('p');
            textoObservacao.textContent = 'Se o local exigir mais de 3 metros de linha de cobre, os metros adicionais serão cobrados à parte. Você será informado do valor antes, e nada será feito sem sua concordância.';
            observacao.append(tituloObservacao, textoObservacao);
            resultado.appendChild(observacao);

            const eletrica = document.createElement('section');
            eletrica.className = 'quote-caution';
            const tituloEletrica = document.createElement('h4');
            tituloEletrica.textContent = 'Preparação elétrica necessária:';
            const textoEletrica = document.createElement('p');
            textoEletrica.textContent = 'O cliente deve deixar o ponto de energia 220 V preparado no local da instalação. A RF Ar Condicionado não faz passagem de fiação nem alterações no quadro de energia.';
            eletrica.append(tituloEletrica, textoEletrica);
            resultado.appendChild(eletrica);
        }

        if (visitaTecnica) {
            const regraVisita = document.createElement('section');
            regraVisita.className = 'quote-caution';
            const tituloVisita = document.createElement('h4');
            tituloVisita.textContent = 'Como funciona a visita técnica:';
            const textoVisita = document.createElement('p');
            textoVisita.textContent = 'A visita custa R$ 50,00 somente se você não aprovar o orçamento apresentado no local. Se fechar o serviço durante a visita, a taxa é isenta. Nenhum valor é cobrado para solicitar o agendamento.';
            regraVisita.append(tituloVisita, textoVisita);
            resultado.appendChild(regraVisita);
        }

        const pagamento = document.createElement('section');
        pagamento.className = 'quote-included';
        const tituloPagamento = document.createElement('h4');
        tituloPagamento.textContent = 'Formas de pagamento:';
        const textoPagamento = document.createElement('p');
        textoPagamento.textContent = tipo === 'Instalação'
            ? 'Pix, cartão de débito ou cartão de crédito em até 3x sem juros. Para parcelar em mais vezes, consulte as taxas na hora do pagamento.'
            : 'Pix, cartão de débito ou cartão de crédito. Para estes serviços, não há parcelamento.';
        pagamento.append(tituloPagamento, textoPagamento);
        resultado.appendChild(pagamento);

        const aviso = document.createElement('p');
        aviso.className = 'quote-intro';
        aviso.textContent = visitaTecnica
            ? 'Ao continuar, você falará com a RF Ar Condicionado pelo WhatsApp para combinar a visita.'
            : 'Ao aprovar, você falará com a RF Ar Condicionado pelo WhatsApp para combinar o dia e o horário.';
        resultado.appendChild(aviso);

        const acoes = document.createElement('div');
        acoes.className = 'quote-actions';
        const botaoAprovar = document.createElement('button');
        botaoAprovar.type = 'button';
        botaoAprovar.className = 'button-primary';
        botaoAprovar.textContent = visitaTecnica ? 'Solicitar visita pelo WhatsApp' : 'Aprovar orçamento';
        botaoAprovar.addEventListener('click', function() {
            abrirWhatsapp({ nome, telefone, endereco, servico, modelo, preco: precoFormatado, problema, visitaTecnica });
        });
        acoes.appendChild(botaoAprovar);
        resultado.appendChild(acoes);
    });

    document.getElementById('limparOrcamento').addEventListener('click', function() {
        document.getElementById('formOrcamento').reset();
        tipoServico.dispatchEvent(new Event('change'));
        faixaBtus.style.display = 'none';
        faixaBtus.required = false;
        document.getElementById('resultado').textContent = '';
        document.getElementById('resultado').className = '';
    });

    const planos = {
        semanal: { nome: 'Semanal', periodo: '7 dias', avisoDias: 2, preco: 19.99 },
        mensal: { nome: 'Mensal', periodo: '1 mês', avisoDias: 7, preco: 49.99 },
        anual: { nome: 'Anual', periodo: '1 ano', avisoDias: 7, preco: 399.99 }
    };
    const formatarPrecoPlano = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    document.querySelectorAll('[data-plan]').forEach(function(botao) {
        botao.addEventListener('click', function() {
            planoAtual = planos[botao.dataset.plan];
            document.getElementById('resumoPlano').textContent = `${planoAtual.nome} · ${planoAtual.periodo} · ${formatarPrecoPlano.format(planoAtual.preco)}`;
            document.getElementById('cadastroEmpresa').classList.add('open');
            document.getElementById('resultadoEmpresa').hidden = true;
            document.getElementById('cadastroEmpresa').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    document.getElementById('trocarPlano').addEventListener('click', function() {
        document.getElementById('cadastroEmpresa').classList.remove('open');
        planoAtual = null;
    });

    document.querySelectorAll('input[name="pagamento"]').forEach(function(opcao) {
        opcao.addEventListener('change', function() {
            document.getElementById('notaCredito').classList.toggle('active', opcao.value === 'Cartão de crédito' && opcao.checked);
        });
    });

    const canalAviso = document.getElementById('canalAviso');
    const emailAviso = document.getElementById('emailAviso');

    canalAviso.addEventListener('change', function() {
        const usarEmail = canalAviso.value === 'E-mail';
        document.getElementById('campoEmailAviso').classList.toggle('active', usarEmail);
        emailAviso.required = usarEmail;
    });

    document.getElementById('logoEmpresa').addEventListener('change', function(evento) {
        const arquivo = evento.target.files[0];
        const preview = document.getElementById('logoPreview');
        preview.textContent = '';

        if (urlLogo) URL.revokeObjectURL(urlLogo);
        urlLogo = null;
        if (!arquivo) {
            preview.hidden = true;
            return;
        }
        if (!arquivo.type.startsWith('image/')) {
            evento.target.value = '';
            preview.hidden = true;
            alert('Selecione um arquivo de imagem para a logo.');
            return;
        }

        urlLogo = URL.createObjectURL(arquivo);
        const imagem = document.createElement('img');
        imagem.src = urlLogo;
        imagem.alt = 'Prévia da logo selecionada';
        preview.appendChild(imagem);
        preview.hidden = false;
    });

    document.getElementById('fotosEmpresa').addEventListener('change', function(evento) {
        urlsFotos.forEach(URL.revokeObjectURL);
        urlsFotos = [];
        const arquivos = Array.from(evento.target.files || []);
        const contador = document.getElementById('contadorFotos');
        const lista = document.getElementById('listaFotos');
        lista.textContent = '';

        if (arquivos.length > 5) {
            evento.target.value = '';
            contador.textContent = 'Selecione no máximo 5 fotos.';
            return;
        }
        if (arquivos.some(function(arquivo) { return !arquivo.type.startsWith('image/'); })) {
            evento.target.value = '';
            contador.textContent = 'Envie somente arquivos de imagem.';
            return;
        }

        contador.textContent = `${arquivos.length} de 5 fotos selecionadas.`;
        arquivos.forEach(function(arquivo) {
            const url = URL.createObjectURL(arquivo);
            urlsFotos.push(url);
            const miniatura = document.createElement('div');
            miniatura.className = 'photo-preview';
            const imagem = document.createElement('img');
            imagem.src = url;
            imagem.alt = arquivo.name;
            miniatura.appendChild(imagem);
            lista.appendChild(miniatura);
        });
    });

    document.getElementById('formEmpresa').addEventListener('submit', function(evento) {
        evento.preventDefault();
        if (!planoAtual) return;

        const nomeEmpresa = document.getElementById('empresaNome').value.trim();
        const ramo = document.getElementById('empresaRamo').value;
        if (/ar\s*-?\s*condicionado|climatiza/i.test(`${nomeEmpresa} ${ramo}`)) {
            alert('O Ubatuba Conecta já divulga a RF Ar Condicionado e não aceita outra empresa desse ramo.');
            return;
        }

        const numeroEmpresa = normalizarWhatsapp(document.getElementById('empresaTelefone').value);
        if (!numeroEmpresa) {
            alert('Informe um WhatsApp válido com DDD para a vitrine.');
            return;
        }

        if (!document.getElementById('fotosEmpresa').files.length) {
            alert('Selecione pelo menos uma foto para a divulgação.');
            return;
        }

        const formaPagamento = document.querySelector('input[name="pagamento"]:checked').value;
        const parcelas = formaPagamento === 'Cartão de crédito'
            ? document.getElementById('parcelas').value
            : '1';
        const canal = canalAviso.value === 'E-mail' ? emailAviso.value : 'WhatsApp cadastrado';
        const resultado = document.getElementById('resultadoEmpresa');
        resultado.textContent = `Cadastro conferido para o plano ${planoAtual.nome} (${formatarPrecoPlano.format(planoAtual.preco)}). O pagamento por ${formaPagamento}${formaPagamento === 'Cartão de crédito' ? ` em ${parcelas}x` : ''} ainda não foi processado. Crie e envie o link da InfinitePay manualmente; a empresa não foi publicada.`;
        resultado.hidden = false;

        document.getElementById('painelAnunciante').hidden = false;
        document.getElementById('previaPublica').hidden = false;
        document.getElementById('planoEmpresaPainel').textContent = `${planoAtual.nome} · ${planoAtual.periodo}`;
        document.getElementById('cliquesEmpresa').textContent = '0';
        cliquesWhatsappDemo = 0;
        document.getElementById('avisoRenovacao').textContent = `Após a confirmação do pagamento, o anúncio ficará ativo por ${planoAtual.periodo}. O sistema poderá enviar um aviso ${planoAtual.avisoDias} dias antes do vencimento por ${canal}; essa automação ainda precisa ser integrada.`;

        document.getElementById('nomePublico').textContent = nomeEmpresa;
        document.getElementById('ramoPublico').textContent = ramo;
        document.getElementById('enderecoPublico').textContent = document.getElementById('empresaEndereco').value;

        const logoPublico = document.getElementById('logoPublico');
        logoPublico.textContent = '';
        if (urlLogo) {
            const imagemLogo = document.createElement('img');
            imagemLogo.src = urlLogo;
            imagemLogo.alt = `Logo de ${nomeEmpresa}`;
            logoPublico.appendChild(imagemLogo);
        } else {
            logoPublico.textContent = nomeEmpresa.charAt(0).toUpperCase();
        }

        const galeria = document.getElementById('galeriaPublica');
        galeria.textContent = '';
        urlsFotos.forEach(function(url, indice) {
            const moldura = document.createElement('div');
            moldura.className = 'photo-preview';
            const imagem = document.createElement('img');
            imagem.src = url;
            imagem.alt = `Foto ${indice + 1} de ${nomeEmpresa}`;
            moldura.appendChild(imagem);
            galeria.appendChild(moldura);
        });

        document.getElementById('whatsappPublico').dataset.numero = numeroEmpresa;
        document.getElementById('painelAnunciante').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    function normalizarWhatsapp(valor) {
        let numero = valor.replace(/\D/g, '');
        if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
        return /^55\d{10,11}$/.test(numero) ? numero : '';
    }

    document.getElementById('whatsappPublico').addEventListener('click', function() {
        const numero = document.getElementById('whatsappPublico').dataset.numero;
        if (!numero) return;
        cliquesWhatsappDemo += 1;
        document.getElementById('cliquesEmpresa').textContent = String(cliquesWhatsappDemo);
        const mensagem = encodeURIComponent('Olá! Encontrei sua empresa no Ubatuba Conecta e gostaria de saber mais.');
        window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank', 'noopener');
    });

    document.getElementById('renovarPlano').addEventListener('click', function() {
        document.querySelector('.plan-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
