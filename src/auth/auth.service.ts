import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(createUserDto: CreateUserDto): Promise<any> {
    const userExists = await this.usersService.findByUsername(
      createUserDto.userName,
    );
    if (userExists) {
      throw new BadRequestException('User already exists');
    }

    const emailExists = await this.usersService.findByEmail(
      createUserDto.email,
    );

    if (emailExists) {
      throw new BadRequestException('Email already exists');
    }

    const hash = await this.hashData(createUserDto.password);
    const newUser = await this.usersService.create({
      ...createUserDto,
      password: hash,
    });
    if (!newUser.userName) {
      throw new BadRequestException('Invalid username');
    }
    const tokens = await this.getTokens(newUser.id, newUser.userName);
    await this.updateRefreshToken(newUser.id, tokens.refreshToken);
    return tokens;
  }

  async signIn(data: AuthDto) {
    const user = await this.usersService.findByUsername(data.userName);
    if (!user) throw new BadRequestException('User does not exist');

    const passwordMatches = await argon2.verify(user.password, data.password);

    if (!passwordMatches) {
      throw new BadRequestException('Password is incorrect');
    }

    const tokens = await this.getTokens(user.id, user.userName);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    return this.usersService.update(userId, { refreshToken: null });
  }

  hashData(data: string) {
    return argon2.hash(data);
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await this.hashData(refreshToken);
    await this.usersService.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async getTokens(userId: string, username: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '10s',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '15s',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(userName: string, refreshToken: string) {
    const user = await this.usersService.findByUsername(userName);
    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access Denied');
    const refreshTokenMatches = await argon2.verify(
      user.refreshToken,
      refreshToken,
    );

    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');
    const tokens = await this.getTokens(user.id, user.userName);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }
}
