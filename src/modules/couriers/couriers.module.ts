import { Module } from '@nestjs/common';
import { CourierService } from './courier.interface';
import { SteadfastCourier } from './steadfast.courier';

@Module({
  providers: [
    // Swap this binding to change the courier implementation.
    { provide: CourierService, useClass: SteadfastCourier },
  ],
  exports: [CourierService],
})
export class CouriersModule {}
