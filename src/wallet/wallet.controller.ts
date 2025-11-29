import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';
import { WalletService } from './wallet.service';
import { AddFundsDto, TransferDto } from './dto/wallet.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  
  @Get()
  getWallet(@Request() req) {
    return this.walletService.getBalance(req.user.id);
  }

  
  @Post('deposit')
  deposit(@Request() req, @Body() dto: AddFundsDto) {
    return this.walletService.deposit(req.user.id, dto.amount, dto.description);
  }

  
  @Post('withdraw')
  withdraw(@Request() req, @Body() dto: AddFundsDto) {
    return this.walletService.withdraw(req.user.id, dto.amount, dto.description);
  }

  
  @Post('transfer')
  transfer(@Request() req, @Body() dto: TransferDto) {
    return this.walletService.transfer(req.user.id, dto.toUserId, dto.amount);
  }

  
  @Get('transactions')
  async getTransactions(@Request() req) {
    return this.walletService.getTransactionHistory(req.user.id);
  }

  @Post('refund')
  async refund(@Request() req, @Body() body) {
    const { orderId, amount } = body;
    return this.walletService.refund(req.user.id, orderId, amount);
  };
  
  }

