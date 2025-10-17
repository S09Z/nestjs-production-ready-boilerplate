import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { User, Prisma, Role } from '../../generated/prisma';

@Injectable()
export class UserModel {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { email },
      include: {
        profile: true,
      },
    });
  }

  /**
   * Find all users with pagination
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, where, orderBy } = params;
    return this.db.user.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        profile: true,
      },
    });
  }

  /**
   * Count users
   */
  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return this.db.user.count({ where });
  }

  /**
   * Create a new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.db.user.create({
      data,
      include: {
        profile: true,
      },
    });
  }

  /**
   * Update a user
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({
      where: { id },
      data,
      include: {
        profile: true,
      },
    });
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<User> {
    return this.db.user.delete({
      where: { id },
    });
  }

  /**
   * Check if user exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.db.user.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Check if user exists by ID
   */
  async existsById(id: string): Promise<boolean> {
    const count = await this.db.user.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Find users by role
   */
  async findByRole(role: Role): Promise<User[]> {
    return this.db.user.findMany({
      where: { role },
      include: {
        profile: true,
      },
    });
  }

  /**
   * Find active users
   */
  async findActive(params?: { skip?: number; take?: number }): Promise<User[]> {
    return this.db.user.findMany({
      where: { isActive: true },
      skip: params?.skip,
      take: params?.take,
      include: {
        profile: true,
      },
    });
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  /**
   * Soft delete user by setting isActive to false
   */
  async softDelete(id: string): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
