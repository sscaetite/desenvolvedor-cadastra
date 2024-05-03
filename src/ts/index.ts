interface Product {
  id: string;
  name: string;
  price: number;
  parcelamento: number[];
  color: string;
  image: string;
  size: string[];
  date: string;
}

interface ProductInCart extends Product {
  quantity: number;
}

interface ProductsWithFilters {
  products: Product[];
  isLastPage: boolean;
  page: number;
  allProducts: Product[];
}

interface ApplyFiltersButtonAttributes {
  colors: string;
  sizes: string;
  priceMin: string;
  priceMax: string;
}

const applyFiltersButtonAttr: ApplyFiltersButtonAttributes = {
  colors: 'data-filter-colors',
  sizes: 'data-filter-sizes',
  priceMin: 'data-filter-price-min',
  priceMax: 'data-filter-price-max',
};

const serverUrl = 'http://localhost:5000/products';

// Função responsável por fazer a requisição HTTP para obter os produtos do servidor
const fetchProducts = async (url: string): Promise<Product[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao fazer requisição GET: ${response.statusText}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Data is not an array');
  }
  return data as Product[];
};

// Função responsável por filtrar os produtos com base nos parâmetros de consulta
const filterProducts = (
  products: Product[],
  queryParams: {
    colors: string[];
    sizes: string[];
    priceMin: number;
    priceMax: number;
    itemsPerPage: number;
    page: number;
  },
): ProductsWithFilters => {
  let filteredProducts = [...products];

  // Filtrar por cores, se houver cores especificadas nos parâmetros de consulta
  if (queryParams.colors && queryParams.colors.length > 0) {
    filteredProducts = filteredProducts.filter(product =>
      queryParams.colors.includes(product.color),
    );
  }

  // Filtrar por tamanhos, se houver tamanhos especificados nos parâmetros de consulta
  if (queryParams.sizes && queryParams.sizes.length > 0) {
    filteredProducts = filteredProducts.filter(product =>
      product.size.some(size => queryParams.sizes!.includes(size)),
    );
  }

  // Filtrar por preço mínimo, se houver um preço mínimo especificado nos parâmetros de consulta
  if (queryParams.priceMin || queryParams.priceMin === 0) {
    filteredProducts = filteredProducts.filter(
      product => product.price >= queryParams.priceMin!,
    );
  }

  // Filtrar por preço máximo, se houver um preço máximo especificado nos parâmetros de consulta
  if (queryParams.priceMax) {
    filteredProducts = filteredProducts.filter(
      product => product.price <= queryParams.priceMax!,
    );
  }

  // Paginar os produtos com base no número de itens por página e na página atual
  const startIndex = queryParams.itemsPerPage * queryParams.page;
  const endIndex = startIndex + queryParams.itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  return {
    products: paginatedProducts,
    page: queryParams.page,
    isLastPage: endIndex >= filteredProducts.length,
    allProducts: products,
  };
};

// Função principal responsável por obter produtos com filtragem e paginação
const getProducts = async (
  page: number = 0,
  sort: string = '',
  order: string = '',
): Promise<ProductsWithFilters> => {
  const urlToFetch = new URL(
    `${serverUrl}${sort ? `/?_sort=${sort}` : ''}${
      !sort && order
        ? `/?_order=${order}`
        : sort && order
        ? `&_order=${order}`
        : ''
    }`,
  );

  const url = new URL(window.location.href);

  const params = new URLSearchParams(url.search);

  // Extrair os parâmetros de consulta da URL e definir valores padrão se não forem fornecidos
  const queryParams = {
    page: page ? page : params.has('page') ? parseInt(params.get('page')!) : 0,
    colors: params.has('colors') ? params.get('colors')!.split(',') : [],
    sizes: params.has('sizes') ? params.get('sizes')!.split(',') : [],
    priceMin: params.has('priceMin') ? parseFloat(params.get('priceMin')!) : 0,
    priceMax: params.has('priceMax') ? parseFloat(params.get('priceMax')!) : 0,
    itemsPerPage: params.has('itemsPerPage')
      ? parseInt(params.get('itemsPerPage')!)
      : 6,
  };

  // Obter os produtos do servidor com base na URL construída
  const products = await fetchProducts(urlToFetch.toString());

  // Filtrar os produtos com base nos parâmetros de consulta e retornar produtos paginados
  return filterProducts(products, queryParams);
};

