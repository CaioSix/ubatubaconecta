# ubatubaconecta

Plataforma digital **Ubatuba Conecta** desenvolvida em **React + Vite**, reunindo guia de praias, previsão do tempo e condição das ondas em tempo real, câmeras ao vivo das estradas, assistente de roteiros, serviços locais (RF Ar Condicionado), vagas de emprego e vitrine de empresas de Ubatuba – SP.

## Tecnologias e Integrações
- **React 18 + Vite**
- **Open-Meteo Weather & Marine API**: Temperatura, sensação térmica, índice UV, vento, previsão de 7 dias, altura das ondas e temperatura da água do mar em tempo real.
- **HLS.js**: Transmissão das câmeras ao vivo das rodovias de acesso (Rio-Santos/Tamoios SP-055 e Oswaldo Cruz SP-125).
- **Meu Roteiro (`localStorage`)**: Planejador interativo com exportação direta para WhatsApp.

## Como rodar localmente
```bash
npm install
npm run dev
```

## Build para produção (Vercel)
```bash
npm run build
```
