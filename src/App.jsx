import { useEffect, useMemo, useState } from 'react';
import { defaultMenuItems } from './data/menuItems';

const categories = {
  entradas: { label: 'Entradas', className: 'category category-amber' },
  massas: { label: 'Massas', className: 'category category-rose' },
  sobremesas: { label: 'Sobremesas', className: 'category category-violet' },
};

const spiceOptions = ['Suave', 'Médio', 'Ardido'];
const whatsappNumber = '5511999999999';
const storageKey = 'gastronomia-sonho-menu-items';
const passwordKey = 'gastronomia-sonho-admin-password';
const defaultAdminPassword = '1234';

const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const buildCartKey = (productId, extras, spiceLevel) => {
  const extrasKey = extras.map((extra) => extra.name).sort().join('|');
  return `${productId}::${spiceLevel || 'sem-tempero'}::${extrasKey}`;
};

const cloneMenu = (items) =>
  items.map((item) => ({
    ...item,
    tags: [...item.tags],
    extras: item.extras.map((extra) => ({ ...extra })),
  }));

const normalizeMenu = (items) =>
  items.map((item, index) => ({
    id: Number(item.id) || index + 1,
    name: item.name?.trim() || 'Novo prato',
    category: categories[item.category] ? item.category : 'entradas',
    price: Number(item.price) || 0,
    description: item.description?.trim() || 'Descrição do prato.',
    tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    extras: Array.isArray(item.extras)
      ? item.extras
          .map((extra) => ({
            name: extra.name?.trim() || 'Adicional',
            price: Number(extra.price) || 0,
          }))
          .filter((extra) => extra.name)
      : [],
    spiceLevels: Boolean(item.spiceLevels),
  }));

function loadMenu() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return cloneMenu(defaultMenuItems);
    const parsed = JSON.parse(saved);
    return normalizeMenu(Array.isArray(parsed) ? parsed : defaultMenuItems);
  } catch {
    return cloneMenu(defaultMenuItems);
  }
}

function loadPassword() {
  try {
    const saved = window.localStorage.getItem(passwordKey);
    return saved || defaultAdminPassword;
  } catch {
    return defaultAdminPassword;
  }
}

function getItemTotals(item) {
  const extrasTotal = item.extras.reduce((sum, extra) => sum + extra.price, 0);
  const baseTotal = item.product.price * item.quantity;
  return {
    subtotal: baseTotal,
    extras: extrasTotal * item.quantity,
    total: (item.product.price + extrasTotal) * item.quantity,
  };
}

