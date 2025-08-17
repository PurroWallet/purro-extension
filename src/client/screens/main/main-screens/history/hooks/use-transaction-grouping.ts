import { useMemo } from 'react';
import type { TransactionWithChain, GroupedTransactions } from '../types';
import { formatTransactionDate } from '../utils/formatting-utils';

export const useTransactionGrouping = (
    processedTransactions: TransactionWithChain[]
): GroupedTransactions[] => {
    return useMemo(() => {
        const groups: GroupedTransactions[] = [];
        const groupMap = new Map<string, TransactionWithChain[]>();

        processedTransactions.forEach(tx => {
            const date = formatTransactionDate(tx.timeStamp || '0');

            if (!groupMap.has(date)) {
                groupMap.set(date, []);
            }
            groupMap.get(date)!.push(tx);
        });

        // Convert map to array and sort by date (most recent first)
        Array.from(groupMap.entries())
            .sort(
                ([dateA], [dateB]) =>
                    new Date(dateB).getTime() - new Date(dateA).getTime()
            )
            .forEach(([date, transactions]) => {
                groups.push({ date, transactions });
            });

        return groups;
    }, [processedTransactions]);
}; 