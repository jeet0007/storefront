# Storefront Load Tests

K6 load testing suite for the storefront purchase flow.

## Prerequisites

1. Install k6: https://k6.io/docs/getting-started/installation/
2. Set up environment variables (see Configuration section)

## Configuration

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

Required environment variables:
- `BASE_URL`: Your API base URL
- `APP_ID`: Application ID
- `APP_CHANNEL_SF`: Application channel (default: StoreFront)
- `APP_BUSINESS`: Business name (default: Seated)
- `EVENT_ID`: Event ID for testing
- `SEATS_IO_KEY`: Seats.io API key

## Running Tests

### Quick Start

```bash
# Install dependencies
npm install

# Run basic smoke test
npm run test:smoke

# Run load test
npm run test:load

# Run stress test
npm run test:stress

# Run spike test
npm run test:spike
```

### Advanced Usage

```bash
# Run with custom environment variables
BASE_URL=https://api.example.com EVENT_ID=your-event-id k6 run tests/purchase-flow-load-test.js

# Run with custom options
k6 run --vus 20 --duration 10m tests/purchase-flow-load-test.js

# Generate HTML report
k6 run --out html=report.html tests/purchase-flow-load-test.js
```

## Test Scenarios

### 1. Smoke Test (`smoke-test.js`)
- **Purpose**: Basic API availability check
- **Load**: 1 user for 30 seconds
- **Thresholds**: Error rate < 1%, Response time p95 < 1s

### 2. Load Test (`purchase-flow-load-test.js`)
- **Purpose**: Complete purchase flow under normal load
- **Load**: 5-10 users over 9 minutes
- **Thresholds**: Error rate < 5%, Response time p95 < 2s

### 3. Stress Test (`stress-test.js`)
- **Purpose**: Find system limits
- **Load**: Up to 100 users over 27 minutes
- **Thresholds**: Error rate < 10%, Response time p95 < 5s

### 4. Spike Test (`spike-test.js`)
- **Purpose**: Test sudden traffic spikes
- **Load**: Spike from 5 to 100 users quickly
- **Thresholds**: Error rate < 20%, Response time p95 < 10s

## Purchase Flow Steps

The load tests simulate the complete purchase flow:

1. **Get SeatsIo Workspace** - Initialize seating workspace
2. **Create Shopping Cart** - Select seats and create cart
3. **Agree User Purchase** - Accept purchase terms
4. **Fill Purchaser Info** - Add customer details
5. **Get Cart Details** - Retrieve cart with event info
6. **Setup Payment** - Initialize payment processor
7. **Start Payment** - Begin payment process
8. **Get Detailed Cart** - Retrieve full cart details
9. **Confirm Payment** - Process payment
10. **Get Order Number** - Retrieve order confirmation
11. **Get QR Code** - Generate purchase codes

## Utilities

### Helper Functions (`utils/helpers.js`)
- `generateTestEmail()` - Create unique test emails
- `generateTestUser()` - Generate test user data
- `createApiHeaders()` - Standard API headers
- `createSdkRequest()` - Format SDK requests

### API Client (`utils/api-client.js`)
- `StorefrontApiClient` - Wrapper for all API calls
- Built-in error checking and response validation

## Monitoring & Metrics

Key metrics tracked:
- **Error Rate**: Percentage of failed requests
- **Response Time**: p95 response times for all endpoints
- **Throughput**: Requests per second
- **Purchase Success Rate**: End-to-end flow completion

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify APP_ID, APP_CHANNEL_SF, APP_BUSINESS values
   - Check API endpoint URL

2. **Event Not Found**
   - Verify EVENT_ID exists and is active
   - Check event permissions

3. **Timeout Errors**
   - Increase thresholds in test options
   - Check network connectivity
   - Verify API server capacity

### Debug Mode

Run with verbose output:
```bash
k6 run --http-debug="full" tests/purchase-flow-load-test.js
```

## Performance Targets

- **Response Time**: 95% of requests < 2 seconds
- **Error Rate**: < 5% for normal load, < 10% for stress
- **Throughput**: Handle 10+ concurrent purchase flows
- **Availability**: 99.9% uptime during load tests