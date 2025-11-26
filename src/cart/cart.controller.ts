import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/cart.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';


@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  @Post()
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(req.user.id, addToCartDto);
  }

  @Get()
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.id);
  }

  @Patch(':id')
  async updateCartItem(
    @Request() req,
    @Param('id') cartItemId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartService.updateCartItem(req.user.id, cartItemId, quantity);
  }

  @Delete(':id')
  async removeFromCart(@Request() req, @Param('id') cartItemId: string) {
    return this.cartService.removeFromCart(req.user.id, cartItemId);
  }

  @Delete()
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.id);
  }

  @Post('validate')
  async validateCart(@Request() req) {
    return this.cartService.validateCart(req.user.id);
  }
}
