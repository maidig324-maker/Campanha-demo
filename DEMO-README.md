# Versão DEMO — Rifa Premiada

Ambiente de demonstração para o dono avaliar interface, fluxo de compra e
painel administrativo antes de publicar a versão oficial. Não altera nem
depende de nada da versão de produção.

## O que é

- Rotas novas, adicionadas por cima do projeto existente: **`/demo`** (página
  pública) e **`/demo/admin`** (painel administrativo).
- Nenhum arquivo de produção foi removido ou reescrito. A única mudança num
  arquivo compartilhado foi uma linha no `middleware.ts` da raiz, excluindo
  `/demo` da checagem de sessão do Supabase — sem isso a demo exigiria as
  mesmas credenciais reais da produção só para abrir a página. Nenhuma rota
  de produção (`/`, `/admin`, etc.) muda de comportamento.
- **Zero dependência de credenciais**: `/demo` e `/demo/admin` não fazem
  nenhuma chamada ao Supabase, não usam Turnstile, não leem nenhuma variável
  de ambiente. Todo o estado (números, compradores, sorteio) vive em memória
  no navegador, com `useState` — recarregar a página volta tudo ao ponto
  inicial.
- Reaproveita os mesmos componentes visuais da produção (cabeçalho, grade de
  números, legenda, barra de progresso, botões, modal) — por isso a aparência
  é idêntica ao sistema real, incluindo as mesmas cores de
  disponível/reservado/confirmado.

## Como testar uma reserva

1. Abra **`/demo`**.
2. Toque em qualquer número **verde** (disponível) — por exemplo 010, 020 e 030.
   (003, 013, 055, 087 e 147 já aparecem **reservados**, e 021, 035, 062, 096,
   128, 175 já aparecem **confirmados**, para você ver os três estados de
   cara na grade.)
3. Toque em "Continuar" na barra que aparece embaixo.
4. Preencha nome e WhatsApp (qualquer valor), escolha Pix ou Dinheiro, toque
   em "Reservar".
5. A demo mostra a tela de "aguardando confirmação", com o valor exato, o
   horário fictício de vencimento (6 horas) e — se Pix — a chave fictícia
   **DEMONSTRACAO** com o aviso de que é um pagamento simulado.

## Como simular a confirmação de pagamento

1. Abra **`/demo/admin`**.
2. Você verá o resumo (disponíveis/reservados/confirmados/compradores/valor
   arrecadado) e a lista de ~5 compradores fictícios, incluindo o João Silva
   (003, 013, 147 — Pix — aguardando) e a reserva que você acabou de criar no
   passo anterior.
3. Toque em **"Confirmar pagamento"** na linha do João — os três números dele
   passam para **confirmado** imediatamente, e o resumo no topo (vendidos,
   disponíveis, valor arrecadado) atualiza na hora.
4. "Cancelar" faz o oposto: libera os números de volta para disponível.
5. Use a busca (nome, WhatsApp ou número) e os filtros (Aguardando /
   Confirmados / Cancelados) para testar como fica com muitos compradores.

## Como visualizar o sorteio protegido

1. Ainda em **`/demo`**, logo abaixo do cabeçalho, tem a seção **"Sorteio com
   prova de integridade"** — mostra o código público (hash SHA-256) e explica
   que o resultado fica oculto até o encerramento.
2. Toque em **"Simular encerramento"**.
3. O número vencedor fictício (**096**) aparece, junto com **"✓ Prova
   verificada: a ordem revelada confere com o código publicado"**.

Importante: essa verificação **não é só um texto fixo fingindo sucesso** — é
o mesmo componente da produção, recalculando o SHA-256 no navegador contra
valores fictícios pré-computados com a fórmula real. Ela mostra "verificada"
porque os valores batem de verdade, do mesmo jeito que vai bater na campanha
real depois do encerramento.

## Responsividade

Testado em 375px, 390px e 430px (larguras reais de iPhone) e desktop: a
grade de 200 números permanece legível, clicável e sem números cortados nas
três larguras — ela usa 5 colunas em qualquer tela até 640px e passa para 10
colunas a partir daí. (Reparei que o código já tinha uma classe `xs:` prevista
para uma faixa intermediária de 8 colunas em telas um pouco maiores, mas esse
breakpoint não está definido no `tailwind.config.ts`, então ela não tem
efeito hoje — a grade funciona bem mesmo assim, direto de 5 para 10 colunas.
Não mexi nisso agora por ser puramente visual e fora do que foi pedido, mas
fica registrado caso queiram ajustar depois.)

## Publicar como Preview no Vercel

Não tenho como fazer o deploy diretamente a partir daqui (este ambiente não
tem acesso à rede do Vercel nem a uma conta configurada). O projeto já está
pronto para isso — passos exatos:

1. Suba este projeto (ou só este commit) para um repositório Git
   (GitHub/GitLab/Bitbucket).
2. Importe o repositório no Vercel (ou, se já estiver importado, um push para
   uma branch que não seja a de produção já gera um Preview automaticamente).
3. **Nenhuma variável de ambiente é necessária** para `/demo` e `/demo/admin`
   funcionarem no Preview.
4. Se quiser que `/` e `/admin` também funcionem nesse mesmo Preview (não é
   necessário só para mostrar a demo), configure as variáveis reais do
   Supabase/Turnstile em Project Settings → Environment Variables, como já
   descrito no `README.md` principal.
5. Depois do deploy, o link será algo como
   `https://SEU-PROJETO-<hash>.vercel.app` — mande para o dono
   `.../demo` (página pública) e `.../demo/admin` (painel).

## Screenshots

Não consegui gerar screenshots reais neste ambiente — o sandbox onde estou
rodando não tem um navegador funcional instalado (só um pacote de transição
que exige o Chromium via snap, que não funciona aqui) nem acesso de rede para
baixar um navegador headless (Puppeteer/Playwright baixam o Chromium de um
CDN fora da lista de domínios liberados para mim). Não quero simular ou
descrever isso como se fossem capturas reais.

O jeito mais rápido de conseguir as 4 imagens que vocês pediram (inicial,
seleção de números, pagamento, painel) é abrir `/demo` e `/demo/admin` no
celular de vocês mesmos — local (`npm run dev`) ou no link do Preview — e
tirar print durante o passo a passo acima; leva menos de um minuto e garante
que a captura é da tela real, não de uma reconstrução minha.