export default function App() {
  const [menu, setMenu] = useState(() => loadMenu());
  const [filter, setFilter] = useState('todas');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminNotice, setAdminNotice] = useState('');
  const [newPassword, setNewPassword] = useState(defaultAdminPassword);
  const [adminDraft, setAdminDraft] = useState({
    id: '',
    name: '',
    category: 'entradas',
    price: '',
    description: '',
    tags: '',
    extras: '',
    spiceLevels: false,
  });
  const [modalState, setModalState] = useState({
    product: null,
    quantity: 1,
    extras: [],
    spiceLevel: '',
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(menu));
  }, [menu]);

  useEffect(() => {
    if (adminUnlocked) {
      window.localStorage.setItem(passwordKey, newPassword || defaultAdminPassword);
    }
  }, [adminUnlocked, newPassword]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (modalState.product) {
        closeModal();
        return;
      }
      if (cartOpen) {
        setCartOpen(false);
        return;
      }
      if (showAdmin) {
        setShowAdmin(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cartOpen, modalState.product, showAdmin]);

  const filteredItems = useMemo(() => {
    if (filter === 'todas') return menu;
    return menu.filter((item) => item.category === filter);
  }, [filter, menu]);

  const summary = useMemo(() => {
    return cart.reduce(
      (acc, item) => {
        const totals = getItemTotals(item);
        acc.subtotal += totals.subtotal;
        acc.extras += totals.extras;
        acc.total += totals.total;
        acc.count += item.quantity;
        return acc;
      },
      { subtotal: 0, extras: 0, total: 0, count: 0 },
    );
  }, [cart]);

  const selectedProduct = modalState.product;
  const selectedExtrasTotal = modalState.extras.reduce((sum, extra) => sum + extra.price, 0);
  const selectedTotal = selectedProduct ? (selectedProduct.price + selectedExtrasTotal) * modalState.quantity : 0;

  const openProduct = (product) => {
    setModalState({
      product,
      quantity: 1,
      extras: [],
      spiceLevel: product.spiceLevels ? spiceOptions[0] : '',
    });
  };

  const closeModal = () => {
    setModalState({
      product: null,
      quantity: 1,
      extras: [],
      spiceLevel: '',
    });
  };

  const toggleExtra = (extra) => {
    setModalState((previous) => {
      const exists = previous.extras.some((selected) => selected.name === extra.name);
      const extras = exists
        ? previous.extras.filter((selected) => selected.name !== extra.name)
        : [...previous.extras, extra];
      return { ...previous, extras };
    });
  };

  const addToCart = () => {
    if (!selectedProduct) return;

    const extras = modalState.extras;
    const key = buildCartKey(selectedProduct.id, extras, modalState.spiceLevel);

    setCart((previous) => {
      const existing = previous.find((item) => item.key === key);
      if (existing) {
        return previous.map((item) => {
          if (item.key !== key) return item;
          const quantity = item.quantity + modalState.quantity;
          return {
            ...item,
            quantity,
            total: getItemTotals({ ...item, quantity }).total,
          };
        });
      }

      const newItem = {
        key,
        product: selectedProduct,
        quantity: modalState.quantity,
        extras,
        spiceLevel: modalState.spiceLevel,
      };

      return [...previous, { ...newItem, total: getItemTotals(newItem).total }];
    });

    setCartOpen(true);
    closeModal();
  };

  const removeItem = (key) => {
    setCart((previous) => previous.filter((item) => item.key !== key));
  };

  const changeCartQuantity = (key, delta) => {
    setCart((previous) =>
      previous.flatMap((item) => {
        if (item.key !== key) return [item];
        const quantity = item.quantity + delta;
        if (quantity <= 0) return [];
        return [{ ...item, quantity, total: getItemTotals({ ...item, quantity }).total }];
      }),
    );
  };

  const sendWhatsApp = () => {
    if (!cart.length) {
      window.alert('Seu carrinho está vazio. Adicione pelo menos um item antes de enviar o pedido.');
      return;
    }

    const lines = [
      'Olá! Gostaria de fazer o pedido:',
      '',
      ...cart.flatMap((item) => {
        const extrasText = item.extras.length ? ` | Extras: ${item.extras.map((extra) => extra.name).join(', ')}` : '';
        const spiceText = item.spiceLevel ? ` | Tempero: ${item.spiceLevel}` : '';
        return [`- ${item.quantity}x ${item.product.name}${extrasText}${spiceText} = ${formatCurrency(item.total)}`];
      }),
      '',
      `Total: ${formatCurrency(summary.total)}`,
    ];

    const message = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const saveDishDraft = () => {
    if (!adminDraft.name.trim()) {
      setAdminNotice('Informe o nome do prato.');
      return;
    }

    const nextItem = {
      id: adminDraft.id ? Number(adminDraft.id) : Date.now(),
      name: adminDraft.name.trim(),
      category: adminDraft.category,
      price: Number(adminDraft.price) || 0,
      description: adminDraft.description.trim(),
      tags: adminDraft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      extras: adminDraft.extras
        .split('|')
        .map((extra) => extra.trim())
        .filter(Boolean)
        .map((extra) => {
          const [name, price = '0'] = extra.split(':');
          return { name: name.trim(), price: Number(price) || 0 };
        }),
      spiceLevels: adminDraft.spiceLevels,
    };

    setMenu((previous) => {
      const exists = previous.some((item) => item.id === nextItem.id);
      return exists ? previous.map((item) => (item.id === nextItem.id ? nextItem : item)) : [nextItem, ...previous];
    });

    setAdminNotice('Prato salvo com sucesso.');
    setAdminDraft({
      id: '',
      name: '',
      category: 'entradas',
      price: '',
      description: '',
      tags: '',
      extras: '',
      spiceLevels: false,
    });
  };

  const editDish = (item) => {
    setAdminDraft({
      id: item.id,
      name: item.name,
      category: item.category,
      price: String(item.price),
      description: item.description,
      tags: item.tags.join(', '),
      extras: item.extras.map((extra) => `${extra.name}:${extra.price}`).join(' | '),
      spiceLevels: item.spiceLevels,
    });
    setAdminNotice('Editando prato selecionado.');
    setShowAdmin(true);
  };

  const deleteDish = (id) => {
    setMenu((previous) => previous.filter((item) => item.id !== id));
    setAdminNotice('Prato removido.');
  };

  const unlockAdmin = () => {
    if (adminPasswordInput === loadPassword()) {
      setAdminUnlocked(true);
      setNewPassword(loadPassword());
      setAdminNotice('Acesso liberado.');
      setShowAdmin(true);
      return;
    }
    setAdminNotice('Senha inválida.');
  };

  const toggleAdminMode = () => {
    if (!adminUnlocked) {
      setShowAdmin((previous) => !previous);
      return;
    }
    setShowAdmin((previous) => !previous);
  };

  const clearAdminDraft = () => {
    setAdminDraft({
      id: '',
      name: '',
      category: 'entradas',
      price: '',
      description: '',
      tags: '',
      extras: '',
      spiceLevels: false,
    });
  };

  return (
    <div className="app-shell">
      <noscript>
        <div className="noscript-banner">Este cardápio precisa de JavaScript para funcionar corretamente.</div>
      </noscript>

      <header className="hero">
        <p className="eyebrow">Gastronomia Sonho</p>
        <h1>Cardápio Digital Interativo</h1>
        <p className="hero-copy">Visualize os pratos, personalize seu pedido e acompanhe tudo em tempo real.</p>
      </header>

      <main className="page">
        <section className="top-actions">
          <button type="button" className="ghost-btn" onClick={toggleAdminMode}>
            {showAdmin ? 'Fechar Configuração' : 'Abrir Configuração'}
          </button>
        </section>

        {showAdmin ? (
          <section className="admin-panel">
            <div className="panel-header">
              <h2>Configuração do Cardápio</h2>
              {adminUnlocked ? <span className="admin-badge">Admin desbloqueado</span> : <span className="admin-badge warning">Acesso restrito</span>}
            </div>

            {!adminUnlocked ? (
              <div className="admin-login">
                <p>Digite a senha para liberar edição dos pratos.</p>
                <div className="admin-login-row">
                  <input
                    type="password"
                    placeholder="Senha"
                    value={adminPasswordInput}
                    onChange={(event) => setAdminPasswordInput(event.target.value)}
                  />
                  <button type="button" className="primary-btn" onClick={unlockAdmin}>
                    Entrar
                  </button>
                </div>
                <small>Senha padrão: 1234</small>
              </div>
            ) : (
              <div className="admin-layout">
                <div className="admin-form-card">
                  <div className="section-title-row">
                    <h3>{adminDraft.id ? 'Editar prato' : 'Adicionar prato'}</h3>
                    <button type="button" className="ghost-btn" onClick={clearAdminDraft}>
                      Limpar
                    </button>
                  </div>

                  <div className="admin-form-grid">
                    <label>
                      <span>Nome</span>
                      <input value={adminDraft.name} onChange={(event) => setAdminDraft((previous) => ({ ...previous, name: event.target.value }))} />
                    </label>
                    <label>
                      <span>Categoria</span>
                      <select value={adminDraft.category} onChange={(event) => setAdminDraft((previous) => ({ ...previous, category: event.target.value }))}>
                        <option value="entradas">Entradas</option>
                        <option value="massas">Massas</option>
                        <option value="sobremesas">Sobremesas</option>
                      </select>
                    </label>
                    <label>
                      <span>Preço</span>
                      <input type="number" step="0.01" value={adminDraft.price} onChange={(event) => setAdminDraft((previous) => ({ ...previous, price: event.target.value }))} />
                    </label>
                    <label className="full-width">
                      <span>Descrição</span>
                      <textarea rows="4" value={adminDraft.description} onChange={(event) => setAdminDraft((previous) => ({ ...previous, description: event.target.value }))} />
                    </label>
                    <label className="full-width">
                      <span>Tags separadas por vírgula</span>
                      <input value={adminDraft.tags} onChange={(event) => setAdminDraft((previous) => ({ ...previous, tags: event.target.value }))} />
                    </label>
                    <label className="full-width">
                      <span>Extras no formato Nome:Preço | Nome:Preço</span>
                      <input value={adminDraft.extras} onChange={(event) => setAdminDraft((previous) => ({ ...previous, extras: event.target.value }))} />
                    </label>
                    <label className="checkbox-line full-width">
                      <input
                        type="checkbox"
                        checked={adminDraft.spiceLevels}
                        onChange={(event) => setAdminDraft((previous) => ({ ...previous, spiceLevels: event.target.checked }))}
                      />
                      <span>Permitir nível de tempero</span>
                    </label>
                  </div>

                  <button type="button" className="primary-btn" onClick={saveDishDraft}>
                    Salvar prato
                  </button>

                  {adminUnlocked ? (
                    <div className="password-box">
                      <label>
                        <span>Alterar senha de acesso</span>
                        <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                      </label>
                      <button type="button" className="ghost-btn" onClick={() => window.localStorage.setItem(passwordKey, newPassword || defaultAdminPassword)}>
                        Salvar senha
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="admin-list-card">
                  <h3>Pratos cadastrados</h3>
                  <div className="admin-items-list">
                    {menu.map((item) => (
                      <article key={item.id} className="admin-item">
                        <div>
                          <strong>{item.name}</strong>
                          <p>
                            {item.category} • {formatCurrency(item.price)}
                          </p>
                        </div>
                        <div className="admin-actions">
                          <button type="button" className="ghost-btn" onClick={() => editDish(item)}>
                            Editar
                          </button>
                          <button type="button" className="ghost-btn danger" onClick={() => deleteDish(item.id)}>
                            Excluir
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {adminNotice ? <p className="admin-notice">{adminNotice}</p> : null}
          </section>
        ) : null}

        <section className="filters" aria-label="Filtros de categoria">
          <button type="button" className={filter === 'todas' ? 'filter-btn active' : 'filter-btn'} onClick={() => setFilter('todas')}>
            Todas
          </button>
          {Object.entries(categories).map(([key, category]) => (
            <button
              key={key}
              type="button"
              className={filter === key ? `filter-btn active ${category.className}` : `filter-btn ${category.className}`}
              onClick={() => setFilter(key)}
            >
              {category.label}
            </button>
          ))}
        </section>

        <section className="menu-grid" aria-label="Menu">
          {filteredItems.map((item) => {
            const category = categories[item.category];
            return (
              <article key={item.id} className="menu-card">
                <div className="menu-card-top">
                  <div>
                    <span className={category.className}>{category.label}</span>
                    <h2>{item.name}</h2>
                  </div>
                  <strong>{formatCurrency(item.price)}</strong>
                </div>
                <p className="menu-description">{item.description}</p>
                <div className="tag-list">
                  {item.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <button type="button" className="primary-btn" onClick={() => openProduct(item)}>
                  Ver detalhes e personalizar
                </button>
              </article>
            );
          })}
        </section>
      </main>

      <button type="button" className="cart-bar" onClick={() => setCartOpen(true)} aria-expanded={cartOpen} aria-controls="cart-sidebar">
        <span>
          <small>Seu Pedido</small>
          <strong>{formatCurrency(summary.total)}</strong>
        </span>
        <span className="cart-chip">Ver Carrinho ({summary.count})</span>
      </button>

      <aside id="cart-sidebar" className={cartOpen ? 'sidebar sidebar-open' : 'sidebar'} aria-hidden={!cartOpen}>
        <div className="sidebar-header">
          <h2>Meu Carrinho</h2>
          <button type="button" className="ghost-btn" onClick={() => setCartOpen(false)}>
            Fechar →
          </button>
        </div>

        <div className="cart-items">
          {!cart.length ? (
            <p className="empty-state">Seu carrinho está vazio.</p>
          ) : (
            cart.map((item) => (
              <article key={item.key} className="cart-item">
                <div className="cart-item-top">
                  <div>
                    <h3>{item.product.name}</h3>
                    <p>{formatCurrency(item.total)}</p>
                  </div>
                  <button type="button" className="ghost-btn" onClick={() => removeItem(item.key)}>
                    Remover
                  </button>
                </div>

                {item.extras.length > 0 ? <p className="cart-meta">Extras: {item.extras.map((extra) => extra.name).join(', ')}</p> : null}
                {item.spiceLevel ? <p className="cart-meta">Tempero: {item.spiceLevel}</p> : null}

                <div className="qty-row">
                  <button type="button" className="qty-btn" onClick={() => changeCartQuantity(item.key, -1)}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" className="qty-btn" onClick={() => changeCartQuantity(item.key, 1)}>
                    +
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="cart-summary">
          <div>
            <span>Subtotal itens:</span>
            <strong>{formatCurrency(summary.subtotal)}</strong>
          </div>
          <div>
            <span>Adicionais (Extras):</span>
            <strong>{formatCurrency(summary.extras)}</strong>
          </div>
          <div className="cart-total">
            <span>Total Geral:</span>
            <strong>{formatCurrency(summary.total)}</strong>
          </div>
          <button type="button" className="whatsapp-btn" onClick={sendWhatsApp}>
            Enviar Pedido via WhatsApp 💬
          </button>
        </div>
      </aside>

      {selectedProduct ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="close-btn" onClick={closeModal} aria-label="Fechar modal">
              ×
            </button>

            <div className="modal-content">
              <div>
                <span className={categories[selectedProduct.category].className}>{categories[selectedProduct.category].label}</span>
                <h2 id="modal-title">{selectedProduct.name}</h2>
                <p className="menu-description">{selectedProduct.description}</p>
              </div>

              <div className="tag-list">
                {selectedProduct.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="detail-box">
                <span>Preço base</span>
                <strong>{formatCurrency(selectedProduct.price)}</strong>
              </div>

              <div>
                <label className="field-label">Quantidade</label>
                <div className="qty-control">
                  <button type="button" className="qty-btn" onClick={() => setModalState((previous) => ({ ...previous, quantity: Math.max(1, previous.quantity - 1) }))}>
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={modalState.quantity}
                    onChange={(event) => setModalState((previous) => ({ ...previous, quantity: Math.max(1, Number(event.target.value) || 1) }))}
                  />
                  <button type="button" className="qty-btn" onClick={() => setModalState((previous) => ({ ...previous, quantity: previous.quantity + 1 }))}>
                    +
                  </button>
                </div>
              </div>

              {selectedProduct.spiceLevels ? (
                <div>
                  <label className="field-label" htmlFor="spice-level">
                    Nível de tempero
                  </label>
                  <select
                    id="spice-level"
                    value={modalState.spiceLevel}
                    onChange={(event) => setModalState((previous) => ({ ...previous, spiceLevel: event.target.value }))}
                  >
                    {spiceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="field-label">Adicionais</label>
                <div className="extras-list">
                  {selectedProduct.extras.map((extra) => {
                    const checked = modalState.extras.some((selected) => selected.name === extra.name);
                    return (
                      <label key={extra.name} className="extra-item">
                        <span>
                          <strong>{extra.name}</strong>
                          <small>+ {formatCurrency(extra.price)}</small>
                        </span>
                        <input type="checkbox" checked={checked} onChange={() => toggleExtra(extra)} />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="detail-box muted">Itens personalizados são adicionados ao carrinho com o preço total atualizado em tempo real.</div>

              <button type="button" className="primary-btn" onClick={addToCart}>
                Adicionar ao carrinho • {formatCurrency(selectedTotal)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
