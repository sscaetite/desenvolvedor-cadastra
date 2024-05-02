export interface Product {
  id: string;
  name: string;
  price: number;
  parcelamento: number[];
  color: string;
  image: string;
  size: string[];
  date: string;
}

export interface ProductInCart extends Product {
  quantity: number;
}

export interface ProductsFilters {
  priceRange?: { min?: number; max?: number };
  colors?: string[];
  sizes?: string[];
  page: number;
  itemsPerPage: number;
}

export interface ProductsWithFilters {
  products: Product[];
  isLastPage: boolean;
  allProducts: Product[];
}
