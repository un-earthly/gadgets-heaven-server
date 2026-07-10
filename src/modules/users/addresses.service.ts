import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { getTenantId } from '../tenants/tenant.context';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async create(userId: string, addressData: Partial<Address>): Promise<Address> {
    const tenantId = getTenantId();

    if (addressData.isDefault) {
      await this.clearDefaultAddress(userId);
    }

    // Check if this is the user's first address; if so, make it the default
    const count = await this.addressRepository.count({
      where: { userId },
    });
    const isDefault = count === 0 ? true : !!addressData.isDefault;

    const address = this.addressRepository.create({
      ...addressData,
      userId,
      tenantId,
      isDefault,
    });

    return this.addressRepository.save(address);
  }

  async findAll(userId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException(`Address with ID "${id}" not found`);
    }

    return address;
  }

  async update(
    userId: string,
    id: string,
    updateData: Partial<Address>,
  ): Promise<Address> {
    const address = await this.findOne(userId, id);

    if (updateData.isDefault) {
      await this.clearDefaultAddress(userId);
    }

    Object.assign(address, updateData);
    return this.addressRepository.save(address);
  }

  async remove(userId: string, id: string): Promise<void> {
    const address = await this.findOne(userId, id);
    
    // If we're deleting the default address, make another address default if available
    const wasDefault = address.isDefault;
    await this.addressRepository.remove(address);

    if (wasDefault) {
      const nextAddress = await this.addressRepository.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (nextAddress) {
        nextAddress.isDefault = true;
        await this.addressRepository.save(nextAddress);
      }
    }
  }

  async setDefault(userId: string, id: string): Promise<Address> {
    await this.clearDefaultAddress(userId);
    const address = await this.findOne(userId, id);
    address.isDefault = true;
    return this.addressRepository.save(address);
  }

  private async clearDefaultAddress(userId: string): Promise<void> {
    await this.addressRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );
  }
}
