import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

const LOCAL_STORAGE_KEY = '@RocketShoes:cart'

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(LOCAL_STORAGE_KEY)

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productResponse = await api.get<Omit<Product, 'amount'>>(`products/${productId}`)
      const stockResponse = await api.get<Stock>(`stock/${productId}`)
      const product = productResponse.data
      
      const carProduct = cart.find(cartProduct => cartProduct.id === productId)
      const { amount: stockAmount } = stockResponse.data
      const newAmount = carProduct ? carProduct.amount + 1 : 1

      let newCart

      if (carProduct) {
        
        newCart = cart.map(cartProduct => {
          if (cartProduct.id === productId) {
            return {...cartProduct, amount: newAmount}
          }
          return cartProduct
        })

      } else {
        newCart = [...cart, {...product, amount: 1}]
      }

      if (newAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
      } else {
        setCart(newCart)
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newCart))
      }

    } catch (err) {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId)
      const productToRemove = cart.find(product => product.id === productId)
  
      if (!productToRemove) {
        throw new Error('No such product')
      }
  
      setCart(newCart)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount < 1) {
        return
      }
      
      const stockResponse = await api.get<Stock>(`/stock/${productId}`)
      const stockAmount = stockResponse.data.amount

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const newCart = cart.map(product => {
        if (product.id === productId) {
          return {...product, amount}
        }
        return product
      })

      setCart(newCart)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newCart))

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
