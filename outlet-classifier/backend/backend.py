from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from semantic_layer import SemanticLayer
import uvicorn
from typing import Optional
import os

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Semantic Layer
script_dir = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(script_dir, "Final_data_set_with_segments.csv")
sl = SemanticLayer(DATA_PATH)

@app.get("/api/filters")
async def get_filters():
    return sl.get_filter_options()

@app.get("/api/kpis")
async def get_kpis(category: Optional[str] = None, subcategory: Optional[str] = None, region: Optional[str] = None, segment: Optional[str] = None, aso: Optional[str] = None):
    return sl.get_kpis(category=category, subcategory=subcategory, region=region, segment=segment, aso=aso)

@app.get("/api/charts/sales-trend")
async def get_sales_trend(category: Optional[str] = None, subcategory: Optional[str] = None, region: Optional[str] = None, segment: Optional[str] = None, aso: Optional[str] = None):
    return sl.get_sales_trend(category=category, subcategory=subcategory, region=region, segment=segment, aso=aso)

@app.get("/api/charts/category-distribution")
async def get_category_distribution(category: Optional[str] = None, subcategory: Optional[str] = None, region: Optional[str] = None, segment: Optional[str] = None, aso: Optional[str] = None):
    return sl.get_category_distribution(category=category, subcategory=subcategory, region=region, segment=segment, aso=aso)

@app.get("/api/charts/locations")
async def get_locations(category: Optional[str] = None, subcategory: Optional[str] = None, region: Optional[str] = None, segment: Optional[str] = None, aso: Optional[str] = None):
    return sl.get_outlet_locations(category=category, subcategory=subcategory, region=region, segment=segment, aso=aso)

@app.get("/api/charts/segmentation")
async def get_segmentation(category: Optional[str] = None, subcategory: Optional[str] = None, region: Optional[str] = None, segment: Optional[str] = None, aso: Optional[str] = None):
    return sl.get_segment_analysis(category=category, subcategory=subcategory, region=region, segment=segment, aso=aso)

@app.get("/api/charts/top-skus")
async def get_top_skus(n: int = 10, category: Optional[str] = None, subcategory: Optional[str] = None, region: Optional[str] = None, segment: Optional[str] = None, aso: Optional[str] = None):
    return sl.get_top_skus(n=n, category=category, subcategory=subcategory, region=region, segment=segment, aso=aso)

@app.get("/api/charts/top-distributors")
async def get_top_distributors(n: int = 5, category: Optional[str] = None, subcategory: Optional[str] = None, region: Optional[str] = None, segment: Optional[str] = None, aso: Optional[str] = None):
    return sl.get_top_distributors(n=n, category=category, subcategory=subcategory, region=region, segment=segment, aso=aso)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
