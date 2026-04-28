import pandas as pd
import json
import os
import random
import glob

# Paths
CSV_PATH = r'd:\OutlesClassifier-ChatAssist\outlet-classifier\src\data\Final data set.csv'
V3_JSON = r'd:\OutlesClassifier-ChatAssist\outlet-classifier\src\data\retail_store_data_v3.json'
IMAGES_DIR = r'd:\OutlesClassifier-ChatAssist\outlet-classifier\src\store_dataset_jpeg'

def run():
    with open(V3_JSON, 'r', encoding='utf-8') as f:
        v3_data = json.load(f)
    
    current_ids = set(s['Outlet_ID'] for s in v3_data)
    print(f"Current portfolio size: {len(current_ids)}")
    
    needed_stores = 60 - len(v3_data)
    print(f"Need to add {needed_stores} new stores.")
    
    # Load all images from the 4 subdirectories
    available_images = []
    for root, dirs, files in os.walk(IMAGES_DIR):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                # Provide relative path so it's clear which segment it came from, 
                # but if we just need filename, we should ensure uniqueness. 
                # Promt said: "associated with particular store should no repeat"
                available_images.append(os.path.join(os.path.basename(root), file))
    
    random.shuffle(available_images)
    print(f"Available images: {len(available_images)}")
    
    # Load CSV
    df = pd.read_csv(CSV_PATH, low_memory=False)
    df['Sales in Rs.'] = pd.to_numeric(df['Sales in Rs.'], errors='coerce').fillna(0)
    df['Pieces'] = pd.to_numeric(df['Pieces'], errors='coerce').fillna(0)
    df['Outlet_ID'] = df['Outlet_ID'].astype(str)
    
    month_map = {"Dec'25": "Dec 2025", "Jan'26": "Jan 2026", "Feb'26": "Feb 2026", "Mar'26": "Mar 2026"}
    df['Month_Title'] = df['Month'].map(month_map)
    df = df.dropna(subset=['Month_Title'])
    
    # Exclude current stores
    df_new = df[~df['Outlet_ID'].isin(current_ids)]
    
    # We define 5 segments to allow adding 43 stores with "upto 10 each".
    # (10 * 4 + 3 = 43)
    unique_new_ids = df_new['Outlet_ID'].unique()
    
    candidate_ids = list(unique_new_ids)
    random.shuffle(candidate_ids)
    
    new_stores = []
    segments = ['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze']
    segment_counts = {s: 0 for s in segments}
    
    for oid in candidate_ids:
        if len(new_stores) >= needed_stores:
            break
            
        store_df = df_new[df_new['Outlet_ID'] == oid]
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
                
        # Must have valid location > 0 to be mapped nicely
        if lat == 0.0 and lon == 0.0:
            continue
            
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

        total_sales = sum(h['sales_value_inr'] for h in history)
        avg_monthly = round(total_sales / 4, 2)
        
        feb_sales = history[2]['sales_value_inr']
        mar_sales = history[3]['sales_value_inr']
        growth = round(((mar_sales - feb_sales) / feb_sales) * 100, 2) if feb_sales > 0 else 0.0
        
        unique_skus = store_df['SKU_Name'].unique().tolist()
        
        # Determine segment
        if avg_monthly > 100000:
            seg = 'Diamond'
        elif avg_monthly > 50000:
            seg = 'Platinum'
        elif avg_monthly > 15000:
            seg = 'Gold'
        elif avg_monthly > 5000:
            seg = 'Silver'
        else:
            seg = 'Bronze'
            
        if segment_counts[seg] >= 9:
            continue
            
        segment_counts[seg] += 1
        img = available_images.pop()
        
        # Fix backslash to forward slash for web
        img = img.replace('\\', '/')
        
        store_obj = {
            "Outlet_ID": oid,
            "Distributor_Name": f"{oid}-{first_row['Distributor_Name']}",
            "Outlet_Type": first_row['Outlet_Types'],
            "Route_Name": first_row['Route_Name'],
            "latitude": lat + random.uniform(-0.01, 0.01),
            "longitude": lon + random.uniform(-0.01, 0.01),
            "avg_monthly_order_value_inr": avg_monthly,
            "growth_rate_percentage": growth,
            "Segment_Name": seg,
            "unique_sku_count": len(unique_skus),
            "sku_list": [str(s) for s in unique_skus if str(s) != 'nan'],
            "aso_details": {
                "ASO": first_row['ASO']
            },
            "last_audit_date": "2026-04-10",
            "monthly_sales_history": history,
            "store_image": img
        }
        
        new_stores.append(store_obj)
        
    # Fill remaining
    if len(new_stores) < needed_stores:
        for oid in candidate_ids:
            if len(new_stores) >= needed_stores:
                break
            if oid in [s['Outlet_ID'] for s in new_stores]:
                continue
            
            store_df = df_new[df_new['Outlet_ID'] == oid]
            first_row = store_df.iloc[0]
            lat, lon = 0.0, 0.0
            loc = first_row['Outlet_Location']
            if isinstance(loc, str) and ',' in loc:
                try:
                    parts = loc.split(',')
                    lat, lon = float(parts[0]), float(parts[1])
                except:
                    pass
            history = []
            monthly = store_df.groupby('Month_Title').agg({'Sales in Rs.': 'sum', 'Pieces': 'sum'}).reindex(["Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026"], fill_value=0)
            for month, row in monthly.iterrows(): history.append({"month": month, "sales_value_inr": round(row['Sales in Rs.'], 2), "orders_count": int(row['Pieces'])})
            avg_monthly = round(sum(h['sales_value_inr'] for h in history)/4, 2)
            feb_sales, mar_sales = history[2]['sales_value_inr'], history[3]['sales_value_inr']
            growth = round(((mar_sales - feb_sales) / feb_sales) * 100, 2) if feb_sales > 0 else 0.0
            unique_skus = store_df['SKU_Name'].unique().tolist()
            
            assigned_seg = None
            for s in segments:
                if segment_counts[s] < 10:
                    assigned_seg = s
                    segment_counts[s] += 1
                    break
                    
            if not assigned_seg:
                assigned_seg = 'Silver'

            img = available_images.pop().replace('\\', '/')
            new_stores.append({
                "Outlet_ID": oid,
                "Distributor_Name": f"{oid}-{first_row['Distributor_Name']}",
                "Outlet_Type": first_row['Outlet_Types'],
                "Route_Name": first_row['Route_Name'],
                "latitude": lat, "longitude": lon,
                "avg_monthly_order_value_inr": avg_monthly, "growth_rate_percentage": growth,
                "Segment_Name": assigned_seg,
                "unique_sku_count": len(unique_skus), "sku_list": [str(s) for s in unique_skus if str(s) != 'nan'],
                "aso_details": {"ASO": first_row['ASO']},
                "last_audit_date": "2026-04-10", "monthly_sales_history": history,
                "store_image": img
            })
            
    v3_data.extend(new_stores)
    
    with open(V3_JSON, 'w', encoding='utf-8') as f:
        json.dump(v3_data, f, indent=4)
        
    print(f"Successfully added {len(new_stores)} stores. Total portfolio is now {len(v3_data)}.")

if __name__ == '__main__':
    run()
