import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserModel } from './user.model';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { plainToInstance } from 'class-transformer';
import { User, Prisma } from '../../generated/prisma';

@Injectable()
export class UserService {
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly userModel: UserModel) {}

  /**
   * Find all users with pagination
   */
  async findAll(pagination: PaginationDto): Promise<{
    data: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel.findAll({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.userModel.count(),
    ]);

    return {
      data: users.map((user) => this.toResponseDto(user)),
      total,
      page,
      limit,
    };
  }

  /**
   * Find a user by ID
   */
  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.toResponseDto(user);
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.userModel.findByEmail(email);

    if (!user) {
      return null;
    }

    return this.toResponseDto(user);
  }

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if user already exists
    const existingUser = await this.userModel.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(createUserDto.password);

    // Create user
    const user = await this.userModel.create({
      email: createUserDto.email,
      password: hashedPassword,
      firstName: createUserDto.name?.split(' ')[0] || '',
      lastName: createUserDto.name?.split(' ').slice(1).join(' ') || '',
    });

    return this.toResponseDto(user);
  }

  /**
   * Update a user
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // Check if user exists
    const existingUser = await this.userModel.findById(id);

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if email is being updated and already exists
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.userModel.existsByEmail(
        updateUserDto.email,
      );

      if (emailExists) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = {};

    if (updateUserDto.email) {
      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.name) {
      const nameParts = updateUserDto.name.split(' ');
      updateData.firstName = nameParts[0] || '';
      updateData.lastName = nameParts.slice(1).join(' ') || '';
    }

    if (updateUserDto.password) {
      updateData.password = await this.hashPassword(updateUserDto.password);
    }

    // Update user
    const user = await this.userModel.update(id, updateData);

    return this.toResponseDto(user);
  }

  /**
   * Delete a user (hard delete)
   */
  async remove(id: string): Promise<void> {
    // Check if user exists
    const existingUser = await this.userModel.findById(id);

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userModel.delete(id);
  }

  /**
   * Soft delete a user
   */
  async softRemove(id: string): Promise<UserResponseDto> {
    // Check if user exists
    const existingUser = await this.userModel.findById(id);

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const user = await this.userModel.softDelete(id);
    return this.toResponseDto(user);
  }

  /**
   * Verify user password
   */
  async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    // Check if user exists
    const existingUser = await this.userModel.findById(id);

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const hashedPassword = await this.hashPassword(newPassword);
    await this.userModel.updatePassword(id, hashedPassword);
  }

  /**
   * Find active users
   */
  async findActiveUsers(
    pagination?: PaginationDto,
  ): Promise<UserResponseDto[]> {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    const users = await this.userModel.findActive({
      skip,
      take: limit,
    });

    return users.map((user) => this.toResponseDto(user));
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Transform User entity to UserResponseDto
   */
  private toResponseDto(user: User): UserResponseDto {
    return plainToInstance(UserResponseDto, {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
