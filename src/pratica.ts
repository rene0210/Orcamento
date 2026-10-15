// 📝 Arquivo de prática — rode com: npx tsx src/pratica.ts

// 1. Use uma interface para descrever uma meta
interface Meta {
  nome: string;
  valorAlvo: number;
  valorGuardado: number;
}

// 2. Crie duas ou três metas reais
const metas: Meta[] = [
  { nome: "Viagem", valorAlvo: 8000, valorGuardado: 2500 },
  { nome: "Reserva de emergência", valorAlvo: 20000, valorGuardado: 15000 },
];

// 3. Função tipada: calcula o progresso em porcentagem
function progresso(meta: Meta): number {
  return (meta.valorGuardado / meta.valorAlvo) * 100;
}

// 4. map + template literal para exibir
metas.forEach((m) => {
  console.log(`${m.nome}: ${progresso(m).toFixed(1)}% concluído`);
});
