import React from 'react';
import { X, Trash2, Share2, Compass, PlusCircle } from 'lucide-react';

export default function ItineraryModal({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onUpdateNote,
  onClearAll,
  onExploreBeaches,
}) {
  if (!isOpen) return null;

  function handleShareWhatsApp() {
    if (!items.length) return;
    const lines = [
      '🌴 *Meu Roteiro em Ubatuba (Ubatuba Conecta)* 🌊',
      '',
      ...items.map(
        (item, index) =>
          `${index + 1}. *${item.title}* (${item.category} · ${item.location})${
            item.note ? `\n   📝 Obs: ${item.note}` : ''
          }`
      ),
      '',
      'Montado no Ubatuba Conecta!',
    ];
    window.open(
      `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`,
      '_blank',
      'noopener'
    );
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="itinerary-modal-title"
    >
      <div className="modal-card itinerary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="itinerary-modal-head">
          <div className="itinerary-title-group">
            <Compass size={22} />
            <div>
              <h2 id="itinerary-modal-title">Meu Roteiro em Ubatuba</h2>
              <p>Seus locais salvos ficam guardados automaticamente neste navegador.</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn static-close"
            onClick={onClose}
            aria-label="Fechar Meu Roteiro"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {items.length === 0 ? (
            <div className="jobs-empty" style={{ margin: '12px 0' }}>
              <h2>Seu roteiro ainda está vazio</h2>
              <p>
                Adicione praias, ilhas, hospedagens e passeios clicando no botão{' '}
                <strong>+ Roteiro</strong> em qualquer cartão do site.
              </p>
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => {
                    onClose();
                    onExploreBeaches();
                  }}
                >
                  <PlusCircle size={16} /> Escolher praias para o roteiro
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="itinerary-list">
                {items.map((item, idx) => (
                  <div key={item.id} className="itinerary-item">
                    <div className="itinerary-item-top">
                      <div>
                        <span className="status-tag">
                          #{idx + 1} · {item.category}
                        </span>
                        <h3>{item.title}</h3>
                        <small>{item.location}</small>
                      </div>
                      <button
                        type="button"
                        className="button-quiet button-sm"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Remover ${item.title} do roteiro`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <input
                      type="text"
                      className="itinerary-note-input"
                      placeholder="Adicionar observação (ex.: ir pela manhã, levar snorkel...)"
                      value={item.note || ''}
                      onChange={(e) => onUpdateNote(item.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="modal-actions itinerary-footer-actions">
                <button
                  type="button"
                  className="button-primary"
                  onClick={handleShareWhatsApp}
                >
                  <Share2 size={16} /> Compartilhar roteiro no WhatsApp
                </button>
                <button
                  type="button"
                  className="button-quiet"
                  onClick={onClearAll}
                >
                  Limpar roteiro
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
