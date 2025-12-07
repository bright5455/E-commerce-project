import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
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
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { UserRole } from '../user/entity/user.entity';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    return this.productService.findAll({
      page,
      limit,
      search,
      minPrice,
      maxPrice,
      sortBy,
      order,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products by query' })
  @ApiResponse({ status: 200, description: 'Search results retrieved' })
  async search(@Query('q') query: string) {
    return this.productService.search(query);
  }

  @Get('top-selling')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, description: 'Top selling products retrieved' })
  async getTopSelling(@Query('limit') limit?: number) {
    return this.productService.getTopSelling(limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details by ID' })
  @ApiResponse({ status: 200, description: 'Product details retrieved' })
  async findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }


  @Get('admin/low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get products with low stock (Admin only)' })
  @ApiResponse({ status: 200, description: 'Low stock products retrieved' })
  async getLowStock(@Query('threshold') threshold?: number) {
    return this.productService.getLowStock(threshold);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product (Admin only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product details (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(id, updateProductDto);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product stock quantity (Admin only)' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  async updateStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.productService.updateStock(id, quantity);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}