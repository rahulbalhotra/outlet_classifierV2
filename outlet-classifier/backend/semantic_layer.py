import pandas as pd
import json
from pathlib import Path

class SemanticLayer:
    def __init__(self, csv_path):
        self.csv_path = Path(csv_path)
        self.df = None
        self.load_data()

    def load_data(self):
        print(f"Loading data from {self.csv_path}...")
        self.df = pd.read_csv(self.csv_path)
        
        # Preprocessing
        self.df['Month'] = pd.to_datetime(self.df['Month'])
        self.df['Sales in Rs.'] = pd.to_numeric(self.df['Sales in Rs.'], errors='coerce').fillna(0)
        self.df['KG/Litre'] = pd.to_numeric(self.df['KG/Litre'], errors='coerce').fillna(0)
        self.df['Pieces'] = pd.to_numeric(self.df['Pieces'], errors='coerce').fillna(0)
        
        # Parse Lat/Long from Outlet_Location
        def parse_coords(loc):
            try:
                if isinstance(loc, str) and ',' in loc:
                    lat, lon = loc.split(',')
                    return float(lat), float(lon)
            except:
                pass
            return None, None

        coords = self.df['Outlet_Location'].apply(parse_coords)
        self.df['Latitude'] = [c[0] for c in coords]
        self.df['Longitude'] = [c[1] for c in coords]

        # Map Clusters to friendly names
        cluster_map = {
            0: 'Gold',
            1: 'Silver',
            2: 'platinum',
            3: 'diamond'
        }
        self.df['Segment_Name'] = self.df['Cluster'].map(cluster_map).fillna(self.df['Segment_Name'])
        
        self.df = self.df.replace('(blank)', 'Unknown')
        print("Data loaded and preprocessed.")

    def get_filter_options(self):
        return {
            "categories": sorted(self.df['Category'].dropna().unique().tolist()),
            "subcategories": sorted(self.df['Subcategory'].dropna().unique().tolist()),
            "regions": sorted(self.df['Region'].dropna().unique().tolist()),
            "segments": sorted(self.df['Segment_Name'].dropna().unique().tolist()),
            "asos": sorted(self.df['ASO'].dropna().unique().tolist())
        }

    def _apply_filters(self, category=None, subcategory=None, region=None, segment=None, aso=None):
        filtered_df = self.df
        if category:
            filtered_df = filtered_df[filtered_df['Category'] == category]
        if subcategory:
            filtered_df = filtered_df[filtered_df['Subcategory'] == subcategory]
        if region:
            filtered_df = filtered_df[filtered_df['Region'] == region]
        if segment:
            filtered_df = filtered_df[filtered_df['Segment_Name'] == segment]
        if aso:
            filtered_df = filtered_df[filtered_df['ASO'] == aso]
        return filtered_df

    def get_kpis(self, **filters):
        df = self._apply_filters(**filters)
        kpis = {
            "total_sales": round(df['Sales in Rs.'].sum(), 2),
            "total_volume": round(df['KG/Litre'].sum(), 2),
            "total_outlets": int(df['Outlet_ID'].nunique()),
            "avg_sales_per_outlet": round(df['Sales in Rs.'].sum() / df['Outlet_ID'].nunique(), 2) if df['Outlet_ID'].nunique() > 0 else 0,
            "total_skus": int(df['SKU_Code'].nunique()),
            "total_regions": int(df['Region'].nunique())
        }
        return kpis

    def get_sales_trend(self, **filters):
        df = self._apply_filters(**filters)
        trend = df.groupby(df['Month'].dt.strftime('%Y-%m'))['Sales in Rs.'].sum().reset_index()
        trend.columns = ['month', 'sales']
        return trend.to_dict(orient='records')

    def get_category_distribution(self, **filters):
        df = self._apply_filters(**filters)
        dist = df.groupby('Category')['Sales in Rs.'].sum().reset_index()
        dist.columns = ['category', 'sales']
        total_sales = dist['sales'].sum()
        dist['percentage'] = (dist['sales'] / total_sales * 100).round(2) if total_sales > 0 else 0
        return dist.sort_values(by='sales', ascending=False).to_dict(orient='records')

    def get_outlet_locations(self, **filters):
        df = self._apply_filters(**filters)
        # Unique outlets with their last known lat/long and total sales
        locations = df.groupby('Outlet_ID').agg({
            'Latitude': 'first',
            'Longitude': 'first',
            'Sales in Rs.': 'sum',
            'Segment_Name': 'first',
            'Outlet_Location': 'first'
        }).reset_index()
        
        # Filter out rows with missing coords
        locations = locations.dropna(subset=['Latitude', 'Longitude'])
        
        # Limit to 1000 markers for performance, sorted by sales
        locations = locations.sort_values(by='Sales in Rs.', ascending=False).head(1000)
        
        return locations.to_dict(orient='records')

    def get_segment_analysis(self, **filters):
        df = self._apply_filters(**filters)
        seg = df.groupby('Segment_Name').agg({
            'Sales in Rs.': 'sum',
            'Outlet_ID': 'nunique'
        }).reset_index()
        seg.columns = ['segment', 'sales', 'unique_outlets']
        return seg.sort_values(by='sales', ascending=False).to_dict(orient='records')

    def get_top_skus(self, n=10, **filters):
        df = self._apply_filters(**filters)
        top = df.groupby('SKU_Name')['Sales in Rs.'].sum().reset_index()
        top.columns = ['sku', 'sales']
        return top.sort_values(by='sales', ascending=False).head(n).to_dict(orient='records')

    def get_top_distributors(self, n=5, **filters):
        df = self._apply_filters(**filters)
        top = df.groupby('Distributor_Name')['Sales in Rs.'].sum().reset_index()
        top.columns = ['distributor', 'sales']
        return top.sort_values(by='sales', ascending=False).head(n).to_dict(orient='records')

if __name__ == "__main__":
    sl = SemanticLayer(r'd:\OutlesClassifier-ChatAssist\notebooks\Final_data_set_with_segments.csv')
    print(json.dumps(sl.get_kpis(), indent=2))
