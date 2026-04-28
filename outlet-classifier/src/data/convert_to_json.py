import pandas as pd
import json
import os
from pathlib import Path

# Paths
CSV_PATH = r'd:\OutlesClassifier-ChatAssist\outlet-classifier\src\data\Final data set.csv'
OUTPUT_JSON = r'd:\OutlesClassifier-ChatAssist\outlet-classifier\src\data\retail_store_data_v3.json'
IMAGE_DIR = r'd:\OutlesClassifier-ChatAssist\notebooks\Store Image Database\golds'

# Specific IDs to include
GOLD_IDS = ['16872', '274460', '277592', '351352', '452169', '664', '885']
Diamond_IDS = ['351754']
SILVER_IDS = ['147080', '16877', '23704', '408164', '437694', '474688', '475463', '475509', '475622']

def convert():
    print(f"Reading CSV from {CSV_PATH}...")
    # Load only necessary columns for performance
    df = pd.read_csv(CSV_PATH, low_memory=False)
    print(f"Done reading CSV. Shape: {df.shape}")
    
    # Preprocessing
    df['Sales in Rs.'] = pd.to_numeric(df['Sales in Rs.'], errors='coerce').fillna(0)
    df['Pieces'] = pd.to_numeric(df['Pieces'], errors='coerce').fillna(0)
    
    # Map months
    month_map = {
        "Dec'25": "Dec 2025",
        "Jan'26": "Jan 2026",
        "Feb'26": "Feb 2026",
        "Mar'26": "Mar 2026"
    }
    df['Month_Title'] = df['Month'].map(month_map)
    df = df.dropna(subset=['Month_Title']) # Keep only these 4 months

    # Ensure IDs are strings for matching
    df['Outlet_ID'] = df['Outlet_ID'].astype(str)
    
    # Include gold, silver and diamond ids
    selected_ids = []
    for gid in GOLD_IDS + Diamond_IDS + SILVER_IDS:
        if gid in df['Outlet_ID'].values:
            selected_ids.append(gid)
        else:
            print(f"Warning: ID {gid} not found in CSV")

    final_data = []

    for oid in selected_ids:
        store_df = df[df['Outlet_ID'] == oid]
        first_row = store_df.iloc[0]
        
        # Parse coords
        lat, lon = 0.0, 0.0
        loc = first_row['Outlet_Location']
        if isinstance(loc, str) and ',' in loc:
            try:
                parts = loc.split(',')
                lat = float(parts[0])
                lon = float(parts[1])
            except:
                pass

        # Monthly History
        history = []
        monthly_groups = store_df.groupby('Month_Title').agg({
            'Sales in Rs.': 'sum',
            'Pieces': 'sum'
        }).reindex(["Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026"], fill_value=0)

        for month, row in monthly_groups.iterrows():
            history.append({
                "month": month,
                "sales_value_inr": round(row['Sales in Rs.'], 2),
                "orders_count": int(row['Pieces'])
            })

        # Calculations
        total_sales = sum(h['sales_value_inr'] for h in history)
        avg_monthly = round(total_sales / 4, 2)
        
        # Growth Rate (Mar vs Feb)
        feb_sales = history[2]['sales_value_inr']
        mar_sales = history[3]['sales_value_inr']
        growth = 0.0
        if feb_sales > 0:
            growth = round(((mar_sales - feb_sales) / feb_sales) * 100, 2)

        # Image Check
        store_image = None
        # Check both Golds and Silver folders
        for folder in ['golds', 'Silver']:
            search_dir = os.path.join(os.path.dirname(IMAGE_DIR), folder)
            if os.path.exists(os.path.join(search_dir, f"{oid}.png")):
                store_image = f"{oid}.png"
                break
            elif os.path.exists(os.path.join(search_dir, f"{oid}.jpg")):
                store_image = f"{oid}.jpg"
                break

        # Segment Name
        if oid in Diamond_IDS:
            segment_name = 'Diamond'
        elif oid in GOLD_IDS:
            segment_name = 'Gold'
        else:
            segment_name = 'Silver'

        # SKU Details
        unique_skus = store_df['SKU_Name'].unique().tolist()
        sku_count = len(unique_skus)

        store_obj = {
            "Outlet_ID": oid,
            "Distributor_Name": f"{oid}-{first_row['Distributor_Name']}",
            "Outlet_Type": first_row['Outlet_Types'],
            "Route_Name": first_row['Route_Name'],
            "latitude": lat,
            "longitude": lon,
            "avg_monthly_order_value_inr": avg_monthly,
            "growth_rate_percentage": growth,
            "Segment_Name": segment_name,
            "unique_sku_count": sku_count,
            "sku_list": unique_skus,
            "aso_details": {
                "ASO": first_row['ASO']
            },
            "last_audit_date": "2026-04-10",
            "monthly_sales_history": history
        }
        
        if store_image:
            store_obj["store_image"] = store_image

        final_data.append(store_obj)

    with open(OUTPUT_JSON, 'w') as f:
        json.dump(final_data, f, indent=4)
    
    print(f"Successfully converted {len(final_data)} stores to {OUTPUT_JSON}")

if __name__ == "__main__":
    convert()
