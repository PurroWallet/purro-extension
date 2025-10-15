export interface Contact {
    id: string;
    name: string;
    address: string;
    chain: 'eip155' | 'solana' | 'sui' | 'all'; // 'all' for multi-chain addresses
    note?: string;
    createdAt: number;
    updatedAt: number;
}

export interface AddressBook {
    contacts: Record<string, Contact>; // contactId -> Contact
    order: string[]; // Ordered list of contact IDs for consistent display
}

export interface AddContactInput {
    name: string;
    address: string;
    chain: 'eip155' | 'solana' | 'sui' | 'all';
    note?: string;
}

export interface UpdateContactInput {
    id: string;
    name?: string;
    address?: string;
    chain?: 'eip155' | 'solana' | 'sui' | 'all';
    note?: string;
}