// Função para limpar a lista de produtos removendo o conteúdo HTML da prateleira de produtos
const cleanListOfProducts = () => {
  const productsShelf = document.querySelector(
    '.products-shelf',
  ) as HTMLElement;

  if (productsShelf) {
    productsShelf.innerHTML = '';
  }
};

// Função para ordenar os tamanhos de forma personalizada
const orderSizes = (allSizes: string[] = []): string[] => {
  // Ordena os tamanhos com base em regras personalizadas
  return allSizes.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    const isNumberA = !isNaN(numA);
    const isNumberB = !isNaN(numB);

    // Se ambos os valores são números, ordena numericamente
    if (isNumberA && isNumberB) {
      return numA - numB;
    } else if (isNumberA) {
      // Se apenas o primeiro valor é um número, coloca-o antes
      return -1;
    } else if (isNumberB) {
      // Se apenas o segundo valor é um número, coloca-o antes
      return 1;
    } else {
      // Se nenhum dos valores é um número, aplica uma ordem pré-definida
      const sizeOrder = ['U', 'PP', 'P', 'M', 'G', 'GG'];
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);
      return indexA - indexB;
    }
  });
};

// Função para adicionar produtos à prateleira de produtos na página
const addProductsToContainer = (
  products: Product[],
  cleanAllProducts: boolean = true,
): void => {
  // Seleciona o elemento HTML da prateleira de produtos
  const productsShelf = document.querySelector(
    '.products-shelf',
  ) as HTMLElement;

  // Se o elemento da prateleira de produtos não for encontrado, retorna
  if (!productsShelf) return;

  // Limpa todos os produtos existentes na prateleira, se necessário
  if (cleanAllProducts) {
    cleanListOfProducts(); // Chama a função para limpar a lista de produtos na prateleira
  }

  // Cria uma lista de produtos (ul) se ainda não existir
  const productList = document.querySelector('ul.product-list')
    ? document.querySelector('ul.product-list')
    : (() => {
        const newProductList = document.createElement('ul');
        newProductList.classList.add('product-list');
        return newProductList;
      })();

  // Para cada produto na lista de produtos fornecida, cria e adiciona um item de produto à lista
  products.forEach(product => {
    // Cria um item de lista (li) para o produto
    const productItem = document.createElement('li');
    productItem.classList.add('product-item');

    // Cria um contêiner para os detalhes do produto
    const productDetails = document.createElement('div');
    productDetails.classList.add('product-details');

    // Cria uma imagem do produto
    const productImage = document.createElement('img');
    productImage.classList.add('product-image');
    productImage.src = product.image;
    productImage.alt = product.name;

    // Contêiner para a imagem do produto
    const productImageContainer = document.createElement('div');
    productImageContainer.classList.add('product-image-container');
    productImageContainer.appendChild(productImage);

    // Nome do produto
    const productName = document.createElement('h3');
    productName.classList.add('product-name');
    productName.textContent = product.name;

    // Preço do produto
    const productPrice = document.createElement('p');
    productPrice.classList.add('product-price');
    productPrice.textContent = `R$ ${product.price
      .toFixed(2)
      .replace('.', ',')}`;

    // Parcelamento do produto
    const productInstallments = document.createElement('span');
    productInstallments.classList.add('product-installments');
    productInstallments.textContent = `até ${
      product.parcelamento[0]
    }x de R$${product.parcelamento[1].toFixed(2).replace('.', ',')}`;

    // Botão de compra do produto
    const buyButton = document.createElement('button');
    buyButton.classList.add('buy-button');
    buyButton.textContent = 'Comprar';
    buyButton.setAttribute('data-product-info', JSON.stringify(product));
    buyButton.addEventListener('click', handleAddToCart);

    // Adiciona todos os elementos dos detalhes do produto ao contêiner de detalhes do produto
    productDetails.appendChild(productImageContainer);
    productDetails.appendChild(productName);
    productDetails.appendChild(productPrice);
    productDetails.appendChild(productInstallments);
    productDetails.appendChild(buyButton);

    // Adiciona o contêiner de detalhes do produto ao item da lista de produtos
    productItem.appendChild(productDetails);

    // Adiciona o item da lista de produtos à lista de produtos
    productList.appendChild(productItem);
  });

  // Adiciona a lista de produtos à prateleira de produtos, se todos os produtos foram limpos
  if (cleanAllProducts) {
    productsShelf.appendChild(productList);
  }
};

