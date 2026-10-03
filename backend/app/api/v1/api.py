from fastapi import APIRouter
from app.api.v1.endpoints import auth, batches, products, users, orders, weather, iot, admin, operations, ai, accounting

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(batches.router, prefix="/batches", tags=["Batches"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather / IoT"])
api_router.include_router(iot.router, prefix="/iot", tags=["IoT"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administration"])
api_router.include_router(operations.router, prefix="/operations", tags=["Payments and logistics"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI pipeline"])
api_router.include_router(accounting.router, prefix="/accounting", tags=["Accounting and settlements"])
