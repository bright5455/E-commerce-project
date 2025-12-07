import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entity/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}


  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    isActive?: boolean;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.reviews', 'reviews')
      .leftJoinAndSelect('product.user', 'user');

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('product.isActive = :isActive', { isActive: query.isActive });
    } else {
      queryBuilder.andWhere('product.isActive = :isActive', { isActive: true });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    if (query.minPrice) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
    }
    if (query.maxPrice) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    const sortBy = query.sortBy || 'createdAt';
    const order = query.order || 'DESC';
    queryBuilder.orderBy(`product.${sortBy}`, order);

    queryBuilder.skip(skip).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['reviews', 'reviews.user', 'user'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async search(query: string) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Search query cannot be empty');
    }

    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere(
        '(product.name ILIKE :query OR product.description ILIKE :query)',
        { query: `%${query}%` }
      )
      .leftJoinAndSelect('product.reviews', 'reviews')
      .orderBy('product.name', 'ASC')
      .getMany();

    return {
      results: products,
      count: products.length,
    };
  }

  async getTopSelling(limit: number = 10) {
    const products = await this.productRepository.find({
      where: { isActive: true },
      relations: ['reviews'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return products;
  }

  async getLowStock(threshold: number = 10) {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.stock <= :threshold', { threshold })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .orderBy('product.stock', 'ASC')
      .getMany();

    return {
      products,
      count: products.length,
      threshold,
    };
  }

  async findByCategory(categoryId: string) {
    throw new BadRequestException('Category filtering not yet implemented');
  }

  async create(createProductDto: CreateProductDto) {
    const product = this.productRepository.create({
      ...createProductDto,
      isActive: true,
    });
    
    await this.productRepository.save(product);

    return {
      message: 'Product created successfully',
      product,
    };
  }


  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    Object.assign(product, updateProductDto);
    await this.productRepository.save(product);

    return {
      message: 'Product updated successfully',
      product,
    };
  }

  async updateStock(id: string, quantity: number) {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const newStock = product.stock - quantity;

    if (newStock < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    product.stock = newStock;
    await this.productRepository.save(product);

    return {
      message: 'Stock updated successfully',
      product,
    };
  }

  
  async remove(id: string) {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    product.isActive = false;
    await this.productRepository.save(product);

    return {
      message: 'Product deleted successfully',
    };
  }
}