// Função para atualizar o distintivo de quantidade no minicarrinho
const changeMinicartQuantityBadge = (): void => {
  // Seleciona o elemento HTML que exibe a quantidade no minicarrinho
  const minicartQuantitySpan = document.querySelector(
    '.minicart-quantity',
  ) as HTMLSpanElement;

  // Obtém os itens do carrinho do armazenamento local (localStorage)
  const cartItemsJSON = localStorage.getItem('cart');
  const cartItems: ProductInCart[] = cartItemsJSON
    ? JSON.parse(cartItemsJSON)
    : [];

  // Calcula o número total de itens no carrinho somando as quantidades de todos os produtos
  const totalQuantity = cartItems.reduce(
    (total, item) => total + (item.quantity || 0),
    0,
  );

  // Verifica se o elemento HTML do distintivo de quantidade foi encontrado
  if (minicartQuantitySpan) {
    if (totalQuantity > 0) {
      // Se houver itens no carrinho, exibe a quantidade e remove a classe 'hidden' para mostrar o distintivo
      minicartQuantitySpan.innerText = totalQuantity.toString();
      minicartQuantitySpan.classList.remove('hidden');
    } else {
      // Se não houver itens no carrinho, remove o conteúdo e adiciona a classe 'hidden' para ocultar o distintivo
      minicartQuantitySpan.innerText = '';
      minicartQuantitySpan.classList.add('hidden');
    }
  }
};

// Função de tratamento de evento para adicionar o produto ao carrinho de compras
const handleAddToCart = (event: Event) => {
  // Obtém o botão que disparou o evento de clique
  const button = event.target as HTMLButtonElement;

  // Obtém o atributo 'data-product-info' do botão, que contém as informações do produto em formato JSON
  const productInfo = button.getAttribute('data-product-info');

  // Verifica se as informações do produto foram encontradas no atributo do botão
  if (productInfo) {
    // Faz o parsing das informações do produto para o tipo ProductInCart
    const parsedProductInfo: ProductInCart = JSON.parse(productInfo);
    const { id } = parsedProductInfo; // Extrai o ID do produto

    // Obtém os itens do carrinho do armazenamento local (localStorage)
    const cartItemsJSON = localStorage.getItem('cart');
    let cartItems: ProductInCart[] = cartItemsJSON
      ? JSON.parse(cartItemsJSON)
      : [];

    // Verifica se o produto já existe no carrinho com base no ID
    const existingProduct = cartItems.find(item => item.id === id);

    // Se o produto já existe no carrinho, incrementa a quantidade; caso contrário, adiciona o produto ao carrinho
    if (existingProduct) {
      existingProduct.quantity++; // Incrementa a quantidade do produto no carrinho
    } else {
      cartItems.push({ ...parsedProductInfo, quantity: 1 }); // Adiciona o produto ao carrinho com quantidade inicial de 1
    }

    // Atualiza os itens do carrinho no armazenamento local (localStorage)
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }

  // Chama a função para atualizar o número de itens exibido no distintivo do minicarrinho
  changeMinicartQuantityBadge();
};

