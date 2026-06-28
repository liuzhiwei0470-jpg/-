import type { UserCreateInput, UserResponse } from '../models/user';
export declare class AuthService {
    register(input: UserCreateInput): Promise<{
        token: string;
        user: UserResponse;
    }>;
    login(input: UserCreateInput): Promise<{
        token: string;
        user: UserResponse;
    }>;
    getUserById(id: number): Promise<UserResponse | null>;
    private generateToken;
    verifyToken(token: string): {
        userId: number;
        email: string;
    };
    private toUserResponse;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map