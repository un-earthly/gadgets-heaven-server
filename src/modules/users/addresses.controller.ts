import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { AddressesService } from './addresses.service';
import { Address } from './entities/address.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('addresses')
@Controller('addresses')
@UseGuards(CustomerAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Create address' })
  @ApiResponse({ status: 201, description: 'Address created', type: Address })
  async create(
    @Request() req,
    @Body() addressData: Partial<Address>,
  ): Promise<Address> {
    return this.addressesService.create(req.user.id, addressData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user addresses' })
  @ApiResponse({ status: 200, description: 'List of addresses', type: [Address] })
  async findAll(@Request() req): Promise<Address[]> {
    return this.addressesService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address by ID' })
  @ApiResponse({ status: 200, description: 'Address found', type: Address })
  async findOne(@Request() req, @Param('id') id: string): Promise<Address> {
    return this.addressesService.findOne(req.user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update address' })
  @ApiResponse({ status: 200, description: 'Address updated', type: Address })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateData: Partial<Address>,
  ): Promise<Address> {
    return this.addressesService.update(req.user.id, id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete address' })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  async remove(@Request() req, @Param('id') id: string): Promise<void> {
    return this.addressesService.remove(req.user.id, id);
  }

  @Put(':id/default')
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({ status: 200, description: 'Address set as default', type: Address })
  async setDefault(@Request() req, @Param('id') id: string): Promise<Address> {
    return this.addressesService.setDefault(req.user.id, id);
  }
}
