#  Cardápio Digital Interativo

Cardápio digital da **Gastronomia Sonho** desenvolvido com **React + Vite**. O projeto permite visualizar pratos, personalizar pedidos, acompanhar o carrinho em tempo real e acessar uma área de configuração para editar os itens do cardápio.

## Visão Geral

Esta aplicação foi pensada para atender o fluxo de um restaurante pequeno ou médio, com foco em:

- navegação rápida pelo cardápio
- personalização de pedidos
- envio do pedido via WhatsApp
- painel de configuração para edição dos pratos
- persistência local das alterações no navegador

## Funcionalidades

- Catálogo com categorias: entradas, massas e sobremesas
- Modal de detalhes com adicionais, quantidade e nível de tempero
- Carrinho lateral com subtotal, extras e total geral
- Envio do pedido via WhatsApp
- Painel de configuração com senha para editar pratos
- Cadastro, edição e exclusão de itens do cardápio
- Salvamento automático em `localStorage`
- Interface responsiva para desktop e mobile

## Tecnologias Utilizadas

- **React 18**
- **Vite**
- **JavaScript (ES6+)**
- **CSS3**
- **localStorage** para persistência local

## Estrutura do Projeto

```bash
cardapio-digital/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── styles.css
│   └── data/
│       └── menuItems.js
└── node_modules/
```

## Como Executar

### Pré-requisitos

- Node.js instalado
- npm instalado

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

A aplicação ficará disponível em:

```bash
http://localhost:5173/
```

### Build de produção

```bash
npm run build
```

### Visualizar build

```bash
npm run preview
```

## Acesso à Configuração

O projeto possui uma área de configuração para editar pratos.

- Abra a aba **Configuração** na interface
- Use a senha padrão: `1234`
- Depois de desbloquear, você pode:
  - adicionar novos pratos
  - editar pratos existentes
  - excluir itens
  - alterar a senha de acesso
  - adicionar upload de imagem dos pratos

## Como Editar os Pratos

Os pratos iniciais ficam em:

```bash
src/data/menuItems.js
```

Mas, depois de rodar a aplicação, as alterações feitas na interface administrativa são salvas no navegador via `localStorage`.

Se quiser voltar ao cardápio original, basta limpar os dados salvos do navegador.

## Fluxo da Aplicação

1. O cliente visualiza o menu por categoria.
2. Ao abrir um prato, pode escolher quantidade, adicionais e tempero.
3. O item é adicionado ao carrinho com total atualizado.
4. O pedido pode ser enviado via WhatsApp.
5. O administrador pode abrir a configuração e editar os pratos.

## Personalização

O projeto pode ser ajustado facilmente em:

- `src/data/menuItems.js` para os pratos iniciais
- `src/App.jsx` para regras da interface e comportamento
- `src/styles.css` para visual e responsividade

## Próximos Passos Sugeridos

- exportar/importar cardápio em JSON
- sincronizar os pratos com um backend real
- criar autenticação mais segura para o painel
- integrar com banco de dados

## Licença

Projeto sob licença MIT.

## Autor

Desenvolvido para **Gastronomia Sonho**.
