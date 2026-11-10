# OpenCode Workspace — scaffold integrado

Interface Next.js com quatro áreas aprovadas: OpenCode Chat, ZipToGit, Biblioteca de Skills e Configurações. O motor de programação é o OpenCode oficial via `@opencode-ai/sdk`; não é um modelo treinado nem um chatbot simulado.

## Modelos

O seletor inclui `gpt-6-astra`, `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6-luna` e opções GPT-5 para provedores/contas que ainda as disponibilizem. A disponibilidade efetiva depende do catálogo da API e do provedor configurado no OpenCode. As chaves ficam no servidor OpenCode, nunca no browser.

## Economia de tokens

`opencode.json` declara o plugin `@tarquinen/opencode-dcp@latest`, que poda resultados antigos e permite compactação seletiva do contexto. O DCP é licenciado AGPL-3.0: mantenha-o como dependência/plugin separado e cumpra a licença; não copie seu código para este projeto sem avaliar as obrigações. O projeto original informa que parte do desenvolvimento migrou para Sleev, portanto revise o estado e a compatibilidade antes de produção.

## Skills

O endpoint `/api/skills` descobre pastas com `SKILL.md` em `OPENCODE_SKILLS_DIR` e `.agents/skills`. O script `scripts/bootstrap-executor.sh` clona a biblioteca `ticarollamas-arch/skills-main` para `.agents/skills` no host executor. O repositório é consumido como biblioteca externa, preservando autoria/licença.

## ZipToGit

A aba ZipToGit possui rota `/api/github/publish`, que importa arquivos de ZIP para um repositório GitHub via Git Trees/Blobs. Configure `GITHUB_TOKEN` no servidor com acesso Contents read/write. O endpoint serverless limita o ZIP a 40 MB e cada arquivo a 90 MB; não é um uploader de 10 GB.

## Rodar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000. Para conectar o agente, execute OpenCode em host persistente, configure seus provedores e autenticação, e preencha `OPENCODE_SERVER_URL`/`OPENCODE_SERVER_PASSWORD`.

## Arquitetura de produção necessária

- Vercel: interface e rotas curtas de controle (`/api/chat`, `/api/health`, `/api/skills`, `/api/github/publish`).
- Executor: OpenCode oficial em VM/container persistente, isolado por usuário/workspace e com diretório de projeto durável. Não execute tarefas longas dentro do Vercel.
- Banco: PostgreSQL para usuários, conversas, mapeamento chatID→OpenCode sessionID, jobs, uploads e eventos. A UI deste scaffold ainda usa localStorage para o histórico visual.
- Uploads de até 10 GB: multipart direto do navegador para S3/R2, validação/antivírus e extração no executor isolado. Não trafegar o arquivo inteiro por função Vercel.
- Multimodal: enviar imagens/documentos ao OpenCode por anexos nativos do SDK/provedor; o seletor da interface está preparado, mas o upload binário ainda precisa ser ligado ao armazenamento e ao workspace.
- Execução em segundo plano: manter o processo OpenCode e job store no executor, publicar eventos por SSE/WebSocket e retomar por session ID após recarregar a página.
- GitHub: proteger o token, limitar escopos, validar caminho de arquivos e registrar auditoria.

## Limitações desta entrega

Este é um scaffold integrado de interface e rotas, não uma clonagem integral do monorepo OpenCode nem uma fusão literal do código-fonte privado/público dos dois repositórios do usuário. O ambiente de construção não teve acesso de rede para clonar os repositórios. O bootstrap script faz o clone de Skills Main no host executor. O ZipToGit tem publicação funcional para ZIPs pequenos; upload de 10 GB, banco persistente, streaming de eventos e anexos binários multimodais ainda exigem os serviços externos descritos acima.

## Deploy na Vercel

O projeto usa Next.js App Router. A Vercel reconhece automaticamente as rotas API localizadas em `src/app/api/**/route.ts`; não é necessário criar rewrites manuais para elas. O arquivo `vercel.json` na raiz declara explicitamente o framework Next.js e os comandos de instalação e build.

Depois de importar o repositório Git na Vercel, configure as variáveis de ambiente necessárias em **Project Settings → Environment Variables**. Em especial, `OPENCODE_SERVER_URL` deve apontar para um servidor OpenCode persistente e acessível pela aplicação. Não coloque segredos no código nem no repositório.

Rotas disponíveis:
- `GET /api/health`
- `POST /api/chat`
- `DELETE /api/chat`
- `GET /api/skills`
- `POST /api/github/publish`

A Vercel hospeda a interface e as rotas de controle; ela não substitui o executor OpenCode persistente. A duração e os limites das funções dependem do plano Vercel. Tarefas longas devem continuar sendo executadas no servidor OpenCode, não depender de uma única função serverless aberta por muito tempo.
