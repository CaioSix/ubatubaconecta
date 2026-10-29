import React, { useState } from 'react';
import { RF_PRICES, WHATSAPP_RF_AR } from '../data/ubatubaData';

const BTU_OPTIONS = [
  { value: '9000', label: '9.000 BTUs' },
  { value: '12000', label: '12.000 BTUs' },
  { value: '18000', label: '18.000 BTUs' },
  { value: '24000', label: '24.000 BTUs' },
  { value: '30000', label: '30.000 BTUs' },
];

export default function RfServiceCard() {
  const [servicosOpen, setServicosOpen] = useState(false);
  const [formularioOpen, setFormularioOpen] = useState(false);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tipo, setTipo] = useState('');
  const [faixaBtus, setFaixaBtus] = useState('');
  const [modelo, setModelo] = useState('');
  const [relatoProblema, setRelatoProblema] = useState('');
  const [quoteResult, setQuoteResult] = useState(null);

  const isInstalacao = tipo === 'Instalação';
  const isManutencao = tipo === 'Manutenção';
  const isVisita = tipo === 'Visita técnica';
  const needsRelato = isManutencao || isVisita;

  function obterPreco(tipoSelecionado, capacidade) {
    if (tipoSelecionado === 'Instalação') {
      return RF_PRICES.instalacao[capacidade] || null;
    }
    if (tipoSelecionado === 'Manutenção') return RF_PRICES.manutencao;
    if (tipoSelecionado === 'Higienização') return RF_PRICES.higienizacao;
    return null;
  }

  function formatarPreco(preco) {
    if (!preco) return '';
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function handleTipoChange(novoTipo) {
    setTipo(novoTipo);
    setFaixaBtus('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const preco = obterPreco(tipo, faixaBtus);
    const btuLabel = BTU_OPTIONS.find((b) => b.value === faixaBtus)?.label || '';
    const servicoNome = isVisita
      ? 'Visita técnica sem compromisso'
      : isInstalacao
      ? `Instalação - ${btuLabel}`
      : isManutencao
      ? 'Manutenção - recarga de gás'
      : tipo;

    const precoFormatado = isVisita ? '' : `A partir de ${formatarPreco(preco)}`;

    setQuoteResult({
      nome,
      telefone,
      endereco,
      tipo,
      servico: servicoNome,
      modelo: modelo.trim() || 'Não informado',
      problema: relatoProblema.trim(),
      visitaTecnica: isVisita,
      preco: precoFormatado,
    });
  }

  function handleLimpar() {
    setNome('');
    setTelefone('');
    setEndereco('');
    setTipo('');
    setFaixaBtus('');
    setModelo('');
    setRelatoProblema('');
    setQuoteResult(null);
  }

  function abrirWhatsapp(dadosOrcamento) {
    const numero = WHATSAPP_RF_AR.replace(/\D/g, '');
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
      `Meu WhatsApp: ${dadosOrcamento.telefone}`,
    ]
      .filter(Boolean)
      .join('\n');

    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener');
  }

  return (
    <section className="service-card" id="rf-card" aria-labelledby="rf-title">
      <div className="service-head">
        <div>
          <h2 id="rf-title">RF Ar Condicionado</h2>
          <p>Instalação, manutenção e higienização em Ubatuba.</p>
        </div>
        <span className="service-tag">Empresa parceira</span>
      </div>

      <div className="button-row button-row-spaced">
        <button
          type="button"
          className="button-primary"
          onClick={() => setServicosOpen((prev) => !prev)}
        >
          Conhecer serviços
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            setServicosOpen(true);
            setFormularioOpen((prev) => !prev);
          }}
        >
          Solicitar orçamento rápido
        </button>
      </div>

      {servicosOpen && (
        <div id="servicos" className="foldout open">
          <div className="section-heading">
            <div>
              <h2>Nossos serviços</h2>
              <p>O valor aparece na revisão do pedido.</p>
            </div>
          </div>
          <div className="button-row">
            <span className="status-tag">Instalação</span>
            <span className="status-tag">Manutenção</span>
            <span className="status-tag">Higienização</span>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setFormularioOpen((prev) => !prev)}
            >
              Solicitar orçamento
            </button>
          </div>
        </div>
      )}

      {formularioOpen && (
        <div id="formulario" className="foldout open">
          <div className="section-heading">
            <div>
              <h2>Solicitar orçamento</h2>
              <p>Preencha os dados para conferir a faixa de preço.</p>
            </div>
          </div>

          <form id="formOrcamento" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label htmlFor="nome">Nome completo</label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="telefone">Seu WhatsApp</label>
                <input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  required
                  placeholder="(12) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
              <div className="field-full">
                <label htmlFor="endereco">Endereço do serviço</label>
                <input
                  id="endereco"
                  name="endereco"
                  type="text"
                  required
                  placeholder="Rua, número e bairro"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="tipo">Tipo de serviço</label>
                <select
                  id="tipo"
                  name="tipo"
                  required
                  value={tipo}
                  onChange={(e) => handleTipoChange(e.target.value)}
                >
                  <option value="">Escolha uma opção</option>
                  <option value="Instalação">Instalação</option>
                  <option value="Manutenção">Manutenção - recarga de gás</option>
                  <option value="Higienização">Higienização</option>
                  <option value="Visita técnica">Visita técnica sem compromisso</option>
                </select>
              </div>

              {isInstalacao && (
                <div>
                  <label htmlFor="faixaBtus">Capacidade do aparelho</label>
                  <select
                    id="faixaBtus"
                    name="faixaBtus"
                    required={isInstalacao}
                    value={faixaBtus}
                    onChange={(e) => setFaixaBtus(e.target.value)}
                    style={{ display: 'block' }}
                  >
                    <option value="">Escolha a capacidade</option>
                    {BTU_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="field-full">
                <label htmlFor="modelo" id="modeloLabel">
                  {isVisita ? 'Modelo do aparelho (se souber)' : 'Modelo do aparelho'}
                </label>
                <input
                  id="modelo"
                  name="modelo"
                  type="text"
                  required={!isVisita}
                  placeholder="Ex.: Split 12.000 BTUs"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                />
              </div>

              {needsRelato && (
                <div className="field-full" id="relatoCampo" style={{ display: 'block' }}>
                  <label htmlFor="relatoProblema" id="relatoLabel">
                    {isManutencao
                      ? 'O que está acontecendo com o aparelho?'
                      : 'Conte o que percebeu no aparelho (opcional)'}
                  </label>
                  <textarea
                    id="relatoProblema"
                    name="relatoProblema"
                    required={isManutencao}
                    placeholder="Descreva os sinais ou o problema percebido"
                    value={relatoProblema}
                    onChange={(e) => setRelatoProblema(e.target.value)}
                  />
                  {isVisita && (
                    <p className="helper-text" id="relatoAjuda">
                      Não precisa saber o defeito. Conte apenas o que percebeu, se quiser.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="button-row button-row-spaced">
              <button className="button-primary" type="submit">
                Revisar solicitação
              </button>
              <button className="button-quiet" type="button" onClick={handleLimpar}>
                Limpar
              </button>
            </div>
          </form>

          {quoteResult && (
            <div id="resultado" className="quote-review" aria-live="polite">
              <p className="quote-kicker">RF Ar Condicionado</p>
              <h3>
                {quoteResult.visitaTecnica ? 'Solicite sua visita técnica' : 'Confira sua solicitação'}
              </h3>
              <p className="quote-intro">
                {quoteResult.visitaTecnica
                  ? 'Não sabe o que acontece com o aparelho? Peça uma avaliação no local.'
                  : 'Revise os dados e os itens incluídos antes de aprovar.'}
              </p>

              <div className="quote-details">
                <div className="quote-detail">
                  <span>Cliente</span>
                  <strong>{quoteResult.nome}</strong>
                </div>
                <div className="quote-detail">
                  <span>WhatsApp</span>
                  <strong>{quoteResult.telefone}</strong>
                </div>
                <div className="quote-detail">
                  <span>Endereço do serviço</span>
                  <strong>{quoteResult.endereco}</strong>
                </div>
                <div className="quote-detail">
                  <span>Serviço</span>
                  <strong>{quoteResult.servico}</strong>
                </div>
                <div className="quote-detail">
                  <span>Aparelho</span>
                  <strong>{quoteResult.modelo}</strong>
                </div>
                {quoteResult.problema && (
                  <div className="quote-detail">
                    <span>Relato do problema</span>
                    <strong>{quoteResult.problema}</strong>
                  </div>
                )}
              </div>

              {!quoteResult.visitaTecnica && (
                <div className="quote-price-box">
                  <span>Valor do orçamento:</span>
                  <p className="preco-orcamento">{quoteResult.preco}</p>
                </div>
              )}

              {quoteResult.tipo === 'Instalação' && (
                <>
                  <section className="quote-included">
                    <h4>O que está incluso:</h4>
                    <p>
                      Mão de obra e materiais: suporte, linha de cobre com isolamento e cabo PP.
                      Inclui até 3 metros de linha de cobre para instalação padrão parede com parede,
                      conforme as especificações do fabricante.
                    </p>
                  </section>
                  <section className="quote-caution">
                    <h4>Importante sobre a tubulação:</h4>
                    <p>
                      Se o local exigir mais de 3 metros de linha de cobre, os metros adicionais
                      serão cobrados à parte. Você será informado do valor antes, e nada será feito
                      sem sua concordância.
                    </p>
                  </section>
                  <section className="quote-caution">
                    <h4>Preparação elétrica necessária:</h4>
                    <p>
                      O cliente deve deixar o ponto de energia 220 V preparado no local da
                      instalação. A RF Ar Condicionado não faz passagem de fiação nem alterações no
                      quadro de energia.
                    </p>
                  </section>
                </>
              )}

              {quoteResult.visitaTecnica && (
                <section className="quote-caution">
                  <h4>Como funciona a visita técnica:</h4>
                  <p>
                    A visita custa R$ 50,00 somente se você não aprovar o orçamento apresentado no
                    local. Se fechar o serviço durante a visita, a taxa é isenta. Nenhum valor é
                    cobrado para solicitar o agendamento.
                  </p>
                </section>
              )}

              <section className="quote-included">
                <h4>Formas de pagamento:</h4>
                <p>
                  {quoteResult.tipo === 'Instalação'
                    ? 'Pix, cartão de débito ou cartão de crédito em até 3x sem juros. Para parcelar em mais vezes, consulte as taxas na hora do pagamento.'
                    : 'Pix, cartão de débito ou cartão de crédito. Para estes serviços, não há parcelamento.'}
                </p>
              </section>

              <p className="quote-intro" style={{ marginTop: 14 }}>
                {quoteResult.visitaTecnica
                  ? 'Ao continuar, você falará com a RF Ar Condicionado pelo WhatsApp para combinar a visita.'
                  : 'Ao aprovar, você falará com a RF Ar Condicionado pelo WhatsApp para combinar o dia e o horário.'}
              </p>

              <div className="quote-actions">
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => abrirWhatsapp(quoteResult)}
                >
                  {quoteResult.visitaTecnica ? 'Solicitar visita pelo WhatsApp' : 'Aprovar orçamento'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
