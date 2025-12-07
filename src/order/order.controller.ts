import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrderService } from './order.service';
import {
  CreateOrderDto,
  CheckoutDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  OrderQueryDto,
} from './dto/order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { User } from '../auth/decorators/user.decorator';
import { UserRole } from '../user/entity/user.entity';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create order from cart items' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async create(@User('id') userId: string, @Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(userId, createOrderDto);
  }

  @Post('checkout')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Process checkout - validate, deduct wallet, create order' })
  @ApiResponse({ status: 201, description: 'Checkout completed successfully' })
  async checkout(@User('id') userId: string, @Body() checkoutDto: CheckoutDto) {
    return this.orderService.checkout(userId, checkoutDto);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Get current user orders with pagination' })
  @ApiResponse({ status: 200, description: 'User orders retrieved successfully' })
  async getMyOrders(@User('id') userId: string, @Query() query: OrderQueryDto) {
    return this.orderService.findAllByUser(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID' })
  @ApiResponse({ status: 200, description: 'Order details retrieved' })
  async findOne(@Param('id') id: string, @User('id') userId: string) {
    const order = await this.orderService.findOne(id);
    
    if (order.userId !== userId) {
    }
    
    return order;
  }

  @Patch(':id/cancel')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Cancel order and refund to wallet' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancel(
    @Param('id') id: string,
    @User('id') userId: string,
    @Body() cancelDto: CancelOrderDto,
  ) {
    return this.orderService.cancel(id, userId, cancelDto);
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get order statistics for dashboard (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order statistics retrieved' })
  async getStats() {
    return this.orderService.getOrderStats();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all orders with filtering (Admin only)' })
  @ApiResponse({ status: 200, description: 'All orders retrieved' })
  async findAll(@Query() query: OrderQueryDto) {
    return this.orderService.findAll(query);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, updateStatusDto);
  }
}