const addFilters = (products: Product[]): void => {
  const url = new URL(window.location.href);

  const params = new URLSearchParams(url.search);

  const queryParams = {
    colors: params.has('colors') ? params.get('colors').split(',') : [],
    sizes: params.has('sizes') ? params.get('sizes').split(',') : [],
    priceMin: params.has('priceMin')
      ? parseFloat(params.get('priceMin') || '0')
      : false,
    priceMax: params.has('priceMax')
      ? parseFloat(params.get('priceMax') || '0')
      : false,
  } as {
    colors: string[];
    sizes: string[];
    priceMin: number;
    priceMax: number;
  };

  let allColors: string[] = [];
  let allSizes: string[] = [];
  const priceRanges = [
    { min: 0, max: 50 },
    { min: 51, max: 150 },
    { min: 151, max: 300 },
    { min: 301, max: 500 },
    { min: 500 },
  ];

  const colorsFilter = document.querySelector(
    '.filter-by-modal .modal-content .modal-filter-item.colors .modal-filter-content',
  );
  const colorsFilterDesktop = document.querySelector(
    '.filters-sidebar .modal-filter-item.colors .modal-filter-content',
  );
  const colorsFilterDiv = document.querySelector(
    '.filter-by-modal .modal-content .modal-filter-item.colors',
  );
  const colorsFilterDivDesktop = document.querySelector(
    '.filters-sidebar .modal-filter-item.colors',
  );

  const sizesFilter = document.querySelector(
    '.filter-by-modal .modal-content .modal-filter-item.sizes .modal-filter-content',
  );
  const sizesFilterDesktop = document.querySelector(
    '.filters-sidebar .modal-filter-item.sizes .modal-filter-content',
  );
  const sizesFilterDiv = document.querySelector(
    '.filter-by-modal .modal-content .modal-filter-item.sizes',
  );
  const sizesFilterDivDesktop = document.querySelector(
    '.filters-sidebar .modal-filter-item.sizes',
  );

  const pricesFilter = document.querySelector(
    '.filter-by-modal .modal-content .modal-filter-item.prices .modal-filter-content',
  );
  const pricesFilterDesktop = document.querySelector(
    '.filters-sidebar .modal-filter-item.prices .modal-filter-content',
  );
  const pricesFilterDivDesktop = document.querySelector(
    '.filters-sidebar .modal-filter-item.prices',
  );

  const applyFiltersButton = document.querySelector(
    '.filter-by-apply',
  ) as HTMLButtonElement;

  applyFiltersButton.setAttribute(
    applyFiltersButtonAttr.colors,
    queryParams.colors.join(','),
  );

  applyFiltersButton.setAttribute(
    applyFiltersButtonAttr.sizes,
    queryParams.sizes.join(','),
  );

  if (queryParams.priceMin || queryParams.priceMin === 0) {
    applyFiltersButton.setAttribute(
      applyFiltersButtonAttr.priceMin,
      queryParams.priceMin.toString(),
    );
  }

  if (queryParams.priceMax) {
    applyFiltersButton.setAttribute(
      applyFiltersButtonAttr.priceMax,
      queryParams.priceMax.toString(),
    );
  }

  products.forEach(product => {
    if (!allColors.includes(product.color)) allColors.push(product.color);

    allSizes = [
      ...allSizes,
      ...product.size.filter(size => !allSizes.includes(size)),
    ];
  });

  if (colorsFilter) {
    colorsFilter.innerHTML = '';
    colorsFilterDesktop.innerHTML = '';
    colorsFilterDiv.classList.remove('hidden');
    colorsFilterDivDesktop.classList.remove('hidden');

    allColors.forEach(color => {
      const filterColorButton = document.createElement(
        'button',
      ) as HTMLButtonElement;
      filterColorButton.classList.add('modal-filter-color');
      filterColorButton.setAttribute(
        'data-selected',
        queryParams.colors.includes(color) ? 'true' : 'false',
      );
      filterColorButton.textContent = color;

      filterColorButton.addEventListener(`click`, () => {
        const isSelected = Boolean(
          filterColorButton.getAttribute('data-selected') === 'true',
        );

        const newSelectedValue = !isSelected;

        filterColorButton.setAttribute(
          'data-selected',
          newSelectedValue.toString(),
        );

        if (!isSelected) {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.colors,
            `${[
              ...applyFiltersButton
                .getAttribute(applyFiltersButtonAttr.colors)
                .split(',')
                .filter(filter => filter !== ''),
              color,
            ].join(`,`)}`,
          );
        } else {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.colors,
            applyFiltersButton
              .getAttribute(applyFiltersButtonAttr.colors)
              .split(`,`)
              .filter(filter => filter !== color && filter !== '')
              .join(`,`),
          );
        }
      });

      colorsFilter.appendChild(filterColorButton);
      colorsFilterDesktop.appendChild(filterColorButton);
    });
  } else colorsFilterDiv.classList.add('hidden');

  if (sizesFilter) {
    sizesFilter.innerHTML = '';
    sizesFilterDesktop.innerHTML = '';
    sizesFilterDiv.classList.remove('hidden');
    sizesFilterDivDesktop.classList.remove('hidden');

    orderSizes(allSizes).forEach(size => {
      const filterSizeButton = document.createElement(
        'button',
      ) as HTMLButtonElement;
      filterSizeButton.classList.add('modal-filter-size');
      filterSizeButton.setAttribute(
        'data-selected',
        queryParams.sizes.includes(size) ? 'true' : 'false',
      );
      filterSizeButton.textContent = size;

      filterSizeButton.addEventListener(`click`, () => {
        const isSelected = Boolean(
          filterSizeButton.getAttribute('data-selected') === 'true',
        );

        const newSelectedValue = !isSelected;

        filterSizeButton.setAttribute(
          'data-selected',
          newSelectedValue.toString(),
        );

        if (!isSelected) {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.sizes,
            `${[
              ...applyFiltersButton
                .getAttribute(applyFiltersButtonAttr.sizes)
                .split(',')
                .filter(filter => filter !== ''),
              size,
            ].join(`,`)}`,
          );
        } else {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.sizes,
            applyFiltersButton
              .getAttribute(applyFiltersButtonAttr.sizes)
              .split(`,`)
              .filter(filter => filter !== size && filter !== '')
              .join(`,`),
          );
        }
      });

      sizesFilter.appendChild(filterSizeButton);
      sizesFilterDesktop.appendChild(filterSizeButton);
    });
  } else sizesFilterDiv.classList.add('hidden');

  if (pricesFilter) {
    pricesFilter.innerHTML = '';
    pricesFilterDesktop.innerHTML = '';
    pricesFilterDivDesktop.classList.remove('hidden');

    priceRanges.forEach(price => {
      const filterPriceButton = document.createElement(
        'button',
      ) as HTMLButtonElement;
      filterPriceButton.classList.add('modal-filter-price');
      filterPriceButton.textContent = price.max
        ? `de R$${price.min} até R$${price.max}`
        : `a partir de R$${price.min}`;
      filterPriceButton.setAttribute(
        'data-selected',
        price.min === queryParams.priceMin &&
          (price.max
            ? price.max === queryParams.priceMax
            : !queryParams.priceMax)
          ? 'true'
          : 'false',
      );

      filterPriceButton.addEventListener('click', () => {
        const allPriceButtons = document.querySelectorAll(
          'button.modal-filter-price',
        ) as NodeListOf<HTMLButtonElement>;

        allPriceButtons.forEach(button => {
          if (
            button === filterPriceButton &&
            button.getAttribute('data-selected') !== 'true'
          )
            button.setAttribute('data-selected', 'true');
          else button.setAttribute('data-selected', 'false');
        });

        if (
          (price.min || price.min === 0) &&
          filterPriceButton.getAttribute('data-selected') === 'true'
        ) {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.priceMin,
            price.min.toString(),
          );
        } else
          applyFiltersButton.removeAttribute(applyFiltersButtonAttr.priceMin);

        if (
          price.max &&
          filterPriceButton.getAttribute('data-selected') === 'true'
        ) {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.priceMax,
            price.max.toString(),
          );
        } else
          applyFiltersButton.removeAttribute(applyFiltersButtonAttr.priceMax);
      });

      pricesFilter.appendChild(filterPriceButton);
      pricesFilterDesktop.appendChild(filterPriceButton);
    });
  }
};

