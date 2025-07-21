import http from 'k6/http';
import { check } from 'k6';
import { createSdkRequest, createApiHeaders, extractResponseId } from './helpers.js';

export class StorefrontApiClient {
  constructor(baseUrl, appId, appChannel, appBusiness) {
    this.baseUrl = baseUrl;
    this.headers = createApiHeaders(appId, appChannel, appBusiness);
    this.endpoint = `${baseUrl}/sdk/request`;
  }

  makeRequest(requestType, body, expectedStatus = 200) {
    const response = http.post(
      this.endpoint,
      createSdkRequest(requestType, body),
      { headers: this.headers }
    );

    const result = check(response, {
      [`${requestType} request successful`]: (r) => r.status === expectedStatus,
      [`${requestType} response time acceptable`]: (r) => r.timings.duration < 5000,
    });

    return { response, success: result };
  }

  getSeatsIoWorkspace() {
    return this.makeRequest('SeatsIoWorkspace', null);
  }

  createSeatedShoppingCart(eventId, seats, applicationParameters) {
    const body = {
      event: eventId,
      seats,
      applicationParameters
    };
    return this.makeRequest('CreateSeatedShoppingCart', body);
  }

  agreeUserPurchase(shoppingCartId) {
    return this.makeRequest('AgreeUserPurchase', shoppingCartId);
  }

  fillPurchaserInformation(shoppingCartId, purchaserInformation) {
    const body = {
      shoppingCartId,
      purchaserInformation
    };
    return this.makeRequest('FillPurchaserInformation', body);
  }

  getCart(shoppingCartId, populate = null) {
    const body = {
      shoppingCartId,
      ...(populate && { populate })
    };
    return this.makeRequest('GetCart', body);
  }

  paymentProcessorRequest(paymentProcessorId, requestType, body) {
    const requestBody = {
      paymentProcessorId,
      requestType,
      body
    };
    return this.makeRequest('PaymentProcessorRequest', requestBody);
  }

  startPayment(shoppingCartId) {
    return this.makeRequest('StartPayment', shoppingCartId);
  }

  getCartInfo(shoppingCartId, includeCart = false) {
    const body = {
      shoppingCartId,
      includeCart
    };
    return this.makeRequest('GetCartInfo', body);
  }

  getPurchaseCodesFromOrderNumber(orderNumber) {
    return this.makeRequest('GetPurchaseCodesFromOrderNumber', orderNumber);
  }
}