# Handler Tests

Thư mục này chứa các file test cho tất cả handlers trong extension Purro.

## Cấu trúc Files

- `test-utils.ts` - Utilities và mock functions cho testing
- `storage-handler.test.ts` - Tests cho storage handler
- `account-handler.test.ts` - Tests cho account handler  
- `run-all-tests.ts` - Test runner chính chạy tất cả tests

## Cách chạy Tests

### Chạy tất cả handler tests:
```bash
npm run test:handlers
```

### Chạy từng test riêng lẻ:
```bash
# Test storage handler
npm run test:storage

# Test account handler
npm run test:account
```

### Chạy trực tiếp với tsx:
```bash
# Chạy tất cả tests
npx tsx src/background/handlers/test/run-all-tests.ts

# Chạy test riêng lẻ
npx tsx src/background/handlers/test/storage-handler.test.ts
npx tsx src/background/handlers/test/account-handler.test.ts
```

## Test Pattern

Tests được viết theo pattern giống như `encryption-test.ts`, sử dụng:
- Mock Chrome API cho storage
- Helper functions để tạo test data
- Async/await pattern
- Console logging với emojis để dễ đọc

## Test Coverage

### Storage Handler Tests:
- ✅ Save/get password
- ✅ Save/get accounts
- ✅ Save/get seed phrases
- ✅ Save/get private keys
- ✅ Save/get wallets
- ✅ Update operations
- ✅ Remove operations
- ✅ Reset wallet

### Account Handler Tests:
- ✅ Mnemonic validation
- ✅ Private key format validation
- ✅ Account data structure validation
- ✅ Wallet data structure validation
- ✅ Error handling scenarios

### Auth Handler Tests (TODO):
- ❌ Session management (cần sửa import errors)
- ❌ Password verification (cần sửa import errors)  
- ❌ Timeout handling (cần sửa import errors)
- ❌ Lock/unlock functionality (cần sửa import errors)

## Mock Data

Test utilities cung cấp các mock data factories:
- `createTestAccountData()` - Tạo account data mẫu
- `createTestSeedPhraseData()` - Tạo seed phrase data mẫu
- `createTestPasswordData()` - Tạo password data mẫu
- `createTestWalletData()` - Tạo wallet data mẫu
- `createTestDataEncryption()` - Tạo encryption data mẫu

## Chrome API Mocking

Tests sử dụng mock Chrome storage API để test mà không cần browser environment thực sự.

Mock storage cung cấp:
- `get()` - Lấy data từ storage
- `set()` - Lưu data vào storage  
- `remove()` - Xóa data khỏi storage
- `clear()` - Xóa tất cả data

## Lưu ý

- Tests chạy độc lập, không cần browser environment
- Mỗi test được isolated với `clearStorage()` trước khi chạy
- Tests sử dụng TypeScript và có type checking
- Console output có màu sắc và emojis để dễ theo dõi 