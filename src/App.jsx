import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Eye,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
  Move,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { defaultMenuItems } from './data/menuItems';

const categories = {
  entradas: { label: 'Entradas', className: 'category category-amber' },
  massas: { label: 'Massas', className: 'category category-rose' },
  bebidas: { label: 'Bebidas', className: 'category category-emerald' },
  sobremesas: { label: 'Sobremesas', className: 'category category-violet' },
};

const spiceOptions = ['Suave', 'Médio', 'Ardido'];
const whatsappNumber = '5511999999999';
const storageKey = 'gastronomia-sonho-menu-items-v3';
const passwordKey = 'gastronomia-sonho-admin-password';
const viewModeStorageKey = 'gastronomia-view-mode-v1';
const imgHeightStorageKey = 'gastronomia-img-height-v1';
const defaultAdminPassword = '1234';

const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const buildCartKey = (productId, extras, spiceLevel) => {
  const extrasKey = extras.map((extra) => extra.name).sort().join('|');
  return `${productId}::${spiceLevel || 'sem-tempero'}::${extrasKey}`;
};

const cloneMenu = (items) =>
  items.map((item) => ({
    ...item,
    image: item.image || '',
    imagePosition: item.imagePosition || 'center',
    imageFit: item.imageFit || 'cover',
    imageZoom: Number(item.imageZoom) || 1,
    tags: [...item.tags],
    extras: item.extras.map((extra) => ({ ...extra })),
  }));

const normalizeMenu = (items) =>
  items.map((item, index) => {
    const defaultItem = defaultMenuItems.find(
      (d) => d.id === Number(item.id) || d.name?.toLowerCase() === item.name?.toLowerCase(),
    );
    return {
      id: Number(item.id) || index + 1,
      name: item.name?.trim() || 'Novo prato',
      category: categories[item.category] ? item.category : 'entradas',
      price: Number(item.price) || 0,
      image: item.image || defaultItem?.image || '',
      imagePosition: item.imagePosition || defaultItem?.imagePosition || 'center',
      imageFit: item.imageFit || defaultItem?.imageFit || 'cover',
      imageZoom: Number(item.imageZoom || defaultItem?.imageZoom) || 1,
      description: item.description?.trim() || 'Descrição do prato.',
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
      isPopular: Boolean(item.isPopular || (Array.isArray(item.tags) && item.tags.some((t) => t.toLowerCase().includes('mais pedido')))),
      extras: Array.isArray(item.extras)
        ? item.extras
            .map((extra) => ({
              name: extra.name?.trim() || 'Adicional',
              price: Number(extra.price) || 0,
            }))
            .filter((extra) => extra.name)
        : [],
      spiceLevels: Boolean(item.spiceLevels),
    };
  });

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Standardizes and compresses images using HTML5 Canvas API.
 * Automatically center-crops and normalizes all photos to a standard 16:10 (600x375px)
 * aspect ratio so every dish image in the menu has the exact same uniform size.
 */
function compressAndReadImage(file, options = {}) {
  const {
    standardWidth = 600,
    standardHeight = 375, // Standard 16:10 aspect ratio for food cards
    quality = 0.76,
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP, GIF).'));
      return;
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const srcWidth = img.naturalWidth || img.width;
        const srcHeight = img.naturalHeight || img.height;

        // Calculate standard 16:10 crop coordinates
        const targetAspect = standardWidth / standardHeight;
        const srcAspect = srcWidth / srcHeight;

        let sWidth = srcWidth;
        let sHeight = srcHeight;
        let sx = 0;
        let sy = 0;

        if (srcAspect > targetAspect) {
          // Source is wider than standard target -> crop sides
          sHeight = srcHeight;
          sWidth = Math.round(srcHeight * targetAspect);
          sx = Math.round((srcWidth - sWidth) / 2);
          sy = 0;
        } else {
          // Source is taller than standard target -> crop top/bottom
          sWidth = srcWidth;
          sHeight = Math.round(srcWidth / targetAspect);
          sx = 0;
          sy = Math.round((srcHeight - sHeight) / 2);
        }

        // Create HTML5 Canvas for standard 600x375 output
        const canvas = document.createElement('canvas');
        canvas.width = standardWidth;
        canvas.height = standardHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível inicializar o contexto Canvas 2D.'));
          return;
        }

        // High quality bicubic resampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, standardWidth, standardHeight);
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, standardWidth, standardHeight);

        // Export standard compressed JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Calculate compressed byte size from Base64
        const head = 'data:image/jpeg;base64,';
        const base64Length = dataUrl.length - head.length;
        const compressedBytes = Math.round((base64Length * 3) / 4);

        const savedPercent = originalSize > 0
          ? Math.max(0, Math.round(((originalSize - compressedBytes) / originalSize) * 100))
          : 0;

        resolve({
          dataUrl,
          originalSize,
          compressedBytes,
          originalFormatted: formatBytes(originalSize),
          compressedFormatted: formatBytes(compressedBytes),
          savedPercent,
          width: standardWidth,
          height: standardHeight,
          ratio: '16:10 (600×375px)',
        });
      };

      img.onerror = () => reject(new Error('Falha ao processar o arquivo de imagem no Canvas.'));
      img.src = readerEvent.target.result;
    };

    reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

