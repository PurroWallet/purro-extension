import { useState, useCallback, useMemo } from 'react';

export interface PasswordValidation {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
    score: number;
}

export interface UsePasswordReturn {
    password: string;
    confirmPassword: string;
    showPassword: boolean;
    showConfirmPassword: boolean;
    validation: PasswordValidation;
    isMatching: boolean;
    setPassword: (password: string) => void;
    setConfirmPassword: (confirmPassword: string) => void;
    toggleShowPassword: () => void;
    toggleShowConfirmPassword: () => void;
    validatePassword: (password: string) => PasswordValidation;
    reset: () => void;
}

const usePassword = (): UsePasswordReturn => {
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

    const validatePassword = useCallback((pwd: string): PasswordValidation => {
        const errors: string[] = [];
        let score = 0;

        // Length check
        if (pwd.length < 8) {
            errors.push('Password must be at least 8 characters long');
        } else {
            score += 1;
        }

        // Uppercase check
        if (!/[A-Z]/.test(pwd)) {
            errors.push('Password must contain at least one uppercase letter');
        } else {
            score += 1;
        }

        // Lowercase check
        if (!/[a-z]/.test(pwd)) {
            errors.push('Password must contain at least one lowercase letter');
        } else {
            score += 1;
        }

        // Number check
        if (!/\d/.test(pwd)) {
            errors.push('Password must contain at least one number');
        } else {
            score += 1;
        }

        // Special character check
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
            errors.push('Password must contain at least one special character');
        } else {
            score += 1;
        }

        // Length bonus
        if (pwd.length >= 12) {
            score += 1;
        }

        // Determine strength
        let strength: 'weak' | 'medium' | 'strong';
        if (score <= 2) {
            strength = 'weak';
        } else if (score <= 4) {
            strength = 'medium';
        } else {
            strength = 'strong';
        }

        return {
            isValid: errors.length === 0 && pwd.length >= 8,
            errors,
            strength,
            score
        };
    }, []);

    const validation = useMemo(() => validatePassword(password), [password, validatePassword]);

    const isMatching = useMemo(() => {
        return password === confirmPassword && password.length > 0;
    }, [password, confirmPassword]);

    const toggleShowPassword = useCallback(() => {
        setShowPassword(prev => !prev);
    }, []);

    const toggleShowConfirmPassword = useCallback(() => {
        setShowConfirmPassword(prev => !prev);
    }, []);

    const reset = useCallback(() => {
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
    }, []);

    return {
        password,
        confirmPassword,
        showPassword,
        showConfirmPassword,
        validation,
        isMatching,
        setPassword,
        setConfirmPassword,
        toggleShowPassword,
        toggleShowConfirmPassword,
        validatePassword,
        reset
    };
};

export default usePassword; 