// Função para obter os filtros aplicados do botão de aplicar filtros
const getAppliedFilters = (
  applyFiltersButton: HTMLButtonElement,
): URLSearchParams => {
  const params = new URLSearchParams();

  const filterColors = applyFiltersButton.getAttribute(
    applyFiltersButtonAttr.colors,
  );
  if (filterColors) params.set('colors', filterColors);

  const filterSizes = applyFiltersButton.getAttribute(
    applyFiltersButtonAttr.sizes,
  );
  if (filterSizes) params.set('sizes', filterSizes);

  const filterPriceMin = applyFiltersButton.getAttribute(
    applyFiltersButtonAttr.priceMin,
  );
  if (filterPriceMin) params.set('priceMin', filterPriceMin);

  const filterPriceMax = applyFiltersButton.getAttribute(
    applyFiltersButtonAttr.priceMax,
  );
  if (filterPriceMax) params.set('priceMax', filterPriceMax);

  return params;
};

// Função para redirecionar para a nova URL com os filtros aplicados
const redirectWithFilters = (params: URLSearchParams): void => {
  const url = new URL(window.location.href);
  url.search = params.toString();
  window.location.href = url.toString();
};

// Função principal para aplicar os filtros ao clicar no botão de aplicar
const applyFilters = (): void => {
  const applyFiltersButton = document.querySelector(
    '.filter-by-apply',
  ) as HTMLButtonElement;

  if (applyFiltersButton) {
    applyFiltersButton.addEventListener('click', () => {
      const appliedFilters = getAppliedFilters(applyFiltersButton);
      redirectWithFilters(appliedFilters);
    });
  }
};

