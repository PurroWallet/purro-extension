# 🚀 Purro Extension v0.7.1

## ✨ New Features

### 📒 Address Book
Save and manage your frequently used addresses with ease.
- **Multi-chain Support**: EVM, Solana, Sui
- **Quick Access**: Use contacts when sending tokens or importing wallets
- **Full Management**: Add, edit, delete, and search contacts
- **Access From**:
  - Settings → Address Book
  - Send Token screen (quick select dropdown)
  - Import screen (import as watch-only)

### 🔤 Recovery Phrase Input
Improved seed phrase input experience:
- **Better Navigation**: Space/Enter moves to next field, Backspace goes to previous
- **Smart Input**: Auto-trim spaces and convert to lowercase
- **Enhanced Validation**: Real-time validation with duplicate detection

## 🐛 Bug Fixes

- **Fixed Account Switching**: Deleting active account now automatically switches to the first available account
- **Fixed Address Book Import**: Resolved "Invalid import type" error with proper success message
- **Fixed Import State**: Improved error clearing to prevent error flashes

## 🧪 How to Test

1. **Address Book**: Settings → Address Book → Add contacts → Use in Send Token
2. **Recovery Phrase**: Import → Test Space/Enter/Backspace navigation
3. **Account Switching**: Delete active account → Verify auto-switch to first account

## 📦 Build

```bash
pnpm install
pnpm run build
```

## 🔄 Upgrade Notes

- No migration needed - address book starts empty
- No new permissions required
- All existing data remains unchanged

---

**Version**: 0.7.1  
**Release Date**: January 2025  
**Previous Version**: 0.7.0

