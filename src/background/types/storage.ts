export type SessionData = {
    password: string;
    timestamp: number;
    expiresAt: number;
}

export type PasswordData = {
    data: string;
    salt: string;
}
