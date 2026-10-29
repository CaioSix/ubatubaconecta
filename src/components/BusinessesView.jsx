import React, { useState, useRef } from 'react';
import { BUSINESS_PLANS } from '../data/ubatubaData';

const formatCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const BUSINESS_BRANCHES = [
  'Alimentação',
  'Hospedagem',
  'Turismo e passeios',
  'Comércio',
  'Beleza e bem-estar',
  'Saúde',
  'Automotivo',
  'Construção e reformas',
  'Serviços profissionais',
  'Outro',
];

function normalizarWhatsapp(valor) {
  let numero = (valor || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return /^55\d{10,11}$/.test(numero) ? numero : '';
}

export default function BusinessesView() {
  const [planoAtual, setPlanoAtual] = useState(null);
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaTelefone, setEmpresaTelefone] = useState('');
  const [empresaEndereco, setEmpresaEndereco] = useState('');
  const [empresaRamo, setEmpresaRamo] = useState('');
  const [canalAviso, setCanalAviso] = useState('WhatsApp');
  const [emailAviso, setEmailAviso] = useState('');
  const [pagamento, setPagamento] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [aceiteTermos, setAceiteTermos] = useState(false);

  const [logoUrl, setLogoUrl] = useState(null);
  const [fotosUrls, setFotosUrls] = useState([]);
  const [contadorFotosText, setContadorFotosText] = useState(
    'Mostre pratos, produtos, serviços ou o melhor que sua empresa oferece.'
  );

  const [submittedData, setSubmittedData] = useState(null);
  const [cliquesWhatsappDemo, setCliquesWhatsappDemo] = useState(0);

  const cadastroRef = useRef(null);
  const painelRef = useRef(null);
  const planGridRef = useRef(null);

  function selecionarPlano(planKey) {
    const plan = BUSINESS_PLANS[planKey];
    setPlanoAtual(plan);
    setSubmittedData(null);
    setTimeout(() => {
      cadastroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  function handleLogoChange(e) {
    const arquivo = e.target.files?.[0];
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    if (!arquivo) {
      setLogoUrl(null);
      return;
    }
    if (!arquivo.type.startsWith('image/')) {
      e.target.value = '';
      setLogoUrl(null);
      alert('Selecione um arquivo de imagem para a logo.');
      return;
    }
    setLogoUrl(URL.createObjectURL(arquivo));
  }

  function handleFotosChange(e) {
    fotosUrls.forEach((u) => URL.revokeObjectURL(u));
    const arquivos = Array.from(e.target.files || []);
    if (arquivos.length > 5) {
      e.target.value = '';
      setFotosUrls([]);
      setContadorFotosText('Selecione no máximo 5 fotos.');
      return;
    }
    if (arquivos.some((arq) => !arq.type.startsWith('image/'))) {
      e.target.value = '';
      setFotosUrls([]);
      setContadorFotosText('Envie somente arquivos de imagem.');
      return;
    }
    setContadorFotosText(`${arquivos.length} de 5 fotos selecionadas.`);
    setFotosUrls(arquivos.map((arq) => URL.createObjectURL(arq)));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!planoAtual) return;

    const nomeTrim = empresaNome.trim();
    if (/ar\s*-?\s*condicionado|climatiza/i.test(`${nomeTrim} ${empresaRamo}`)) {
      alert(
        'O Ubatuba Conecta já divulga a RF Ar Condicionado e não aceita outra empresa desse ramo.'
      );
      return;
    }

    const numeroEmpresa = normalizarWhatsapp(empresaTelefone);
    if (!numeroEmpresa) {
      alert('Informe um WhatsApp válido com DDD para a vitrine.');
      return;
    }

    if (!fotosUrls.length) {
      alert('Selecione pelo menos uma foto para a divulgação.');
      return;
    }

    const canal = canalAviso === 'E-mail' ? emailAviso : 'WhatsApp cadastrado';

    setCliquesWhatsappDemo(0);
    setSubmittedData({
      nome: nomeTrim,
      ramo: empresaRamo,
      endereco: empresaEndereco,
      numeroWhatsapp: numeroEmpresa,
      plano: planoAtual,
      formaPagamento: pagamento,
      parcelas: pagamento === 'Cartão de crédito' ? parcelas : '1',
      canal,
      logoUrl,
      fotosUrls,
    });

    setTimeout(() => {
      painelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function handleWhatsappPublicoClick() {
    if (!submittedData?.numeroWhatsapp) return;
    setCliquesWhatsappDemo((c) => c + 1);
    const mensagem = encodeURIComponent(
      'Olá! Encontrei sua empresa no Ubatuba Conecta e gostaria de saber mais.'
    );
    window.open(
      `https://wa.me/${submittedData.numeroWhatsapp}?text=${mensagem}`,
      '_blank',
      'noopener'
    );
  }

  return (
    <section id="view-empresas" className="app-view active" aria-labelledby="empresas-titulo">
      <p className="eyebrow eyebrow-accent">Vitrine local</p>
      <h1 className="page-title" id="empresas-titulo">
        Divulgue sua empresa
      </h1>
      <p className="page-intro">
        Planos para negócios de Ubatuba. A RF Ar Condicionado já é a empresa de ar-condicionado da
        plataforma; outros negócios desse ramo não podem se cadastrar.
      </p>

      <div className="plans-note">
        <strong>Pagamento online</strong>
        <span>
          Você pode cobrar por um link de pagamento da InfinitePay. Nesta versão, o link é criado e
          enviado manualmente; o pagamento e a publicação do anúncio precisam ser confirmados
          manualmente. A ativação automática exige integração com servidor.
        </span>
      </div>

      <div className="plan-grid plan-grid-spaced" ref={planGridRef}>
        {Object.values(BUSINESS_PLANS).map((plan) => (
          <article
            key={plan.id}
            className={`plan-card ${plan.recommended ? 'recommended' : ''}`}
          >
            <h2>{plan.nome}</h2>
            <p>{plan.descricao}</p>
            <span className="plan-price">{formatCurrency.format(plan.preco)}</span>
            <p>Período de {plan.periodo}.</p>
            <button
              type="button"
              className="button-primary"
              onClick={() => selecionarPlano(plan.id)}
            >
              Escolher {plan.nome.toLowerCase()}
            </button>
          </article>
        ))}
      </div>

      {planoAtual && (
        <section
          className="panel foldout open"
          id="cadastroEmpresa"
          ref={cadastroRef}
          aria-labelledby="cadastro-titulo"
        >
          <h2 id="cadastro-titulo">Dados da empresa</h2>
          <p>
            Escolha o plano primeiro. Nesta versão, o pagamento é combinado por um link criado
            manualmente; a divulgação só começa após a confirmação do pagamento.
          </p>

          <div className="selected-plan" id="resumoPlano">
            <span>
              {planoAtual.nome} · {planoAtual.periodo} · {formatCurrency.format(planoAtual.preco)}
            </span>
          </div>

          <form id="formEmpresa" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label htmlFor="empresaNome">Nome da empresa</label>
                <input
                  id="empresaNome"
                  name="empresaNome"
                  required
                  placeholder="Nome divulgado"
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="empresaTelefone">WhatsApp de contato</label>
                <input
                  id="empresaTelefone"
                  name="empresaTelefone"
                  type="tel"
                  required
                  placeholder="(12) 99999-9999"
                  value={empresaTelefone}
                  onChange={(e) => setEmpresaTelefone(e.target.value)}
                />
                <p className="helper-text">
                  O botão da vitrine abrirá uma conversa com este número.
                </p>
              </div>
              <div className="field-full">
                <label htmlFor="empresaEndereco">Endereço da empresa</label>
                <input
                  id="empresaEndereco"
                  name="empresaEndereco"
                  required
                  placeholder="Rua, número e bairro"
                  value={empresaEndereco}
                  onChange={(e) => setEmpresaEndereco(e.target.value)}
                />
              </div>
              <div className="field-full">
                <label htmlFor="empresaRamo">Ramo da empresa</label>
                <select
                  id="empresaRamo"
                  name="empresaRamo"
                  required
                  value={empresaRamo}
                  onChange={(e) => setEmpresaRamo(e.target.value)}
                >
                  <option value="">Selecione um ramo</option>
                  {BUSINESS_BRANCHES.map((ramo) => (
                    <option key={ramo} value={ramo}>
                      {ramo === 'Outro' ? 'Outro ramo (exceto ar-condicionado)' : ramo}
                    </option>
                  ))}
                </select>
                <p className="helper-text">
                  Não aceitamos cadastro de outras empresas de ar-condicionado.
                </p>
              </div>

              <div className="field-full">
                <span className="field-label">Logo da empresa</span>
                <div className="photo-picker">
                  <div>
                    <label htmlFor="logoEmpresa">Selecionar logo</label>
                    <p className="helper-text">
                      Opcional. Uma imagem para identificar sua empresa.
                    </p>
                    <input
                      id="logoEmpresa"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                    {logoUrl && (
                      <div id="logoPreview" className="logo-preview">
                        <img src={logoUrl} alt="Prévia da logo selecionada" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="field-full">
                <span className="field-label">Fotos de produtos e serviços</span>
                <div className="photo-picker">
                  <div>
                    <label htmlFor="fotosEmpresa">Selecionar até 5 fotos</label>
                    <p className="helper-text" id="contadorFotos">
                      {contadorFotosText}
                    </p>
                    <input
                      id="fotosEmpresa"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFotosChange}
                    />
                  </div>
                </div>
                {fotosUrls.length > 0 && (
                  <div className="photo-list" id="listaFotos" aria-live="polite">
                    {fotosUrls.map((url, idx) => (
                      <div key={url} className="photo-preview">
                        <img src={url} alt={`Foto selecionada ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="field-full">
                <label htmlFor="canalAviso">Receber aviso de renovação por</label>
                <select
                  id="canalAviso"
                  name="canalAviso"
                  value={canalAviso}
                  onChange={(e) => setCanalAviso(e.target.value)}
                >
                  <option value="WhatsApp">WhatsApp cadastrado</option>
                  <option value="E-mail">E-mail</option>
                </select>
              </div>

              {canalAviso === 'E-mail' && (
                <div className="field-full payment-note active" id="campoEmailAviso">
                  <label htmlFor="emailAviso">E-mail para aviso de renovação</label>
                  <input
                    id="emailAviso"
                    name="emailAviso"
                    type="email"
                    required
                    placeholder="voce@empresa.com"
                    value={emailAviso}
                    onChange={(e) => setEmailAviso(e.target.value)}
                  />
                </div>
              )}

              <div className="field-full">
                <span className="field-label">Forma de pagamento</span>
                <div className="payment-options">
                  {['Pix', 'Cartão de crédito', 'Cartão de débito'].map((metodo) => (
                    <label key={metodo} className="payment-option">
                      <input
                        type="radio"
                        name="pagamento"
                        value={metodo}
                        required
                        checked={pagamento === metodo}
                        onChange={(e) => setPagamento(e.target.value)}
                      />{' '}
                      {metodo === 'Cartão de crédito'
                        ? 'Crédito'
                        : metodo === 'Cartão de débito'
                        ? 'Débito'
                        : 'Pix'}
                    </label>
                  ))}
                </div>

                {pagamento === 'Cartão de crédito' && (
                  <div className="payment-note active" id="notaCredito">
                    <label htmlFor="parcelas">Parcelamento no crédito</label>
                    <select
                      id="parcelas"
                      value={parcelas}
                      onChange={(e) => setParcelas(e.target.value)}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={String(n)}>
                          {n}x sem juros
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <p className="helper-text">
                  Este formulário ainda não processa pagamentos. Gere o link no app InfinitePay e
                  envie à empresa; não informe dados do cartão aqui.
                </p>
              </div>

              <div className="field-full field-spaced">
                <label className="payment-option">
                  <input
                    id="aceiteTermos"
                    type="checkbox"
                    required
                    checked={aceiteTermos}
                    onChange={(e) => setAceiteTermos(e.target.checked)}
                  />{' '}
                  Confirmo que os dados e as fotos pertencem à minha empresa.
                </label>
              </div>
            </div>

            <div className="button-row button-row-spaced">
              <button className="button-primary" type="submit">
                Conferir cadastro
              </button>
              <button
                className="button-quiet"
                type="button"
                id="trocarPlano"
                onClick={() => {
                  setPlanoAtual(null);
                  setSubmittedData(null);
                }}
              >
                Trocar plano
              </button>
            </div>
          </form>

          {submittedData && (
            <>
              <div className="confirmation" id="resultadoEmpresa" role="status">
                Cadastro conferido para o plano {submittedData.plano.nome} (
                {formatCurrency.format(submittedData.plano.preco)}). O pagamento por{' '}
                {submittedData.formaPagamento}
                {submittedData.formaPagamento === 'Cartão de crédito'
                  ? ` em ${submittedData.parcelas}x`
                  : ''}{' '}
                ainda não foi processado. Crie e envie o link da InfinitePay manualmente; a empresa
                não foi publicada.
              </div>

              <section
                className="panel"
                id="painelAnunciante"
                ref={painelRef}
                aria-labelledby="painel-titulo"
              >
                <h2 id="painel-titulo">Painel do anunciante</h2>
                <p>Prévia demonstrativa neste navegador. A divulgação ainda não foi publicada nem paga.</p>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span>Cliques no WhatsApp</span>
                    <strong id="cliquesEmpresa">{cliquesWhatsappDemo}</strong>
                  </div>
                  <div className="stat-item">
                    <span>Plano escolhido</span>
                    <strong id="planoEmpresaPainel">
                      {submittedData.plano.nome} · {submittedData.plano.periodo}
                    </strong>
                  </div>
                  <div className="stat-item">
                    <span>Vencimento</span>
                    <strong>A definir após pagamento</strong>
                  </div>
                </div>
                <p className="dashboard-note" id="avisoRenovacao">
                  Após a confirmação do pagamento, o anúncio ficará ativo por{' '}
                  {submittedData.plano.periodo}. O sistema poderá enviar um aviso{' '}
                  {submittedData.plano.avisoDias} dias antes do vencimento por{' '}
                  {submittedData.canal}; essa automação ainda precisa ser integrada.
                </p>
                <button
                  className="button-secondary"
                  type="button"
                  id="renovarPlano"
                  onClick={() =>
                    planGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  Ver planos para renovar
                </button>
              </section>

              <section className="panel" id="previaPublica" aria-labelledby="previa-titulo">
                <div className="section-heading">
                  <div>
                    <h2 id="previa-titulo">Prévia da divulgação</h2>
                    <p>Este cartão só ficará público após a confirmação do pagamento.</p>
                  </div>
                  <span className="status-tag">Não publicada</span>
                </div>
                <article className="listing-preview">
                  <div className="listing-header">
                    <div className="listing-logo" id="logoPublico">
                      {submittedData.logoUrl ? (
                        <img
                          src={submittedData.logoUrl}
                          alt={`Logo de ${submittedData.nome}`}
                        />
                      ) : (
                        submittedData.nome.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 id="nomePublico">{submittedData.nome}</h3>
                      <p id="ramoPublico">{submittedData.ramo}</p>
                    </div>
                  </div>
                  <p className="public-address" id="enderecoPublico">
                    {submittedData.endereco}
                  </p>
                  <div className="listing-gallery" id="galeriaPublica">
                    {submittedData.fotosUrls.map((url, idx) => (
                      <div key={url} className="photo-preview">
                        <img src={url} alt={`Foto ${idx + 1} de ${submittedData.nome}`} />
                      </div>
                    ))}
                  </div>
                  <button
                    className="button-primary"
                    id="whatsappPublico"
                    type="button"
                    onClick={handleWhatsappPublicoClick}
                  >
                    Falar pelo WhatsApp
                  </button>
                </article>
              </section>
            </>
          )}
        </section>
      )}
    </section>
  );
}
