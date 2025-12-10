import React from 'react';
import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';
import { Menu } from '@/client/components/ui/menu';
import { XIcon, DollarSign, BarChart3, Code } from 'lucide-react';
import { formatCurrency, truncateAddress } from '@/client/utils/formatters';
import { getNetworkIcon } from '@/utils/network-icons';
import {
  formatTokenNumber,
  getHyperliquidTradeLink,
  getTokenExplorerUrl,
} from '@/client/hooks/use-detailed-token-info';
import { UserBalance } from '@/client/types/hyperliquid-api';
import { getSpotTokenImage } from '@/client/utils/icons';
import { hyperliquidLogo } from '@/assets/logo';

interface TokenInfoSpotDialogProps {
  token: UserBalance;
  onClose: () => void;
}

const TokenInfoSpotDialog: React.FC<TokenInfoSpotDialogProps> = ({
  token,
  onClose,
}) => {
  console.log('token', token);

  return (
    <DialogWrapper>
      <DialogHeader
        title="Token Information"
        onClose={onClose}
        icon={<XIcon className="size-4 text-white" />}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          {/* Token Header */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="size-16 flex items-center justify-center rounded-full bg-[var(--primary-color)]/10 overflow-hidden">
                <img
                  src={getSpotTokenImage(token.coin)}
                  alt={token.coin}
                  className="size-full rounded-full"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const fallbackDiv = document.createElement('div');
                      fallbackDiv.className =
                        'size-full bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/10 rounded-full flex items-center justify-center font-bold text-[var(--primary-color)] text-lg border border-[var(--primary-color)]/20';
                      fallbackDiv.textContent = token.coin
                        .charAt(0)
                        .toUpperCase();
                      parent.insertBefore(fallbackDiv, e.currentTarget);
                    }
                  }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 size-6 bg-[var(--background-color)] rounded-full flex items-center justify-center border border-[var(--card-color)]">
                <img
                  src={getNetworkIcon('hyperliquid')}
                  alt="Hyperliquid"
                  className="size-4 rounded-full"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white truncate">
                {token.coin}
              </h3>
              <p className="text-white/60 truncate">
                {token.tokenInfo?.fullName || token.coin}
              </p>
              <p className="text-sm text-white/40 truncate">Hyperliquid</p>
            </div>
          </div>

          {/* Your Holdings */}
          <Menu
            items={[
              {
                icon: DollarSign,
                label: 'Balance',
                description: `${token.total.toFixed(4)} ${token.coin}`,
              },
              {
                icon: BarChart3,
                label: 'Value',
                description: (() => {
                  return formatCurrency(token.marketValue) || '0' + ' USD';
                })(),
              },
            ]}
          />

          <Menu
            items={[
              {
                icon: DollarSign,
                label: 'Price',
                description: formatTokenNumber(token.currentPrice || 0),
              },
              {
                icon: Code,
                label: 'Token ID',
                description:
                  truncateAddress(token.tokenInfo?.tokenId || '') || 'N/A',
                onClick: () => {
                  window.open(
                    getTokenExplorerUrl(
                      'hyperliquid',
                      token.tokenInfo?.tokenId || '',
                      false
                    )!,
                    '_blank'
                  );
                },
              },
              {
                icon: Code,
                label: 'Evm Contract',
                isHidden: !token.tokenInfo?.evmContract?.address,
                description:
                  truncateAddress(
                    token.tokenInfo?.evmContract?.address || ''
                  ) || 'N/A',
                onClick: () => {
                  window.open(
                    getTokenExplorerUrl(
                      'hyperevm',
                      token.tokenInfo?.evmContract?.address || '',
                      false
                    )!,
                    '_blank'
                  );
                },
              },
            ]}
          />
        </div>
      </DialogContent>

      {/* Actions moved to footer */}
      <DialogFooter className="flex-col">
        {getTokenExplorerUrl(
          'hyperliquid',
          token.tokenInfo?.tokenId || '',
          false
        ) &&
          token.tokenInfo?.tokenId &&
          token.tokenInfo?.tokenId !== '0x6d1e7cde53ba9467b783cb7c530ce054' && (
            <Button
              variant="secondary"
              className="w-full flex items-center gap-2"
              onClick={() =>
                window.open(
                  getHyperliquidTradeLink(token.tokenInfo?.tokenId || '')!,
                  '_blank'
                )
              }
            >
              <img src={hyperliquidLogo} alt="Hyperliquid" className="size-4" />
              Trade on Hyperliquid
            </Button>
          )}
      </DialogFooter>
    </DialogWrapper>
  );
};

export default TokenInfoSpotDialog;
