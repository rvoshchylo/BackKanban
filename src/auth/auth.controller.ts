import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { AccessTokenGuard } from 'src/common/guards/accessToken.guard';
import { RefreshTokenGuard } from 'src/common/guards/refreshToken.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signUp(createUserDto);
  }

  @Post('signin')
  signin(@Body() data: AuthDto) {
    return this.authService.signIn(data);
  }

  @UseGuards(AccessTokenGuard)
  @Get('logout')
  async logout(@Req() req: Request) {
    const user = req.user as Record<string, any>;
    if (user && typeof user['sub'] === 'string') {
      try {
        await this.authService.logout(user['sub']);
      } catch (error) {
        console.error('Logout failed:', error);
        throw new InternalServerErrorException('Logout failed');
      }
    } else {
      throw new UnauthorizedException('Invalid user information');
    }
  }

  @UseGuards(RefreshTokenGuard)
  @Get('refresh')
  refreshTokens(
    @Req() req: Request & { user: { username: string; refreshToken: string } },
  ) {
    const userName = req.user['username'];
    const refreshToken = req.user['refreshToken'];
    return this.authService.refreshTokens(userName, refreshToken);
  }
}
