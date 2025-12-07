import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { TransactionService } from './transaction.service';
import {
  CreateTransactionDto,
  TransactionQueryDto,
  DateRangeDto,
} from './dto/transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { User } from '../auth/decorators/user.decorator';
import { UserRole } from '../user/entity/user.entity';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('my/transactions')
  @ApiOperation({ summary: 'Get current user transactions' })
  @ApiResponse({ status: 200, description: 'User transactions retrieved' })
  async getMyTransactions(
    @User('id') userId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return {
      data: [],
      meta: {
        total: 0,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: 0,
      },
      message: 'Please use /transactions/wallet/:walletId endpoint',
    };
  }

  @Get('wallet/:walletId')
  @ApiOperation({ summary: 'Get wallet transactions with pagination' })
  @ApiResponse({ status: 200, description: 'Wallet transactions retrieved' })
  async getWalletTransactions(
    @Param('walletId') walletId: string,
    @Query() query: TransactionQueryDto,
    @User('id') userId: string,
  ) {
    return this.transactionService.findAllByWallet(walletId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction details by ID' })
  @ApiResponse({ status: 200, description: 'Transaction details retrieved' })
  async findOne(@Param('id') id: string, @User('id') userId: string) {
    const transaction = await this.transactionService.findOne(id);
    
    if (transaction.userId !== userId) {
    }
    
    return transaction;
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get transaction statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transaction statistics retrieved' })
  async getStats() {
    return this.transactionService.getTransactionStats();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all transactions (Admin only)' })
  @ApiResponse({ status: 200, description: 'All transactions retrieved' })
  async findAll(@Query() query: TransactionQueryDto) {
    return this.transactionService.findAll(query);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Create transaction (Admin only)' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  async create(@Body() createTransactionDto: CreateTransactionDto, @Req() req: Request) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.transactionService.create(createTransactionDto, ipAddress, userAgent);
  }

  @Post('date-range')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get transactions by date range (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved by date range' })
  async getByDateRange(@Body() dateRangeDto: DateRangeDto) {
    return this.transactionService.getTransactionsByDateRange(dateRangeDto);
  }
}