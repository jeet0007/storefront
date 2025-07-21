import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '1m', target: 5 },    // Ramp up to 5 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 5 },   // Drop back to 5 users
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    errors: ['rate<0.2'], // More lenient error rate for spike test
    http_req_duration: ['p(95)<10000'], // Very lenient response time
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://your-api-url.com';
const APP_ID = __ENV.APP_ID || 'your-app-id';
const APP_CHANNEL_SF = __ENV.APP_CHANNEL_SF || 'StoreFront';
const APP_BUSINESS = __ENV.APP_BUSINESS || 'Seated';

const headers = {
  'Content-Type': 'application/json',
  'Application-id': APP_ID,
  'Application-Channel': APP_CHANNEL_SF,
  'Application-Business': APP_BUSINESS,
};

export default function () {
  // Very basic test for spike scenarios - just hit the main endpoint
  let response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "body": null,
    "requestType": "SeatsIoWorkspace"
  }), { headers });

  let result = check(response, {
    'API survives spike': (r) => r.status < 500, // Accept any non-server-error response
    'Response received': (r) => r.body !== null,
  });

  errorRate.add(!result);
  sleep(0.1); // Short sleep for spike test
}