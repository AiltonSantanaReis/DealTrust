import { Injectable } from "@nestjs/common";
import { hash, type Options, verify } from "@node-rs/argon2";

const passwordHashOptions: Options = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1
};

@Injectable()
export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    return hash(password, passwordHashOptions);
  }

  async verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
