import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WalletService } from './wallet.service';
import { AddFundsDto, TransferDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get wallet balance and details' })
  @ApiResponse({ status: 200, description: 'Wallet information retrieved successfully' })
  async getWallet(@Request() req) {
    return this.walletService.getBalance(req.user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved successfully' })
  async getTransactions(@Request() req) {
    return this.walletService.getTransactionHistory(req.user.id);
  }

  @Post('deposit')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Deposit funds to wallet' })
  @ApiResponse({ status: 201, description: 'Funds deposited successfully' })
  async deposit(@Request() req, @Body() dto: AddFundsDto) {
    return this.walletService.deposit(req.user.id, dto.amount, dto.description);
  }

  @Post('withdraw')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Withdraw funds from wallet' })
  @ApiResponse({ status: 201, description: 'Funds withdrawn successfully' })
  async withdraw(@Request() req, @Body() dto: AddFundsDto) {
    return this.walletService.withdraw(req.user.id, dto.amount, dto.description);
  }

  @Post('transfer')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Transfer funds to another user' })
  @ApiResponse({ status: 201, description: 'Funds transferred successfully' })
  async transfer(@Request() req, @Body() dto: TransferDto) {
    return this.walletService.transfer(req.user.id, dto.toUserId, dto.amount);
  }

  @Post('refund')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Process refund to wallet' })
  @ApiResponse({ status: 201, description: 'Refund processed successfully' })
  async refund(@Request() req, @Body() body: { orderId: string; amount: number }) {
    const { orderId, amount } = body;
    return this.walletService.refund(req.user.id, orderId, amount);
  }
}