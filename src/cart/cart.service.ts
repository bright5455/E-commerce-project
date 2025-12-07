import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entity/cart.entity';
import { Product } from '../product/entity/product.entity';
import { User } from '../user/entity/user.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  

  async getCart(userId: string) {
    const cartItems = await this.cartRepository.find({
      where: { userId },
      relations: ['product'],
    });

    const total = cartItems.reduce((sum, item) => {
      return sum + (Number(item.product.price) * item.quantity);
    }, 0);

    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items: cartItems,
      itemCount,
      total: total.toFixed(2),
    };
  }

  async getCartTotal(userId: string): Promise<number> {
    const cartItems = await this.cartRepository.find({
      where: { userId },
      relations: ['product'],
    });

    const total = cartItems.reduce((sum, item) => {
      return sum + (Number(item.product.price) * item.quantity);
    }, 0);

    return total;
  }

  

  async validateCart(userId: string) {
    const cartItems = await this.cartRepository.find({
      where: { userId },
      relations: ['product'],
    });

    if (cartItems.length === 0) {
      return {
        isValid: false,
        errors: ['Cart is empty'],
      };
    }

    const errors: string[] = [];
    let isValid = true;

    for (const item of cartItems) {
      if (!item.product.isActive) {
        errors.push(`Product ${item.product.name} is no longer available`);
        isValid = false;
      }

      if (item.product.stock < item.quantity) {
        errors.push(
          `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}, Requested: ${item.quantity}`
        );
        isValid = false;
      }
    }

    return {
      isValid,
      errors,
    };
  }



  async addItem(userId: string, productId: string, quantity: number) {
    const product = await this.productRepository.findOne({ 
      where: { id: productId } 
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    if (product.stock < quantity) {
      throw new BadRequestException('Insufficient stock available');
    }

    let cartItem = await this.cartRepository.findOne({
      where: { userId, productId },
    });

    if (cartItem) {
      cartItem.quantity += quantity;
      
      if (cartItem.quantity > product.stock) {
        throw new BadRequestException('Requested quantity exceeds available stock');
      }
    } else {
      cartItem = this.cartRepository.create({
        userId,
        productId,
        quantity,
      });
    }

    await this.cartRepository.save(cartItem);

    return {
      message: 'Product added to cart successfully',
      cartItem,
    };
  }



  async updateQuantity(userId: string, cartItemId: string, quantity: number) {
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartItemId, userId },
      relations: ['product'],
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    if (quantity > cartItem.product.stock) {
      throw new BadRequestException('Requested quantity exceeds available stock');
    }

    cartItem.quantity = quantity;
    await this.cartRepository.save(cartItem);

    return {
      message: 'Cart item updated successfully',
      cartItem,
    };
  }

  

  async removeItem(userId: string, cartItemId: string) {
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartItemId, userId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartRepository.remove(cartItem);

    return {
      message: 'Item removed from cart successfully',
    };
  }



  async clearCart(userId: string) {
    const cartItems = await this.cartRepository.find({
      where: { userId },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is already empty');
    }

    await this.cartRepository.remove(cartItems);

    return {
      message: 'Cart cleared successfully',
    };
  }


  async mergeGuestCart(guestCartId: string, userId: string) {
    const guestCartItems = await this.cartRepository.find({
      where: { userId: guestCartId }, 
      relations: ['product'],
    });

    if (guestCartItems.length === 0) {
      return {
        message: 'No items to merge',
      };
    }

    const userCartItems = await this.cartRepository.find({
      where: { userId },
    });

    const userCartMap = new Map<string, Cart>();
    userCartItems.forEach(item => {
      userCartMap.set(item.productId, item);
    });

    const mergedItems: Cart[] = [];  
    const errors: string[] = [];

    for (const guestItem of guestCartItems) {
      try {
        const existingItem = userCartMap.get(guestItem.productId);

        if (existingItem) {
          const newQuantity = existingItem.quantity + guestItem.quantity;

          if (newQuantity > guestItem.product.stock) {
            errors.push(
              `Cannot merge ${guestItem.product.name}: Total quantity (${newQuantity}) exceeds stock (${guestItem.product.stock})`
            );
            continue;
          }

          existingItem.quantity = newQuantity;
          await this.cartRepository.save(existingItem);
          mergedItems.push(existingItem); 
        } else {
          const newCartItem = this.cartRepository.create({
            userId,
            productId: guestItem.productId,
            quantity: guestItem.quantity,
          });
          await this.cartRepository.save(newCartItem);
          mergedItems.push(newCartItem);  
        }

        await this.cartRepository.remove(guestItem);
      } catch (error) {
        errors.push(`Error merging ${guestItem.product.name}: ${error.message}`);
      }
    }

    return {
      message: 'Cart merged successfully',
      mergedCount: mergedItems.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}