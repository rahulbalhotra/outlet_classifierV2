import pandas as pd

csv_path = r'd:\OutlesClassifier-ChatAssist\notebooks\Final_data_set_with_segments.csv'
df = pd.read_csv(csv_path)

print("Row Counts per Segment:")
print(df['Segment_Name'].value_counts())

print("\nUnique Outlet Counts per Segment:")
print(df.groupby('Segment_Name')['Outlet_ID'].nunique())

print("\nTotal Sales per Segment:")
print(df.groupby('Segment_Name')['Sales in Rs.'].sum())
