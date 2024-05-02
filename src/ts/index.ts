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

const serverUrl = "http://localhost:5000/products";

const getProducts = async (
  page: number = 0,
  sort: string = "",
  order: string = ""
): Promise<ProductsWithFilters> => {
  const url = new URL(window.location.href);

  const params = new URLSearchParams(url.search);

  const queryParams = {
    page: page ? page : params.has("page") ? parseInt(params.get("page")) : 0,
    colors: params.has("colors") ? params.get("colors").split(",") : false,
    sizes: params.has("sizes") ? params.get("sizes").split(",") : false,
    priceMin: params.has("priceMin")
      ? parseFloat(params.get("priceMin") || "0")
      : false,
    priceMax: params.has("priceMax")
      ? parseFloat(params.get("priceMax") || "0")
      : false,
    itemsPerPage: params.has("itemsPerPage")
      ? parseInt(params.get("itemsPerPage"))
      : 6,
  } as {
    colors: string[];
    sizes: string[];
    priceMin: number;
    priceMax: number;
    itemsPerPage: number;
    page: number;
  };

  try {
    const response = await fetch(
      `${serverUrl}${sort ? `/?_sort=${sort}` : ""}${
        !sort && order
          ? `/?_order=${order}`
          : sort && order
          ? `&_order=${order}`
          : ""
      }`
    );

    if (!response.ok)
      throw new Error(`Erro ao fazer requisição GET: ${response.statusText}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Data is not an array");

    let products = data as Product[];
    let allFilteredProducts = [] as Product[];

    const allProducts = [...products];

    if (queryParams.colors) {
      products = products.filter((product) =>
        queryParams.colors.includes(product.color)
      );
    }

    if (queryParams.sizes) {
      products = products.filter((product) =>
        product.size.some((size) => queryParams.sizes.includes(size))
      );
    }

    if (queryParams.priceMin || queryParams.priceMin === 0) {
      products = products.filter(
        (product) => product.price >= queryParams.priceMin
      );
    }

    if (queryParams.priceMax) {
      products = products.filter(
        (product) => product.price <= queryParams.priceMax
      );
    }

    allFilteredProducts = [...products];

    products = products.slice(
      queryParams.itemsPerPage * queryParams.page,
      queryParams.itemsPerPage * queryParams.page + queryParams.itemsPerPage
    );

    return {
      products,
      page: queryParams.page,
      isLastPage:
        queryParams.page * queryParams.itemsPerPage + products.length >=
        allFilteredProducts.length,
      allProducts,
    };
  } catch (error) {
    throw error;
  }
};

const cleanListOfProducts = () => {
  const productsShelf = document.querySelector(
    ".products-shelf"
  ) as HTMLElement;

  if (!!productsShelf) productsShelf.innerHTML = "";
};

const orderSizes = (allSizes: string[] = []): string[] => {
  return allSizes.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    const isNumberA = !isNaN(numA);
    const isNumberB = !isNaN(numB);
    if (isNumberA && isNumberB) return numA - numB;
    else if (isNumberA) return -1;
    else if (isNumberB) return 1;
    else {
      const sizeOrder = ["U", "PP", "P", "M", "G", "GG"];
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);
      return indexA - indexB;
    }
  });
};

const addProductsToContainer = (
  products: Product[],
  cleanAllProducts: boolean = true
): void => {
  const productsShelf = document.querySelector(
    ".products-shelf"
  ) as HTMLElement;

  if (!productsShelf) return;

  if (cleanAllProducts) {
    cleanListOfProducts();
  }

  const productList = document.querySelector("ul.product-list")
    ? document.querySelector("ul.product-list")
    : (() => {
        const newProductList = document.createElement("ul");
        newProductList.classList.add("product-list");

        return newProductList;
      })();

  products.forEach((product) => {
    const productItem = document.createElement("li");
    productItem.classList.add("product-item");

    const productDetails = document.createElement("div");
    productDetails.classList.add("product-details");

    const productImage = document.createElement("img");
    productImage.classList.add("product-image");
    productImage.src = product.image;
    productImage.alt = product.name;

    const productImageContainer = document.createElement("div");
    productImageContainer.classList.add("product-image-container");
    productImageContainer.appendChild(productImage);

    const productName = document.createElement("h3");
    productName.classList.add("product-name");
    productName.textContent = product.name;

    const productPrice = document.createElement("p");
    productPrice.classList.add("product-price");
    productPrice.textContent = `R$ ${product.price
      .toFixed(2)
      .replace(".", ",")}`;

    const productInstallments = document.createElement("span");
    productInstallments.classList.add("product-installments");
    productInstallments.textContent = `até ${
      product.parcelamento[0]
    }x de R$${product.parcelamento[1].toFixed(2).replace(".", ",")}`;

    const buyButton = document.createElement("button");
    buyButton.classList.add("buy-button");
    buyButton.textContent = "Comprar";
    buyButton.setAttribute("data-product-info", JSON.stringify(product));
    buyButton.addEventListener("click", handleAddToCart);

    productDetails.appendChild(productImageContainer);
    productDetails.appendChild(productName);
    productDetails.appendChild(productPrice);
    productDetails.appendChild(productInstallments);
    productDetails.appendChild(buyButton);

    productItem.appendChild(productDetails);
    productList.appendChild(productItem);
  });

  if (cleanAllProducts) {
    productsShelf.appendChild(productList);
  }
};

const changeMinicartQuantityBadge = (): void => {
  const minicartQuantitySpan = document.querySelector(
    ".minicart-quantity"
  ) as HTMLSpanElement;

  const cartItemsJSON = localStorage.getItem("cart");
  const cartItems: ProductInCart[] = cartItemsJSON
    ? JSON.parse(cartItemsJSON)
    : [];

  const totalQuantity = cartItems.reduce(
    (total, item) => total + (item.quantity || 0),
    0
  );

  if (minicartQuantitySpan) {
    if (totalQuantity > 0) {
      minicartQuantitySpan.innerText = totalQuantity.toString();
      minicartQuantitySpan.classList.remove("hidden");
    } else {
      minicartQuantitySpan.innerText = "";
      minicartQuantitySpan.classList.add("hidden");
    }
  }
};

const handleAddToCart = (event: Event) => {
  const button = event.target as HTMLButtonElement;
  const productInfo = button.getAttribute("data-product-info");

  if (productInfo) {
    const parsedProductInfo: ProductInCart = JSON.parse(productInfo);
    const { id } = parsedProductInfo;

    const cartItemsJSON = localStorage.getItem("cart");
    let cartItems: ProductInCart[] = cartItemsJSON
      ? JSON.parse(cartItemsJSON)
      : [];

    const existingProduct = cartItems.find((item) => item.id === id);

    if (existingProduct) existingProduct.quantity++;
    else cartItems.push({ ...parsedProductInfo, quantity: 1 });

    localStorage.setItem("cart", JSON.stringify(cartItems));
  }

  changeMinicartQuantityBadge();
};

const addFilters = (products: Product[]): void => {
  const url = new URL(window.location.href);

  const params = new URLSearchParams(url.search);

  const queryParams = {
    colors: params.has("colors") ? params.get("colors").split(",") : [],
    sizes: params.has("sizes") ? params.get("sizes").split(",") : [],
    priceMin: params.has("priceMin")
      ? parseFloat(params.get("priceMin") || "0")
      : false,
    priceMax: params.has("priceMax")
      ? parseFloat(params.get("priceMax") || "0")
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
    ".filter-by-modal .modal-content .modal-filter-item.colors .modal-filter-content"
  );
  const colorsFilterDesktop = document.querySelector(
    ".filters-sidebar .modal-filter-item.colors .modal-filter-content"
  );
  const colorsFilterDiv = document.querySelector(
    ".filter-by-modal .modal-content .modal-filter-item.colors"
  );

  const sizesFilter = document.querySelector(
    ".filter-by-modal .modal-content .modal-filter-item.sizes .modal-filter-content"
  );
  const sizesFilterDesktop = document.querySelector(
    ".filters-sidebar .modal-filter-item.sizes .modal-filter-content"
  );
  const sizesFilterDiv = document.querySelector(
    ".filter-by-modal .modal-content .modal-filter-item.sizes"
  );

  const pricesFilter = document.querySelector(
    ".filter-by-modal .modal-content .modal-filter-item.prices .modal-filter-content"
  );
  const pricesFilterDesktop = document.querySelector(
    ".filters-sidebar .modal-filter-item.prices .modal-filter-content"
  );

  const applyFiltersButton = document.querySelector(
    ".filter-by-apply"
  ) as HTMLButtonElement;

  applyFiltersButton.setAttribute(
    applyFiltersButtonAttr.colors,
    queryParams.colors.join(",")
  );

  applyFiltersButton.setAttribute(
    applyFiltersButtonAttr.sizes,
    queryParams.sizes.join(",")
  );

  if (queryParams.priceMin || queryParams.priceMin === 0) {
    applyFiltersButton.setAttribute(
      applyFiltersButtonAttr.priceMin,
      queryParams.priceMin.toString()
    );
  }

  if (queryParams.priceMax) {
    applyFiltersButton.setAttribute(
      applyFiltersButtonAttr.priceMax,
      queryParams.priceMax.toString()
    );
  }

  products.forEach((product) => {
    if (!allColors.includes(product.color)) allColors.push(product.color);

    allSizes = [
      ...allSizes,
      ...product.size.filter((size) => !allSizes.includes(size)),
    ];
  });

  if (colorsFilter) {
    colorsFilter.innerHTML = "";
    colorsFilterDesktop.innerHTML = "";
    colorsFilterDiv.classList.remove("hidden");

    allColors.forEach((color) => {
      const filterColorButton = document.createElement(
        "button"
      ) as HTMLButtonElement;
      filterColorButton.classList.add("modal-filter-color");
      filterColorButton.setAttribute(
        "data-selected",
        queryParams.colors.includes(color) ? "true" : "false"
      );
      filterColorButton.textContent = color;

      filterColorButton.addEventListener(`click`, () => {
        const isSelected = Boolean(
          filterColorButton.getAttribute("data-selected") === "true"
        );

        const newSelectedValue = !isSelected;

        filterColorButton.setAttribute(
          "data-selected",
          newSelectedValue.toString()
        );

        if (!isSelected) {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.colors,
            `${[
              ...applyFiltersButton
                .getAttribute(applyFiltersButtonAttr.colors)
                .split(",")
                .filter((filter) => filter !== ""),
              color,
            ].join(`,`)}`
          );
        } else {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.colors,
            applyFiltersButton
              .getAttribute(applyFiltersButtonAttr.colors)
              .split(`,`)
              .filter((filter) => filter !== color && filter !== "")
              .join(`,`)
          );
        }
      });

      colorsFilter.appendChild(filterColorButton);
      colorsFilterDesktop.appendChild(filterColorButton);
    });
  } else colorsFilterDiv.classList.add("hidden");

  if (sizesFilter) {
    sizesFilter.innerHTML = "";
    sizesFilterDesktop.innerHTML = "";
    sizesFilterDiv.classList.remove("hidden");

    orderSizes(allSizes).forEach((size) => {
      const filterSizeButton = document.createElement(
        "button"
      ) as HTMLButtonElement;
      filterSizeButton.classList.add("modal-filter-size");
      filterSizeButton.setAttribute(
        "data-selected",
        queryParams.sizes.includes(size) ? "true" : "false"
      );
      filterSizeButton.textContent = size;

      filterSizeButton.addEventListener(`click`, () => {
        const isSelected = Boolean(
          filterSizeButton.getAttribute("data-selected") === "true"
        );

        const newSelectedValue = !isSelected;

        filterSizeButton.setAttribute(
          "data-selected",
          newSelectedValue.toString()
        );

        if (!isSelected) {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.sizes,
            `${[
              ...applyFiltersButton
                .getAttribute(applyFiltersButtonAttr.sizes)
                .split(",")
                .filter((filter) => filter !== ""),
              size,
            ].join(`,`)}`
          );
        } else {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.sizes,
            applyFiltersButton
              .getAttribute(applyFiltersButtonAttr.sizes)
              .split(`,`)
              .filter((filter) => filter !== size && filter !== "")
              .join(`,`)
          );
        }
      });

      sizesFilter.appendChild(filterSizeButton);
      sizesFilterDesktop.appendChild(filterSizeButton);
    });
  } else sizesFilterDiv.classList.add("hidden");

  if (pricesFilter) {
    pricesFilter.innerHTML = "";
    pricesFilterDesktop.innerHTML = "";

    priceRanges.forEach((price) => {
      const filterPriceButton = document.createElement(
        "button"
      ) as HTMLButtonElement;
      filterPriceButton.classList.add("modal-filter-price");
      filterPriceButton.textContent = price.max
        ? `de R$${price.min} até R$${price.max}`
        : `a partir de R$${price.min}`;
      filterPriceButton.setAttribute(
        "data-selected",
        price.min === queryParams.priceMin &&
          (price.max
            ? price.max === queryParams.priceMax
            : !queryParams.priceMax)
          ? "true"
          : "false"
      );

      filterPriceButton.addEventListener("click", () => {
        const allPriceButtons = document.querySelectorAll(
          "button.modal-filter-price"
        ) as NodeListOf<HTMLButtonElement>;

        allPriceButtons.forEach((button) => {
          if (button === filterPriceButton)
            button.setAttribute("data-selected", "true");
          else button.setAttribute("data-selected", "false");
        });

        if (price.min || price.min === 0) {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.priceMin,
            price.min.toString()
          );
        } else
          applyFiltersButton.removeAttribute(applyFiltersButtonAttr.priceMin);

        if (price.max) {
          applyFiltersButton.setAttribute(
            applyFiltersButtonAttr.priceMax,
            price.max.toString()
          );
        } else
          applyFiltersButton.removeAttribute(applyFiltersButtonAttr.priceMax);
      });

      pricesFilter.appendChild(filterPriceButton);
      pricesFilterDesktop.appendChild(filterPriceButton);
    });
  }
};

const applyFiltersButtonAttr = {
  colors: "data-filter-colors",
  sizes: "data-filter-sizes",
  priceMin: "data-filter-price-min",
  priceMax: "data-filter-price-max",
};

const applyFilters = () => {
  const applyFiltersButton = document.querySelector(
    ".filter-by-apply"
  ) as HTMLButtonElement;

  if (applyFiltersButton) {
    applyFiltersButton.addEventListener("click", () => {
      const filterColors = applyFiltersButton.getAttribute(
        applyFiltersButtonAttr.colors
      );
      const filterSizes = applyFiltersButton.getAttribute(
        applyFiltersButtonAttr.sizes
      );
      const filterPriceMin = applyFiltersButton.getAttribute(
        applyFiltersButtonAttr.priceMin
      );
      const filterPriceMax = applyFiltersButton.getAttribute(
        applyFiltersButtonAttr.priceMax
      );

      window.location.href = `/?page=0${
        filterColors ? `&colors=${filterColors}` : ""
      }${filterSizes ? `&sizes=${filterSizes}` : ""}${
        filterPriceMin ? `&priceMin=${filterPriceMin}` : ""
      }${filterPriceMax ? `&priceMax=${filterPriceMax}` : ""}`;
    });
  }
};

const cleanFilters = () => {
  const cleanFiltersButtons = document.querySelectorAll(
    "button.filter-by-clean"
  ) as NodeListOf<HTMLButtonElement>;

  if (cleanFiltersButtons)
    cleanFiltersButtons.forEach((button) => {
      button.addEventListener("click", () => (window.location.href = `/`));
    });
};

const addFiltersChevronsAction = () => {
  const chevronsCollection = document.querySelectorAll(
    "button.modal-filter-chevron"
  ) as NodeListOf<HTMLButtonElement>;

  if (chevronsCollection) {
    chevronsCollection.forEach((button) => {
      button.addEventListener("click", () => {
        let modalFilterItem: HTMLElement | null =
          button.closest(".modal-filter-item");

        if (modalFilterItem) {
          const modalFilterContent = modalFilterItem.querySelector(
            ".modal-filter-content"
          );

          if (modalFilterContent) {
            const isHidden = modalFilterContent.classList.contains("hidden");

            if (isHidden) {
              modalFilterContent.classList.remove("hidden");
              button.style.transform = "rotate(180deg)";
            } else {
              modalFilterContent.classList.add("hidden");
              button.style.transform = "rotate(0deg)";
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
  sort: string = "",
  order: string = ""
) => {
  const loadMoreContainer = document.querySelector("div.products-load-more");
  const oldLoadMore = document.querySelector("button.load-more-button");

  if (oldLoadMore) oldLoadMore.remove();

  if (!isLastPage && loadMoreContainer) {
    const loadMoreButton = document.createElement(
      "button"
    ) as HTMLButtonElement;
    loadMoreButton.classList.add("load-more-button");
    loadMoreButton.textContent = "Carregar mais";
    loadMoreButton.setAttribute("data-page", (page + 1).toString());
    loadMoreButton.setAttribute("data-sort", sort);
    loadMoreButton.setAttribute("data-order", order);

    loadMoreButton.addEventListener(`click`, () => {
      const dataPage = loadMoreButton.getAttribute("data-page");

      getProducts(
        dataPage && parseInt(dataPage),
        loadMoreButton.getAttribute("data-sort" || undefined),
        loadMoreButton.getAttribute("data-order" || undefined)
      ).then((data): void => {
        addProductsToContainer(data.products, false);

        loadMoreButton.setAttribute("data-page", (data.page + 1).toString());

        if (data.isLastPage) {
          loadMoreButton.classList.add("hidden");
        }
      });
    });

    loadMoreContainer.appendChild(loadMoreButton);
  }
};

const addOrderButtonsAction = () => {
  const orderByButtons = document.querySelectorAll(
    "button.modal-content-link"
  ) as NodeListOf<HTMLButtonElement>;

  const orderByDesktopContent = document.querySelector(
    ".order-by-desktop .order-by-desktop-container"
  );

  if (orderByButtons) {
    orderByButtons.forEach((button) => {
      const order = button.getAttribute("data-order") || "";
      const sort = button.getAttribute("data-sort") || "";

      button.addEventListener("click", () => {
        const modalElement = document.querySelector(
          "div.order-by-modal"
        ) as HTMLElement;

        if (!!modalElement) {
          modalElement.style.transform = "translateX(-100vw)";
          setTimeout(() => modalElement.classList.add("hidden"), 200);
        }

        getProducts(0, sort, order).then((data): void => {
          addProductsToContainer(data.products, true);
          loadMoreProducts(data.isLastPage, data.page, sort, order);
        });

        if (orderByDesktopContent) {
          orderByDesktopContent.classList.contains("hidden")
            ? orderByDesktopContent.classList.remove("hidden")
            : orderByDesktopContent.classList.add("hidden");
        }
      });
    });
  }
};

const addOrderButtonsActionDesktop = () => {
  const orderByDesktopTrigger = document.querySelector(
    ".order-by-desktop .order-by-desktop-button"
  ) as HTMLButtonElement;

  const orderByDesktopContent = document.querySelector(
    ".order-by-desktop .order-by-desktop-container"
  );

  if (orderByDesktopTrigger) {
    orderByDesktopTrigger.addEventListener("click", () => {
      if (orderByDesktopContent) {
        orderByDesktopContent.classList.contains("hidden")
          ? orderByDesktopContent.classList.remove("hidden")
          : orderByDesktopContent.classList.add("hidden");
      }
    });
  }
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
      addOrderButtonsActionDesktop();
    })
    .finally(() => addFiltersChevronsAction());
};

document.addEventListener("DOMContentLoaded", main);
