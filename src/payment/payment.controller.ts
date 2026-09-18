import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Headers,
  UseGuards,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrderService } from '../order/order.service';
import { PaystackService } from './paystack/paystack.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { PaystackChargeSuccessWebhookPayload } from './paystack/paystack.types';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly paystackService: PaystackService,
  ) {}

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Re-initialize Paystack payment for a pending order' })
  @ApiResponse({ status: 201, description: 'Payment session created' })
  async initialize(
    @User('id') userId: string,
    @Body() dto: InitializePaymentDto,
  ) {
    return this.orderService.retryPayment(dto.orderId, userId);
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a Paystack payment and finalize the order' })
  @ApiResponse({ status: 200, description: 'Order finalized if payment succeeded' })
  async verify(
    @Param('reference') reference: string,
    @User('id') userId: string,
  ) {
    const verified = await this.paystackService.verifyTransaction(reference);
    const order = await this.orderService.finalizePaidOrder(reference, {
      status: verified.status,
      amountKobo: verified.amount,
      raw: verified,
    });

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only verify your own orders');
    }

    return order;
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Paystack webhook - do not call directly' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const rawBody = req.rawBody;

    if (!rawBody || !this.paystackService.verifyWebhookSignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const payload = req.body as PaystackChargeSuccessWebhookPayload;

    if (payload.event !== 'charge.success') {
      return { received: true };
    }

    try {
      await this.orderService.finalizePaidOrder(payload.data.reference, {
        status: payload.data.status,
        amountKobo: payload.data.amount,
        raw: payload.data,
      });
    } catch (error) {
      // Log and swallow: once the signature is verified, always ack with 200 so
      // Paystack doesn't enter a retry storm over an error that won't self-resolve
      // (e.g. an unknown reference). Rely on logs/manual reconciliation instead.
      this.logger.error('Failed to finalize order from Paystack webhook:', error);
    }

    return { received: true };
  }
}
