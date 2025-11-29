import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/cart.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  
  @Get()
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.id);
  }

  
  @Post()
  async addItem(@Request() req, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addItem(
      req.user.id,
      addToCartDto.productId,
      addToCartDto.quantity
    );
  }

 
  @Patch(':id/quantity')
  async updateQuantity(
    @Request() req,
    @Param('id') cartItemId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartService.updateQuantity(req.user.id, cartItemId, quantity);
  }

 
  @Delete(':id')
  async removeItem(@Request() req, @Param('id') cartItemId: string) {
    return this.cartService.removeItem(req.user.id, cartItemId);
  }

  
  @Delete()
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.id);
  }

 
  @Get('total')
  async getCartTotal(@Request() req) {
    const total = await this.cartService.getCartTotal(req.user.id);
    return {
      total: total.toFixed(2),
    };
  }

  @Post('validate')
  async validateCart(@Request() req) {
    return this.cartService.validateCart(req.user.id);
  }

  
  @Post('merge')
  async mergeGuestCart(@Request() req, @Body('guestCartId') guestCartId: string) {
    return this.cartService.mergeGuestCart(guestCartId, req.user.id);
  }
}