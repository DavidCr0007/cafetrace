from fastapi import APIRouter
from app.modules.accounting import router as accounting
from app.modules.audit import router as oversight
from app.modules.blockchain import router as blockchain
from app.modules.catalog import router as catalog
from app.modules.identity import admin, auth, users
from app.modules.insights import quality, weather
from app.modules.logistics import router as logistics
from app.modules.orders import router as orders
from app.modules.payments import router as payments
from app.modules.traceability import batches, iot

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(batches.router, prefix="/batches", tags=["Batches"])
api_router.include_router(blockchain.router, prefix="/batches", tags=["Blockchain"])
api_router.include_router(catalog.router, prefix="/products", tags=["Products"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather / IoT"])
api_router.include_router(iot.router, prefix="/iot", tags=["IoT"])
api_router.include_router(oversight.router, prefix="/admin", tags=["Administration"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administration"])
api_router.include_router(payments.router, prefix="/operations", tags=["Payments"])
api_router.include_router(logistics.router, prefix="/operations", tags=["Logistics"])
api_router.include_router(quality.router, prefix="/ai", tags=["AI pipeline"])
api_router.include_router(accounting.router, prefix="/accounting", tags=["Accounting and settlements"])
