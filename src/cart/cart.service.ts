import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entity/cart.entity';
import { Product } from 'src/product/entity/product.entity';
import { User } from 'src/user/entity/user.entity';
import { AddToCartDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const product = await this.productRepository.findOne({ 
      where: { id: addToCartDto.productId } 
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    if (product.stock < addToCartDto.quantity) {
      throw new BadRequestException('Insufficient stock available');
    }

    
    let cartItem = await this.cartRepository.findOne({
      where: { userId, productId: addToCartDto.productId },
    });

    if (cartItem) {
    
      cartItem.quantity += addToCartDto.quantity;
      
      
      if (cartItem.quantity > product.stock) {
        throw new BadRequestException('Requested quantity exceeds available stock');
      }
    } else {
      
      cartItem = this.cartRepository.create({
        userId,
        productId: addToCartDto.productId,
        quantity: addToCartDto.quantity,
      });
    }

    await this.cartRepository.save(cartItem);

    return {
      message: 'Product added to cart successfully',
      cartItem,
    };
  }

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

  async updateCartItem(userId: string, cartItemId: string, quantity: number) {
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

  async removeFromCart(userId: string, cartItemId: string) {
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
      errors.push(`Insufficient stock for ${item.product.name}. Available: ${item.product.stock}, Requested: ${item.quantity}`); // FIX: Add parentheses
      isValid = false;
    }
  }

  return {
    isValid,
    errors,
  };
}
}
