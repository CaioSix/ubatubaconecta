import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { Video, RefreshCw, ChevronLeft, ChevronRight, Play, Radio } from 'lucide-react';
import { ROAD_CAMERAS } from '../data/ubatubaData';

export default function LiveTrafficCamera() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [stamp, setStamp] = useState(() => {
    const now = new Date();
    return `Atualizado às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  });

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const currentCam = ROAD_CAMERAS[currentIndex];

  function stopStream() {
    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (e) {
        // ignore cleanup errors
      }
      hlsRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch (e) {
        // ignore
      }
    }
    setIsPlaying(false);
    setIsLoading(false);
  }

  function startStream() {
    const video = videoRef.current;
    if (!video || !currentCam?.hls) return;

    stopStream();
    setIsLoading(true);
    setStreamError(false);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        maxBufferLength: 6,
        manifestLoadingMaxRetry: 2,
      });
      hlsRef.current = hls;
      hls.loadSource(currentCam.hls);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setIsPlaying(true);
        video.muted = true;
        video.play().catch(() => {});
        const now = new Date();
        setStamp(`Ao vivo · ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          stopStream();
          setStreamError(true);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = currentCam.hls;
      video.addEventListener(
        'loadedmetadata',
        () => {
          setIsLoading(false);
          setIsPlaying(true);
          video.play().catch(() => {});
        },
        { once: true }
      );
      video.addEventListener(
        'error',
        () => {
          stopStream();
          setStreamError(true);
        },
        { once: true }
      );
    } else {
      setIsLoading(false);
      setStreamError(true);
    }
  }

  useEffect(() => {
    stopStream();
    setStreamError(false);
    return () => stopStream();
  }, [currentIndex]);

  function handlePrev() {
    setCurrentIndex((prev) => (prev - 1 + ROAD_CAMERAS.length) % ROAD_CAMERAS.length);
  }

  function handleNext() {
    setCurrentIndex((prev) => (prev + 1) % ROAD_CAMERAS.length);
  }

  return (
    <article className="status-card status-card-traffic">
      <div className="status-card-head">
        <div>
          <span className="status-tag">Estradas & DER-SP</span>
          <h3>Trânsito e Câmeras Agora</h3>
        </div>
        <span className="traffic-stamp">{stamp}</span>
      </div>

      <div className="camera-viewport">
        {isPlaying && (
          <span className="live-badge">
            <Radio size={12} /> AO VIVO
          </span>
        )}
        <span className="camera-counter">
          {currentIndex + 1}/{ROAD_CAMERAS.length} · {currentCam.highway}
        </span>

        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          muted
          style={{ display: isPlaying ? 'block' : 'none' }}
        />

        {!isPlaying && (
          <div
            className="camera-poster"
            style={{ backgroundImage: `url(${currentCam.fallbackImage})` }}
          >
            <div className="camera-overlay">
              <button
                type="button"
                className="camera-play-btn"
                onClick={startStream}
                disabled={isLoading}
              >
                <Play size={18} fill="currentColor" />
                <span>
                  {isLoading
                    ? 'Conectando câmera ao vivo...'
                    : streamError
                    ? 'Sinal oscilando · Tentar novamente'
                    : 'Assistir câmera ao vivo'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="camera-caption">
        <strong>{currentCam.label}</strong>
        <span>{currentCam.route}</span>
        <p className="camera-note">{currentCam.statusNote}</p>
      </div>

      <div className="camera-controls">
        <button type="button" className="button-quiet button-sm" onClick={handlePrev}>
          <ChevronLeft size={15} /> Anterior
        </button>
        <button type="button" className="button-quiet button-sm" onClick={handleNext}>
          Próxima <ChevronRight size={15} />
        </button>
        <button
          type="button"
          className="button-secondary button-sm"
          onClick={startStream}
          title="Recarregar transmissão ao vivo"
        >
          <RefreshCw size={14} /> {isPlaying ? 'Recarregar' : 'Ao Vivo'}
        </button>
      </div>
    </article>
  );
}
