# 🍽️ Cardápio Digital Interativo

[![Deploy to GitHub Pages](https://github.com/karla08C/Card-pio-Interativo/actions/workflows/deploy.yml/badge.svg)](https://github.com/karla08C/Card-pio-Interativo/actions/workflows/deploy.yml)
[![React](https://img.shields.io/badge/React-18-blue?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Cardápio digital e interativo com catálogo responsivo, personalização de pratos, cálculo de extras em tempo real, checkout integrado via WhatsApp e painel administrativo para gestão de produtos.

🔗 **[Acessar Demonstração Online (Live Demo)](https://karla08c.github.io/Card-pio-Interativo/)**

---

## 🎯 Visão Geral
Aplicação desenvolvida com foco em alta conversão e agilidade de atendimento para restaurantes, hamburguerias e confeitarias de pequeno a médio porte:
- **Experiência do Cliente:** Navegação fluida, filtros por categoria, personalização de ingredientes e envio do pedido estruturado diretamente no WhatsApp.
- **Experiência do Administrador:** Painel de gestão protegido por senha para cadastrar novos pratos, alterar preços, atualizar descrições e subir imagens otimizadas sem precisar mexer no código.
- **Sem Dependência de Backend:** Toda a gestão e pedidos persistem diretamente no navegador via `localStorage`.

---

## ⚡ Funcionalidades em Destaque

### 🛍️ Para o Cliente
- **Catálogo Organizado por Categorias:** Entradas, Massas, Bebidas e Sobremesas.
- **Alternância de Visualização:** Modo Grade (Cards visuais) e Modo Lista (rápida navegação).
- **Filtros e Tags:** Identificação visual para *Mais Pedidos*, *Vegetariano*, *Sem Glúten* e *Sem Lactose*.
- **Modal de Personalização:** Seleção de adicionais com valores somados ao vivo, quantidade e nível de tempero (*Suave*, *Médio* ou *Ardido*).
- **Carrinho Lateral:** Totalizador automático e fechamento de pedido com mensagem pronta para envio no WhatsApp.

### ⚙️ Painel de Gestão (Admin)
- **Acesso Seguro:** Área restrita por senha (padrão: `1234`), com opção de alteração de senha a qualquer momento.
- **CRUD Completo:** Adicionar novos pratos, editar ingredientes, alterar valores e excluir itens.
- **Processamento de Fotos com Canvas API:** Upload local com compressão automática, padronização de aspect ratio (16:10) e ajuste de enquadramento/zoom.
- **Restauração de Dados:** Opção para resetar o cardápio aos valores padrão originais a qualquer momento.

---

## 🛠️ Tecnologias Utilizadas
- **Frontend:** React 18
- **Build Tool:** Vite
- **Ícones:** Lucide React
- **Estilização:** CSS3 Moderno (Layouts responsivos com CSS Grid e Flexbox)
- **APIs Web Nativas:** HTML5 Canvas (compressão de imagens) e LocalStorage API (persistência de estado)
- **CI/CD:** GitHub Actions com deploy automatizado no GitHub Pages

---

## 📁 Estrutura do Projeto

```bash
Card-pio-Interativo/
├── .github/
│   └── workflows/
│       └── deploy.yml        # Pipeline de CI/CD para GitHub Pages
├── dist/                     # Build de produção gerado pelo Vite
├── public/                   # Recursos estáticos
├── src/
│   ├── data/
│   │   └── menuItems.js      # Catálogo inicial de produtos e categorias
│   ├── App.jsx               # Lógica principal, carrinho e painel admin
│   ├── main.jsx              # Ponto de entrada React
│   └── styles.css            # Estilização global e componentes responsivos
├── index.html                # Template HTML com meta tags
├── package.json              # Dependências e scripts do projeto
└── vite.config.js            # Configuração do Vite com base path do GitHub Pages
```

---

## 💻 Como Executar Localmente

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm

### Passo a passo
```bash
# Clone o repositório
git clone https://github.com/karla08C/Card-pio-Interativo.git

# Acesse a pasta do projeto
cd Card-pio-Interativo

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```
Acesse `http://localhost:5173/` no seu navegador.

---

## 🔐 Acesso à Configuração
1. Na barra superior ou no rodapé da página, clique na aba **Configuração**.
2. Digite a senha padrão: `1234`.
3. Pronto! O menu ficará em modo de edição com permissão para gerenciar pratos e fotos.

---

## 🔮 Próximas Evoluções Planejadas
- [ ] Exportação e importação do catálogo em formato JSON.
- [ ] Integração com backend (Node.js/Express ou Firebase/Supabase) para sincronização multiusuário.
- [ ] Emissão de comprovante em PDF e impressão térmica de comanda.

---

## 👩‍💻 Autora

Desenvolvido por **Karla Castro**  
*Gestora de Comunidade Tech & Desenvolvedora de Software*

- **LinkedIn:** [linkedin.com/in/karlaj-castro](https://www.linkedin.com/in/karlaj-castro/)
- **GitHub:** [@karla08C](https://github.com/karla08C)

---

## 📄 Licença
Distribuído sob a licença **MIT**. Consulte `LICENSE` para mais informações.
