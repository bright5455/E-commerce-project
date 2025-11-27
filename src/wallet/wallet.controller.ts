import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AddFundsDto } from './dto/wallet.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  async getWallet(@Request() req) {
    return this.walletService.getWallet(req.user.id);
  }

  @Post('add-funds')
  async addFunds(@Request() req, @Body() addFundsDto: AddFundsDto) {
    return this.walletService.addFunds(req.user.id, addFundsDto);
  }

  @Post('purchase')
  async purchaseCart(@Request() req) {
    return this.walletService.purchaseCart(req.user.id);
  }

  @Get('transactions')
  async getTransactions(@Request() req) {
    return this.walletService.getTransactions(req.user.id);
  }
}