const cleanFilters = () => {
  const cleanFiltersButtons = document.querySelectorAll(
    'button.filter-by-clean',
  ) as NodeListOf<HTMLButtonElement>;

  if (cleanFiltersButtons)
    cleanFiltersButtons.forEach(button => {
      button.addEventListener('click', () => (window.location.href = `/`));
    });
};

const addFiltersChevronsAction = () => {
  const chevronsCollection = document.querySelectorAll(
    'button.modal-filter-chevron',
  ) as NodeListOf<HTMLButtonElement>;

  if (chevronsCollection) {
    chevronsCollection.forEach(button => {
      button.addEventListener('click', () => {
        let modalFilterItem: HTMLElement | null =
          button.closest('.modal-filter-item');

        if (modalFilterItem) {
          const modalFilterContent = modalFilterItem.querySelector(
            '.modal-filter-content',
          );

          if (modalFilterContent) {
            const isHidden = modalFilterContent.classList.contains('hidden');

            if (isHidden) {
              modalFilterContent.classList.remove('hidden');
              button.style.transform = 'rotate(180deg)';
            } else {
              modalFilterContent.classList.add('hidden');
              button.style.transform = 'rotate(0deg)';
            }
          }
        }
      });
    });
  }
};

const loadMoreProducts = (
  isLastPage: boolean = true,
  page: number = 0,
  sort: string = '',
  order: string = '',
) => {
  const loadMoreContainer = document.querySelector('div.products-load-more');
  const oldLoadMore = document.querySelector('button.load-more-button');

  if (oldLoadMore) oldLoadMore.remove();

  if (!isLastPage && loadMoreContainer) {
    const loadMoreButton = document.createElement(
      'button',
    ) as HTMLButtonElement;
    loadMoreButton.classList.add('load-more-button');
    loadMoreButton.textContent = 'Carregar mais';
    loadMoreButton.setAttribute('data-page', (page + 1).toString());
    loadMoreButton.setAttribute('data-sort', sort);
    loadMoreButton.setAttribute('data-order', order);

    loadMoreButton.addEventListener(`click`, () => {
      const dataPage = loadMoreButton.getAttribute('data-page');

      getProducts(
        dataPage && parseInt(dataPage),
        loadMoreButton.getAttribute('data-sort' || undefined),
        loadMoreButton.getAttribute('data-order' || undefined),
      ).then((data): void => {
        addProductsToContainer(data.products, false);

        loadMoreButton.setAttribute('data-page', (data.page + 1).toString());

        if (data.isLastPage) {
          loadMoreButton.classList.add('hidden');
        }
      });
    });

    loadMoreContainer.appendChild(loadMoreButton);
  }
};

