## Load test Purchase Flow 
This is a load test for the purchase flow of a web application. It simulates multiple users performing the purchase flow concurrently to test the performance and scalability of the application.

## Setup
1. Need to have SEATS_IO_KEY from https://seats.io/
2. Need EVENT_ID from the event pre-created in the system.

## Side Notes
All requests are made to the /sdk/request endpoint. Must have the following headers:
```json
{
    "Application-id":{{APP_ID}},
    "Application-Channel":{{APP_CHANNEL_SF}},
    "Application-Business":{{APP_BUSINESS}}
}
```

## Steps
1. POST: /sdk/request
```json
POST (GetSeatsIoWorkspace) /sdk/request
Content-Type: application/json
 {
        "body": null,
        "requestType": "SeatsIoWorkspace"
}
```
Get UUID from the response. Save it as seatsIoWorkspaceId
2. (TicketSelection) POST: /sdk/request
```json
{
    "requestType": "CreateSeatedShoppingCart",
    "body": {
        "event": "{{EVENT_ID}}",
        "seats": [
            {
                "label": "107 V",
                "displayLabel": "107 V",
                "holdToken": "{{SEATS_IO_KEY}}",
                "selectedTicketType": "68481b94861e9c995183b3ed",
                "objectType": "GeneralAdmissionArea",
                "category": {
                    "label": "VIP Zone",
                    "key": "5"
                }
            }
        ],
        "applicationParameters": {
            "channel": "{{APP_CHANNEL_SF}}",
            "business": "{{APP_BUSINESS}}"
        }
    }
}
```
Save UUID from the response as shoppingCartId.
3. (AgreeUserPurchase) POST: /sdk/request
```json
{
    "requestType": "AgreeUserPurchase",
    "body": "{{shoppingCartId}}"
}
```
4. (fillPurchaser) POST: /sdk/request
```json
{
    "requestType": "FillPurchaserInformation",
    "body": {
        "shoppingCartId": "{{shoppingCartId}}",
        "purchaserInformation": {
            "email": "test.pm@sainexis.com",
            "firstName": "Postman",
            "lastName": "Testing",
            "address1": "Stress 11, garden",
            "address2": "",
            "phone": "+660999999999",
            "city": "new york",
            "zone": "TH-10",
            "postalCode": "10000",
            "country": "TH"
        }
    }
}
```
5. (getPaymentProcessor) POST: /sdk/request
```json
{
    "requestType": "GetCart",
    "body": {
        "shoppingCartId": "{{shoppingCartId}}",
        "populate": "event"
    }
}
```
6. (PaymentProcessorRequest) POST: /sdk/request
```json
{
    "requestType": "PaymentProcessorRequest",
    "body": {
        "paymentProcessorId": "{{paymentProcessorId}}",
        "requestType": "setup",
        "body": {
            "paymentProcessorId": "{{paymentProcessorId}}",
            "eventId": "{{eventId}}"
        }
    }
}
```
7. (PlaceOrder) POST: /sdk/request
```json
{
    "requestType": "StartPayment",
    "body": "{{shoppingCartId}}"
}
```
8. (GetCart) POST: /sdk/request
```json
{
    "requestType": "GetCart",
    "body": {
        "shoppingCartId": "{{shoppingCartId}}",
        "populate": [
            {
                "path": "items.ticket"
            },
            {
                "path": "items.addOn"
            },
            {
                "path": "event",
                "populate": [
                    {
                        "path": "venue"
                    }
                ]
            },
            {
                "path": "taxes"
            },
            {
                "path": "fees"
            },
            {
                "path": "customer"
            },
            {
                "path": "promoCodes"
            },
            {
                "path": "purchaserAnswers.question"
            }
        ]
    }
}
```
save the response as cartInfo 
9. (ConfirmPayment) POST: /sdk/request
```json
{
  "requestType": "PaymentProcessorRequest",
  "body": {
    "paymentProcessorId": "{{paymentProcessorId}}",
    "requestType": "confirmPayment",
    "body": {
      "shoppingCartId": "{{shoppingCartId}}",
      "method": "Card",
      "applicationParameters": {
        "channel": "StoreFront",
        "business": "Seated"
      },
      "tokenResult": {
        "token": "cnon:card-nonce-ok",
        "details": {
          "billing": {
            "postalCode": "11111"
          },
          "card": {
            "brand": "VISA",
            "expMonth": 11,
            "expYear": 2027,
            "last4": "1111"
          },
          "method": "Card"
        }
      },
      "squareItemizationSettings": []
    }
  }
}
```
10. (GetOrderNo) POST: /sdk/request
```json
{
    "body": {
        "shoppingCartId": "{{shoppingCartId}}",
        "includeCart": false
    },
    "requestType": "GetCartInfo"
}
```
Save orderNumber from response as orderNo. JSONPATH: $.orderNumber
11. (GetQR) POST: /sdk/request
```json
{
    "body": "{{orderNo}}",
    "requestType": "GetPurchaseCodesFromOrderNumber"
}
```
Save qrCode from response as qrCode. JSONPATH: $.data[0].originalCode







   