function loadMenu() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return cloneMenu(defaultMenuItems);
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length < defaultMenuItems.length) {
      return cloneMenu(defaultMenuItems);
    }
    return normalizeMenu(parsed);
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
  const [filter, setFilter] = useState('mais-pedidos');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminNotice, setAdminNotice] = useState('');
  const [newPassword, setNewPassword] = useState(defaultAdminPassword);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageCompressionStats, setImageCompressionStats] = useState(null);
  const fileInputRef = useRef(null);

  // Client view preferences
  const [viewMode, setViewMode] = useState(() => {
    try {
      return window.localStorage.getItem(viewModeStorageKey) || 'grid';
    } catch {
      return 'grid';
    }
  });

  const [imgHeight, setImgHeight] = useState(() => {
    try {
      return window.localStorage.getItem(imgHeightStorageKey) || 'normal';
    } catch {
      return 'normal';
    }
  });

  const [modalImageFit, setModalImageFit] = useState('cover');

  const [adminDraft, setAdminDraft] = useState({
    id: '',
    name: '',
    category: 'entradas',
    price: '',
    image: '',
    imagePosition: 'center',
    imageFit: 'cover',
    imageZoom: 1,
    description: '',
    tags: '',
    extras: '',
    spiceLevels: false,
    isPopular: false,
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
    try {
      window.localStorage.setItem(viewModeStorageKey, viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(imgHeightStorageKey, imgHeight);
    } catch {}
  }, [imgHeight]);

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
    if (filter === 'mais-pedidos') {
      return menu.filter((item) => Boolean(item.isPopular) || item.tags?.some((tag) => tag.toLowerCase().includes('mais pedido')));
    }
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
    setModalImageFit(product.imageFit || 'cover');
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

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const result = await compressAndReadImage(file);
      setAdminDraft((prev) => ({ ...prev, image: result.dataUrl }));
      setImageCompressionStats(result);
      setAdminNotice(`Foto otimizada via Canvas API (${result.originalFormatted} → ${result.compressedFormatted})`);
    } catch (err) {
      setAdminNotice(err.message || 'Erro ao carregar imagem.');
      setImageCompressionStats(null);
    } finally {
      setUploadingImage(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleFileDrop = async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const result = await compressAndReadImage(file);
      setAdminDraft((prev) => ({ ...prev, image: result.dataUrl }));
      setImageCompressionStats(result);
      setAdminNotice(`Foto otimizada via Canvas API (${result.originalFormatted} → ${result.compressedFormatted})`);
    } catch (err) {
      setAdminNotice(err.message || 'Erro ao carregar imagem.');
      setImageCompressionStats(null);
    } finally {
      setUploadingImage(false);
    }
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
      image: adminDraft.image ? adminDraft.image.trim() : '',
      imagePosition: adminDraft.imagePosition || 'center',
      imageFit: adminDraft.imageFit || 'cover',
      imageZoom: Number(adminDraft.imageZoom) || 1,
      description: adminDraft.description.trim(),
      tags: adminDraft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      isPopular: Boolean(adminDraft.isPopular),
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
    setImageCompressionStats(null);
    setAdminDraft({
      id: '',
      name: '',
      category: 'entradas',
      price: '',
      image: '',
      imagePosition: 'center',
      imageFit: 'cover',
      imageZoom: 1,
      description: '',
      tags: '',
      extras: '',
      spiceLevels: false,
      isPopular: false,
    });
  };

  const editDish = (item) => {
    setImageCompressionStats(null);
    setAdminDraft({
      id: item.id,
      name: item.name,
      category: item.category,
      price: String(item.price),
      image: item.image || '',
      imagePosition: item.imagePosition || 'center',
      imageFit: item.imageFit || 'cover',
      imageZoom: Number(item.imageZoom) || 1,
      description: item.description,
      tags: item.tags.join(', '),
      extras: item.extras.map((extra) => `${extra.name}:${extra.price}`).join(' | '),
      spiceLevels: item.spiceLevels,
      isPopular: Boolean(item.isPopular),
    });
    setAdminNotice('Editando prato selecionado.');
    setShowAdmin(true);
  };

  const deleteDish = (id) => {
    setMenu((previous) => previous.filter((item) => item.id !== id));
    setAdminNotice('Prato removido.');
  };

  const restoreDefaultMenu = () => {
    if (window.confirm('Deseja restaurar o cardápio padrão com fotos em alta definição?')) {
      const fresh = cloneMenu(defaultMenuItems);
      setMenu(fresh);
      window.localStorage.setItem(storageKey, JSON.stringify(fresh));
      setAdminNotice('Cardápio padrão restaurado.');
    }
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
    setImageCompressionStats(null);
    setAdminDraft({
      id: '',
      name: '',
      category: 'entradas',
      price: '',
      image: '',
      imagePosition: 'center',
      imageFit: 'cover',
      imageZoom: 1,
      description: '',
      tags: '',
      extras: '',
      spiceLevels: false,
      isPopular: false,
    });
  };

  return (
    <div className="app-shell">
      <noscript>
        <div className="noscript-banner">Este cardápio precisa de JavaScript para funcionar corretamente.</div>
      </noscript>

      <header className="hero">
        <p className="eyebrow">Gastronomia Sonho</p>
        <h1>Cardápio Digital</h1>
        <p className="hero-copy">Visualize os pratos, personalize seu pedido e acompanhe tudo em tempo real.</p>
      </header>

      <main className="page">
        <section className="filters" aria-label="Filtros de categoria">
          <button
            type="button"
            className={filter === 'mais-pedidos' ? 'filter-btn active category-amber' : 'filter-btn category-amber'}
            onClick={() => setFilter('mais-pedidos')}
          >
            Os Mais Pedidos
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

        {/* Menu View Options Toolbar */}
        <div className="menu-toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">
              <LayoutGrid size={15} /> Modo de Exibição:
            </span>
            <div className="toolbar-buttons" role="group" aria-label="Modo de visualização do cardápio">
              <button
                type="button"
                className={`toolbar-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Visualização padrão em cards padronizados"
              >
                <LayoutGrid size={14} /> Cards Padrão
              </button>
              <button
                type="button"
                className={`toolbar-btn ${viewMode === 'compact' ? 'active' : ''}`}
                onClick={() => setViewMode('compact')}
                title="Visualização em lista compacta com miniaturas"
              >
                <List size={14} /> Lista Compacta
              </button>
            </div>
          </div>

          <div className="toolbar-group standard-badge-group">
            <span className="standard-format-tag">
              📐 Tamanho Padrão: 16:10 (600×375px)
            </span>
          </div>
        </div>

        <section className={`menu-grid layout-${viewMode}`} aria-label="Menu">
          {filteredItems.length === 0 ? (
            <div className="empty-results-card">
              <p className="empty-title">Nenhum prato encontrado</p>
              <p className="empty-desc">Nenhum prato cadastrado nesta categoria.</p>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setFilter('mais-pedidos')}
              >
                Voltar para Os Mais Pedidos
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const category = categories[item.category] || { label: item.category || 'Geral', className: 'category category-amber' };
              return (
                <article key={item.id} className="menu-card">
                  <div className="dish-image-wrapper">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`dish-image ${item.imageFit === 'contain' ? 'contain-fit' : ''}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        style={{
                          objectPosition: item.imagePosition || 'center',
                          objectFit: item.imageFit || 'cover',
                          transform: item.imageZoom && item.imageZoom !== 1 ? `scale(${item.imageZoom})` : undefined,
                        }}
                      />
                    ) : (
                      <div className="dish-image-placeholder">
                        <ImageIcon size={36} strokeWidth={1.5} />
                        <span>Sem foto</span>
                      </div>
                    )}
                    <div className="dish-badges">
                      <span className={category.className}>{category.label}</span>
                      {item.isPopular && <span className="popular-badge">⭐ Destaque</span>}
                    </div>
                  </div>

                  <div className="menu-card-body">
                    <div className="menu-card-header-row">
                      <h2>{item.name}</h2>
                      <strong className="dish-price">{formatCurrency(item.price)}</strong>
                    </div>

                    <p className="menu-description">{item.description}</p>

                    {item.tags.length > 0 && (
                      <div className="tag-list">
                        {item.tags.map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button type="button" className="primary-btn" onClick={() => openProduct(item)}>
                    Personalizar Pedido
                  </button>
                </article>
              );
            })
          )}
        </section>

        <section className="bottom-actions">
          <button type="button" className="ghost-btn config-btn" onClick={toggleAdminMode}>
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
                <p>Digite a senha para liberar edição dos pratos e upload de fotos.</p>
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
                      <span>Nome do Prato</span>
                      <input value={adminDraft.name} onChange={(event) => setAdminDraft((previous) => ({ ...previous, name: event.target.value }))} placeholder="Ex: Risoto de Cogumelos" />
                    </label>
                    <label>
                      <span>Categoria</span>
                      <select value={adminDraft.category} onChange={(event) => setAdminDraft((previous) => ({ ...previous, category: event.target.value }))}>
                        <option value="entradas">Entradas</option>
                        <option value="massas">Massas</option>
                        <option value="bebidas">Bebidas</option>
                        <option value="sobremesas">Sobremesas</option>
                      </select>
                    </label>
                    <label>
                      <span>Preço (R$)</span>
                      <input type="number" step="0.01" value={adminDraft.price} onChange={(event) => setAdminDraft((previous) => ({ ...previous, price: event.target.value }))} placeholder="0.00" />
                    </label>

                    {/* Image Upload Zone */}
                    <div className="full-width image-upload-section">
                      <span className="field-title">Foto do Prato</span>
                      
                      <div
                        className={`image-dropzone ${adminDraft.image ? 'has-image' : ''}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleFileUpload}
                        />

                        {adminDraft.image ? (
                          <div className="dropzone-preview-box">
                            <img
                              src={adminDraft.image}
                              alt="Preview do prato"
                              className={`dropzone-preview-img ${adminDraft.imageFit === 'contain' ? 'contain-fit' : ''}`}
                              referrerPolicy="no-referrer"
                              style={{
                                objectPosition: adminDraft.imagePosition || 'center',
                                objectFit: adminDraft.imageFit || 'cover',
                                transform: adminDraft.imageZoom && adminDraft.imageZoom !== 1 ? `scale(${adminDraft.imageZoom})` : undefined,
                              }}
                            />
                            <div className="dropzone-overlay">
                              <Camera size={20} />
                              <span>Clique ou arraste para trocar a foto</span>
                            </div>
                          </div>
                        ) : (
                          <div className="dropzone-empty">
                            <Upload size={28} className="dropzone-icon" />
                            <p className="dropzone-main-text">
                              {uploadingImage ? 'Processando imagem...' : 'Clique para enviar uma foto ou arraste aqui'}
                            </p>
                            <span className="dropzone-sub-text">PNG, JPG, WebP ou GIF (otimização automática)</span>
                          </div>
                        )}
                      </div>

                      <div className="image-url-row">
                        <input
                          type="url"
                          placeholder="Ou cole a URL direta de uma imagem na web..."
                          value={adminDraft.image}
                          onChange={(e) => {
                            setImageCompressionStats(null);
                            setAdminDraft((prev) => ({ ...prev, image: e.target.value }));
                          }}
                        />
                        {adminDraft.image && (
                          <button
                            type="button"
                            className="ghost-btn danger image-remove-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageCompressionStats(null);
                              setAdminDraft((prev) => ({ ...prev, image: '' }));
                            }}
                            title="Remover foto"
                          >
                            <Trash2 size={16} /> Remover
                          </button>
                        )}
                      </div>

                      {/* Image Framing & Adjustments Toolbox */}
                      {adminDraft.image && (
                        <div className="image-adjust-card">
                          <div className="image-adjust-title">
                            <SlidersHorizontal size={15} />
                            <span>Ajustes de Enquadramento da Foto</span>
                          </div>

                          <div className="adjust-row">
                            <div className="adjust-row-header">
                              <span>Foco / Posição:</span>
                              <small>
                                {adminDraft.imagePosition === 'top'
                                  ? 'Topo / Cima'
                                  : adminDraft.imagePosition === 'bottom'
                                  ? 'Base / Baixo'
                                  : adminDraft.imagePosition === 'left'
                                  ? 'Esquerda'
                                  : adminDraft.imagePosition === 'right'
                                  ? 'Direita'
                                  : 'Centro'}
                              </small>
                            </div>
                            <div className="adjust-pill-group">
                              {[
                                { key: 'center', label: '⏺️ Centro' },
                                { key: 'top', label: '⬆️ Topo' },
                                { key: 'bottom', label: '⬇️ Base' },
                                { key: 'left', label: '⬅️ Esquerda' },
                                { key: 'right', label: '➡️ Direita' },
                              ].map((pos) => (
                                <button
                                  key={pos.key}
                                  type="button"
                                  className={`adjust-pill-btn ${(adminDraft.imagePosition || 'center') === pos.key ? 'active' : ''}`}
                                  onClick={() => setAdminDraft((prev) => ({ ...prev, imagePosition: pos.key }))}
                                >
                                  {pos.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="adjust-row">
                            <div className="adjust-row-header">
                              <span>Modo de Encaixe:</span>
                              <small>
                                {(adminDraft.imageFit || 'cover') === 'cover'
                                  ? 'Preencher (sem bordas)'
                                  : 'Foto Inteira (sem cortes)'}
                              </small>
                            </div>
                            <div className="adjust-pill-group">
                              <button
                                type="button"
                                className={`adjust-pill-btn ${(adminDraft.imageFit || 'cover') === 'cover' ? 'active' : ''}`}
                                onClick={() => setAdminDraft((prev) => ({ ...prev, imageFit: 'cover' }))}
                              >
                                Preencher (Cover)
                              </button>
                              <button
                                type="button"
                                className={`adjust-pill-btn ${adminDraft.imageFit === 'contain' ? 'active' : ''}`}
                                onClick={() => setAdminDraft((prev) => ({ ...prev, imageFit: 'contain' }))}
                              >
                                Foto Inteira (Contain)
                              </button>
                            </div>
                          </div>

                          <div className="adjust-row">
                            <div className="adjust-row-header">
                              <span>Zoom da Imagem:</span>
                              <span className="zoom-value">{Number(adminDraft.imageZoom || 1).toFixed(2)}x</span>
                            </div>
                            <div className="zoom-slider-row">
                              <input
                                type="range"
                                min="1"
                                max="1.5"
                                step="0.05"
                                value={adminDraft.imageZoom || 1}
                                onChange={(e) =>
                                  setAdminDraft((prev) => ({ ...prev, imageZoom: parseFloat(e.target.value) }))
                                }
                              />
                              <button
                                type="button"
                                className="adjust-pill-btn"
                                onClick={() => setAdminDraft((prev) => ({ ...prev, imageZoom: 1 }))}
                                title="Restaurar zoom original"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {imageCompressionStats && adminDraft.image && (
                        <div className="compression-info-pill">
                          <Sparkles size={14} className="compression-sparkle" />
                          <span>
                            Otimizada via Canvas API: <strong>{imageCompressionStats.originalFormatted}</strong> → <strong>{imageCompressionStats.compressedFormatted}</strong>
                            {imageCompressionStats.savedPercent > 0 && (
                              <span className="compression-savings"> (-{imageCompressionStats.savedPercent}%)</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <label className="full-width">
                      <span>Descrição detalhada</span>
                      <textarea rows="3" value={adminDraft.description} onChange={(event) => setAdminDraft((previous) => ({ ...previous, description: event.target.value }))} placeholder="Ingredientes nobres, modo de preparo e notas de sabor..." />
                    </label>
                    <label className="full-width">
                      <span>Tags (separadas por vírgula)</span>
                      <input value={adminDraft.tags} onChange={(event) => setAdminDraft((previous) => ({ ...previous, tags: event.target.value }))} placeholder="Ex: Mais Pedido, Sem glúten, Artesanal" />
                    </label>
                    <label className="full-width">
                      <span>Extras no formato Nome:Preço | Nome:Preço</span>
                      <input value={adminDraft.extras} onChange={(event) => setAdminDraft((previous) => ({ ...previous, extras: event.target.value }))} placeholder="Ex: Queijo parmesão:4.00 | Molho extra:5.00" />
                    </label>
                    <label className="checkbox-line full-width">
                      <input
                        type="checkbox"
                        checked={adminDraft.isPopular}
                        onChange={(event) => setAdminDraft((previous) => ({ ...previous, isPopular: event.target.checked }))}
                      />
                      <span>Destaque em "Os Mais Pedidos"</span>
                    </label>
                    <label className="checkbox-line full-width">
                      <input
                        type="checkbox"
                        checked={adminDraft.spiceLevels}
                        onChange={(event) => setAdminDraft((previous) => ({ ...previous, spiceLevels: event.target.checked }))}
                      />
                      <span>Permitir nível de tempero (Suave / Médio / Ardido)</span>
                    </label>
                  </div>

                  <div className="admin-form-footer">
                    <button type="button" className="primary-btn" onClick={saveDishDraft}>
                      {adminDraft.id ? 'Atualizar Prato' : 'Salvar Novo Prato'}
                    </button>
                  </div>

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
                  <div className="section-title-row">
                    <h3>Pratos cadastrados ({menu.length})</h3>
                    <button type="button" className="ghost-btn" onClick={restoreDefaultMenu} title="Restaurar pratos padrão com fotos">
                      Restaurar padrão
                    </button>
                  </div>
                  <div className="admin-items-list">
                    {menu.map((item) => (
                      <article key={item.id} className="admin-item">
                        <div className="admin-item-thumb-row">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="admin-item-thumb"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="admin-item-thumb-placeholder">
                              <ImageIcon size={18} />
                            </div>
                          )}
                          <div>
                            <strong>{item.name}</strong>
                            <p>
                              {categories[item.category]?.label || item.category} {item.isPopular ? '⭐' : ''} • {formatCurrency(item.price)}
                            </p>
                          </div>
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
                  <div className="cart-item-thumb-row">
                    {item.product.image && (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="cart-thumb"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div>
                      <h3>{item.product.name}</h3>
                      <p>{formatCurrency(item.total)}</p>
                    </div>
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
              <X size={20} />
            </button>

            {selectedProduct.image && (
              <div className="modal-image-wrapper">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className={`modal-image ${modalImageFit === 'contain' ? 'contain-fit' : ''}`}
                  referrerPolicy="no-referrer"
                  style={{
                    objectPosition: selectedProduct.imagePosition || 'center',
                    objectFit: modalImageFit,
                    transform:
                      selectedProduct.imageZoom && selectedProduct.imageZoom !== 1 && modalImageFit === 'cover'
                        ? `scale(${selectedProduct.imageZoom})`
                        : undefined,
                  }}
                />
                <div className="modal-image-actions">
                  <button
                    type="button"
                    className="modal-image-btn"
                    onClick={() => setModalImageFit((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
                    title="Alternar entre preencher e foto completa sem cortes"
                  >
                    {modalImageFit === 'cover' ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                    {modalImageFit === 'cover' ? 'Ver Inteira' : 'Preencher'}
                  </button>
                </div>
              </div>
            )}

            <div className="modal-content">
              <div>
                <span className={categories[selectedProduct.category]?.className || 'category'}>
                  {categories[selectedProduct.category]?.label || selectedProduct.category}
                </span>
                <h2 id="modal-title">{selectedProduct.name}</h2>
                <p className="menu-description">{selectedProduct.description}</p>
              </div>

              {selectedProduct.tags.length > 0 && (
                <div className="tag-list">
                  {selectedProduct.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

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

              {selectedProduct.extras.length > 0 && (
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
              )}

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