const addOrderButtonsAction = () => {
  const orderByButtons = document.querySelectorAll(
    'button.modal-content-link',
  ) as NodeListOf<HTMLButtonElement>;

  const orderByDesktopContent = document.querySelector(
    '.order-by-desktop .order-by-desktop-container',
  );

  if (orderByButtons) {
    orderByButtons.forEach(button => {
      const order = button.getAttribute('data-order') || '';
      const sort = button.getAttribute('data-sort') || '';

      button.addEventListener('click', () => {
        const modalElement = document.querySelector(
          'div.order-by-modal',
        ) as HTMLElement;

        if (!!modalElement) {
          modalElement.style.transform = 'translateX(-100vw)';
          setTimeout(() => modalElement.classList.add('hidden'), 200);
        }

        getProducts(0, sort, order).then((data): void => {
          addProductsToContainer(data.products, true);
          loadMoreProducts(data.isLastPage, data.page, sort, order);
        });

        if (orderByDesktopContent) {
          orderByDesktopContent.classList.contains('hidden')
            ? orderByDesktopContent.classList.remove('hidden')
            : orderByDesktopContent.classList.add('hidden');
        }
      });
    });
  }
};

// Responsabilidade de manipulação de visibilidade
const toggleVisibility = (element: HTMLElement | null) => {
  if (element) {
    element.classList.toggle('hidden');
  }
};

// Responsabilidade de associar eventos aos botões de ordenação na área desktop
const attachOrderByDesktopButtonEvents = () => {
  const orderByDesktopTrigger = document.querySelector(
    '.order-by-desktop .order-by-desktop-button',
  ) as HTMLButtonElement;

  const orderByDesktopContent = document.querySelector(
    '.order-by-desktop .order-by-desktop-container',
  ) as HTMLButtonElement;

  if (orderByDesktopTrigger && orderByDesktopContent) {
    orderByDesktopTrigger.addEventListener('click', () => {
      toggleVisibility(orderByDesktopContent);
    });
  }
};

// Responsabilidade de inicializar os eventos relacionados aos botões de ordenação na área desktop
const initializeOrderByDesktopActions = () => {
  attachOrderByDesktopButtonEvents();
};

// Função para fechar todos os modais. Utilizada para não deixar modais abertos no desktop
const closeAllModals = () => {
  const allModals = document.querySelectorAll(
    '.modal',
  ) as NodeListOf<HTMLElement>;

  if (allModals) allModals.forEach(modal => modal.classList.add('hidden'));
};

const main = () => {
  applyFilters();
  cleanFilters();
  changeMinicartQuantityBadge();
  getProducts()
    .then((data): void => {
      addProductsToContainer(data.products);
      addFilters(data.allProducts);
      loadMoreProducts(data.isLastPage, data.page);
      addOrderButtonsAction();
      initializeOrderByDesktopActions();
    })
    .finally(() => addFiltersChevronsAction());
};

document.addEventListener('DOMContentLoaded', main);
