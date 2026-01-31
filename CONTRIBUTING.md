# Contributing Guidelines

## Security & Privacy First

When contributing to this project, please ensure:

1. **No User Data Collection**: Never add features that collect, store, or share user data beyond wallet addresses (which are hashed)
2. **Privacy by Design**: All wallet addresses must be hashed before storage
3. **Input Validation**: All user inputs must be validated and sanitized
4. **No Tracking**: Do not add analytics, cookies, or tracking mechanisms
5. **Legal Compliance**: Ensure all features comply with applicable laws and regulations

## Code Style

- Use consistent formatting (Prettier recommended)
- Add comments for complex Solana operations
- Include error handling for all async operations
- Validate all inputs before processing

## Testing

- Test on Solana devnet before mainnet
- Verify wallet connections work with multiple wallets
- Test token operations with small amounts first
- Ensure encryption/decryption works correctly

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request with a clear description

## Important Notes

- This is a demo/hackathon project - not production-ready
- Always prioritize user privacy and security
- Never commit private keys or sensitive data
- Review all Solana transactions before signing
