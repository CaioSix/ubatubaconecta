import React, { useState, useMemo } from 'react';
import { INITIAL_JOBS, CONTACT_EMAIL } from '../data/ubatubaData';

const JOB_AREAS = [
  'Administrativo',
  'Alimentação',
  'Comércio',
  'Hotelaria e turismo',
  'Serviços',
  'Outra área',
];

const JOB_TYPES = ['CLT', 'Temporário', 'Estágio', 'Autônomo', 'Outro'];
const JOB_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function parseJobDate(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  }
  return new Date(valor);
}

function normalizarWhatsapp(valor) {
  let numero = (valor || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return /^55\d{10,11}$/.test(numero) ? numero : '';
}

export default function JobsView() {
  const [jobs] = useState(INITIAL_JOBS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [formData, setFormData] = useState({
    empresa: '',
    cargo: '',
    area: '',
    tipo: '',
    local: '',
    salario: '',
    descricao: '',
    email: '',
    whatsapp: '',
    confirmar: false,
  });

  const activeJobs = useMemo(() => {
    const now = Date.now();
    return jobs.filter((vaga) => {
      const pubTime = parseJobDate(vaga.publicadaEm).getTime();
      return Number.isFinite(pubTime) && now < pubTime + JOB_DURATION_MS;
    });
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('pt-BR');
    return activeJobs.filter((vaga) => {
      const text = `${vaga.cargo} ${vaga.empresa} ${vaga.local}`.toLocaleLowerCase('pt-BR');
      return (!term || text.includes(term)) && (!selectedArea || vaga.area === selectedArea);
    });
  }, [activeJobs, searchTerm, selectedArea]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const assunto = `Vaga para análise: ${formData.cargo}`;
    const corpo = [
      'Solicitação de divulgação de vaga no Ubatuba Conecta',
      '',
      `Empresa: ${formData.empresa}`,
      `Cargo: ${formData.cargo}`,
      `Área: ${formData.area}`,
      `Tipo de contratação: ${formData.tipo}`,
      `Local de trabalho: ${formData.local}`,
      `Salário: ${formData.salario || 'Não informado'}`,
      `Descrição e candidatura: ${formData.descricao}`,
      `E-mail para candidatura: ${formData.email}`,
      `WhatsApp para candidatura: ${formData.whatsapp}`,
      '',
      'Confirmo que represento a empresa e autorizo a divulgação das informações desta vaga.',
      'Estou ciente de que a vaga será publicada somente após revisão e ficará no ar por até 7 dias.',
    ].join('\n');

    setStatusMessage(
      'Confira e envie a mensagem no seu aplicativo de e-mail. A vaga só será publicada após aprovação.'
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      assunto
    )}&body=${encodeURIComponent(corpo)}`;
  }

  return (
    <section id="view-vagas" className="app-view active" aria-labelledby="vagas-titulo">
      <p className="eyebrow eyebrow-accent">Trabalho em Ubatuba</p>
      <h1 className="page-title" id="vagas-titulo">
        Vagas de Emprego
      </h1>
      <p className="page-intro">
        Oportunidades divulgadas por empresas da cidade. Confira os detalhes e fale diretamente com
        a empresa para se candidatar. Cada vaga aprovada fica no ar por até 7 dias.
      </p>

      <div className="jobs-toolbar" role="search">
        <label htmlFor="buscarVaga">
          Buscar por cargo, empresa ou local
          <input
            id="buscarVaga"
            type="search"
            placeholder="Ex.: atendente, recepcionista, Praia Grande"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>
        <label htmlFor="filtroRamoVaga">
          Área profissional
          <select
            id="filtroRamoVaga"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
          >
            <option value="">Todas as áreas</option>
            {JOB_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="job-grid" id="listaVagas" aria-live="polite">
        {filteredJobs.length === 0 ? (
          <div className="jobs-empty">
            <h2>
              {activeJobs.length
                ? 'Nenhuma vaga encontrada'
                : 'Nenhuma vaga publicada no momento'}
            </h2>
            <p>
              {activeJobs.length
                ? 'Tente mudar a busca ou escolher outra área profissional.'
                : 'Volte em breve ou avise uma empresa de Ubatuba sobre esta área.'}
            </p>
          </div>
        ) : (
          filteredJobs.map((vaga) => {
            const publicadaEm = parseJobDate(vaga.publicadaEm);
            const expiraEm = new Date(publicadaEm.getTime() + JOB_DURATION_MS);
            const numeroWhatsapp = normalizarWhatsapp(vaga.whatsapp);
            return (
              <article key={vaga.id} className="job-card">
                <div className="job-meta">
                  {[vaga.area, vaga.tipo].filter(Boolean).map((tag) => (
                    <span key={tag} className="status-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2>{vaga.cargo}</h2>
                <p>
                  <strong>{vaga.empresa}</strong>
                </p>
                <p>Local: {vaga.local}</p>
                {vaga.salario && <p>Salário: {vaga.salario}</p>}
                <p>{vaga.descricao}</p>
                <p className="helper-text">
                  Publicada em {publicadaEm.toLocaleDateString('pt-BR')} · válida até{' '}
                  {expiraEm.toLocaleDateString('pt-BR')}
                </p>

                <div className="job-actions">
                  {vaga.email && (
                    <a
                      className="button-primary"
                      href={`mailto:${vaga.email}?subject=${encodeURIComponent(
                        `Candidatura: ${vaga.cargo}`
                      )}`}
                    >
                      Candidatar-se por e-mail
                    </a>
                  )}
                  {numeroWhatsapp && (
                    <a
                      className="button-secondary"
                      href={`https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(
                        `Olá! Tenho interesse na vaga de ${vaga.cargo} divulgada no Ubatuba Conecta.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Falar pelo WhatsApp
                    </a>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      <section className="panel" aria-labelledby="anunciar-vaga-titulo">
        <h2 id="anunciar-vaga-titulo">Sua empresa está contratando?</h2>
        <p>
          Envie os dados da oportunidade para nossa equipe. A vaga será revisada antes de aparecer
          no site; não envie dados pessoais de candidatos.
        </p>
        <p className="helper-text">
          A divulgação é gratuita nesta fase. Após a aprovação, o anúncio fica no ar por 7 dias e
          pode ser reenviado para renovação.
        </p>
        <form id="formVaga" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label htmlFor="vagaEmpresa">Nome da empresa</label>
              <input
                id="vagaEmpresa"
                name="empresa"
                required
                maxLength={100}
                value={formData.empresa}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="vagaCargo">Cargo</label>
              <input
                id="vagaCargo"
                name="cargo"
                required
                maxLength={100}
                placeholder="Ex.: Atendente"
                value={formData.cargo}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="vagaArea">Área profissional</label>
              <select
                id="vagaArea"
                name="area"
                required
                value={formData.area}
                onChange={handleChange}
              >
                <option value="">Selecione uma área</option>
                {JOB_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vagaTipo">Tipo de contratação</label>
              <select
                id="vagaTipo"
                name="tipo"
                required
                value={formData.tipo}
                onChange={handleChange}
              >
                <option value="">Selecione</option>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vagaLocal">Bairro ou local de trabalho</label>
              <input
                id="vagaLocal"
                name="local"
                required
                maxLength={100}
                placeholder="Ex.: Centro"
                value={formData.local}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="vagaSalario">Salário ou faixa salarial</label>
              <input
                id="vagaSalario"
                name="salario"
                maxLength={100}
                placeholder="Opcional"
                value={formData.salario}
                onChange={handleChange}
              />
            </div>
            <div className="field-full">
              <label htmlFor="vagaDescricao">Descrição, requisitos e como se candidatar</label>
              <textarea
                id="vagaDescricao"
                name="descricao"
                required
                maxLength={1500}
                placeholder="Inclua requisitos, jornada e instruções para candidatura."
                value={formData.descricao}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="vagaContatoEmail">E-mail para candidatura</label>
              <input
                id="vagaContatoEmail"
                name="email"
                type="email"
                required
                maxLength={150}
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="vagaContatoWhatsapp">WhatsApp para candidatura</label>
              <input
                id="vagaContatoWhatsapp"
                name="whatsapp"
                type="tel"
                required
                maxLength={30}
                placeholder="(12) 99999-9999"
                value={formData.whatsapp}
                onChange={handleChange}
              />
            </div>
            <div className="field-full">
              <label className="payment-option">
                <input
                  id="confirmarVaga"
                  name="confirmar"
                  type="checkbox"
                  required
                  checked={formData.confirmar}
                  onChange={handleChange}
                />{' '}
                Confirmo que represento a empresa e autorizo a divulgação das informações desta
                vaga.
              </label>
            </div>
          </div>
          <div className="button-row button-row-spaced">
            <button className="button-primary" type="submit">
              Enviar vaga para análise
            </button>
          </div>
        </form>
        {statusMessage && (
          <p className="helper-text" id="statusEnvioVaga" aria-live="polite">
            {statusMessage}
          </p>
        )}
      </section>
    </section>
  );
}
