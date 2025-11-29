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
  Req
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { AdminJwtAuthGuard } from 'src/auth/guards/admin-jwt-auth.guards';



@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}


  @Get()
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
  async search(@Query('q') query: string) {
    return this.productService.search(query);
  }

  @Get('top-selling')
  async getTopSelling(@Query('limit') limit?: number) {
    return this.productService.getTopSelling(limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  
  @Post()
  @UseGuards(AdminJwtAuthGuard)
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }


  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  async remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  @Get('admin/low-stock')
  @UseGuards(AdminJwtAuthGuard)
  async getLowStock(@Query('threshold') threshold?: number) {
    return this.productService.getLowStock(threshold);
  }

  @Patch(':id/stock')
  @UseGuards(AdminJwtAuthGuard)
  async updateStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.productService.updateStock(id, quantity);
  }
}