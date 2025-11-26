import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards,Request } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { AdminJwtAuthGuard } from 'src/auth/guards/admin-jwt-auth.guards';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';

@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  async getAllProducts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.productService.getAllProducts(page, limit);
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

 
  @Post()
  @UseGuards(AdminJwtAuthGuard)
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productService.createProduct(createProductDto);
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(id, updateProductDto);
  }

  @Post('user/create')
  @UseGuards(JwtAuthGuard)
  async createUserProduct(@Request() req, @Body() createProductDto: CreateProductDto) {
    return this.productService.createUserProduct(req.user.id, createProductDto);
  }
}