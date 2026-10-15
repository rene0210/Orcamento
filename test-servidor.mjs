import { spawn } from 'child_process';
import http from 'http';

// Sobe o servidor em segundo plano
const servidor = spawn('cmd', ['/c', 'node_modules\\.bin\\tsx.cmd src/index.ts'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
});

let servidorPronto = false;

// Aguarda saída do servidor indicando que está rodando
servidor.stdout.on('data', (dados) => {
  const texto = dados.toString();
  process.stdout.write(texto);
  if (texto.includes('Servidor rodando em http://localhost:3000')) {
    servidorPronto = true;
    testarEndpoint();
  }
});

servidor.stderr.on('data', (dados) => {
  process.stderr.write(dados);
});

function testarEndpoint() {
  if (!servidorPronto) return;

  const requisicao = http.get('http://localhost:3000/health', (resposta) => {
    let corpo = '';
    resposta.on('data', (pedaco) => (corpo += pedaco));
    resposta.on('end', () => {
      console.log('\n📦 Resposta do endpoint /health:');
      console.log(JSON.stringify(JSON.parse(corpo), null, 2));
      servidor.kill();
      process.exit(0);
    });
  });

  requisicao.on('error', (erro) => {
    console.error('Erro ao testar endpoint:', erro.message);
    servidor.kill();
    process.exit(1);
  });
}

// Timeout de segurança: fecha se não subir em 15 segundos
setTimeout(() => {
  if (!servidorPronto) {
    console.error('⏱️ Servidor não subiu a tempo.');
    servidor.kill();
    process.exit(1);
  }
}, 15000);
