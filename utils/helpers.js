import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const generateTestEmail = (vu, iter) => {
  return `loadtest.${vu}.${iter}@example.com`;
};

export const generateTestUser = (vu, iter) => {
  return {
    email: generateTestEmail(vu, iter),
    firstName: `LoadTest${vu}`,
    lastName: `User${iter}`,
    address1: `Test Street ${randomIntBetween(1, 999)}`,
    address2: '',
    phone: `+1${randomIntBetween(1000000000, 9999999999)}`,
    city: 'Test City',
    zone: 'TH-10',
    postalCode: `${randomIntBetween(10000, 99999)}`,
    country: 'US'
  };
};

export const generateSeatLabel = (vu, iter) => {
  return `${randomIntBetween(100, 999)} ${String.fromCharCode(65 + (vu % 26))}`;
};

export const generateHoldToken = (vu, iter) => {
  return `test-hold-${vu}-${iter}-${randomString(8)}`;
};

export const createApiHeaders = (appId, appChannel, appBusiness) => {
  return {
    'Content-Type': 'application/json',
    'Application-id': appId,
    'Application-Channel': appChannel,
    'Application-Business': appBusiness,
  };
};

export const createSdkRequest = (requestType, body) => {
  return JSON.stringify({
    requestType,
    body
  });
};

export const extractResponseId = (response, idField = 'uuid') => {
  if (response.status === 200) {
    try {
      const responseBody = JSON.parse(response.body);
      return responseBody[idField] || responseBody.id;
    } catch (e) {
      console.error('Failed to parse response body:', e);
    }
  }
  return null;
};

export const createShoppingSeat = (vu, iter, ticketTypeId = '68481b94861e9c995183b3ed') => {
  return {
    label: generateSeatLabel(vu, iter),
    displayLabel: generateSeatLabel(vu, iter),
    holdToken: generateHoldToken(vu, iter),
    selectedTicketType: ticketTypeId,
    objectType: 'GeneralAdmissionArea',
    category: {
      label: 'VIP Zone',
      key: '5'
    }
  };
};

export const createPaymentToken = () => {
  return {
    token: 'cnon:card-nonce-ok',
    details: {
      billing: {
        postalCode: '11111'
      },
      card: {
        brand: 'VISA',
        expMonth: 11,
        expYear: 2027,
        last4: '1111'
      },
      method: 'Card'
    }
  };
};