import pandas as pd
import json

csv_path = r'd:\OutlesClassifier-ChatAssist\outlet-classifier\backend\Final_data_set_with_segments.csv'
df = pd.read_csv(csv_path)

locations = df['Outlet_Location'].unique().tolist()
print(f"Total unique locations: {len(locations)}")
print(locations[:20])
