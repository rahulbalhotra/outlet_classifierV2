import requests
import json

url = "http://localhost:3000/api/classify"
payload = {
    "aso_name": "Vikram Singh",
    "store_name": "Test Store",
    "store_type": "Supermarket",
    "route_name": "Dum Dum Park / Narayantala",
    "avg_monthly_order_value_inr": "50000",
    "estimated_sku_count": "20",
    "sku_tags": "None",
    "apiKey": "",
    "modelName": "gemini-1.5-flash"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Content-Type: {response.headers.get('Content-Type')}")
    print(f"Response Body: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")
