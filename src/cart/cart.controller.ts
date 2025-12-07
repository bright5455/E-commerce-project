import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.id);
  }

  @Get('total')
  @ApiOperation({ summary: 'Get cart total amount' })
  @ApiResponse({ status: 200, description: 'Cart total retrieved successfully' })
  async getCartTotal(@Request() req) {
    const total = await this.cartService.getCartTotal(req.user.id);
    return {
      total: total.toFixed(2),
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate cart items availability and prices' })
  @ApiResponse({ status: 200, description: 'Cart validated successfully' })
  async validateCart(@Request() req) {
    return this.cartService.validateCart(req.user.id);
  }


  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  async addItem(@Request() req, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addItem(
      req.user.id,
      addToCartDto.productId,
      addToCartDto.quantity,
    );
  }

  @Patch(':id/quantity')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Quantity updated successfully' })
  async updateQuantity(
    @Request() req,
    @Param('id') cartItemId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartService.updateQuantity(req.user.id, cartItemId, quantity);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed successfully' })
  async removeItem(@Request() req, @Param('id') cartItemId: string) {
    return this.cartService.removeItem(req.user.id, cartItemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.id);
  }


  @Post('merge')
  @ApiOperation({ summary: 'Merge guest cart with user cart after login' })
  @ApiResponse({ status: 200, description: 'Guest cart merged successfully' })
  async mergeGuestCart(@Request() req, @Body('guestCartId') guestCartId: string) {
    return this.cartService.mergeGuestCart(guestCartId, req.user.id);
  }
}