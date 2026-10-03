from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, model_validator
from app.models.user import UserRole


class CompensationRuleCreate(BaseModel):
    user_id: Optional[int] = None
    role: Optional[UserRole] = None
    category: Optional[str] = None
    basis: str = Field(..., pattern="^(fixed_salary|volume_kg|sales_percentage)$")
    rate: Decimal = Field(Decimal("0"), ge=0)
    fixed_amount: Decimal = Field(Decimal("0"), ge=0)
    currency: str = "COP"

    @model_validator(mode="after")
    def validate_rate(self):
        if self.basis == "sales_percentage" and self.rate > 100:
            raise ValueError("El porcentaje de ventas debe estar entre 0 y 100")
        if self.basis == "fixed_salary" and self.fixed_amount <= 0:
            raise ValueError("El salario fijo debe ser mayor que cero")
        return self


class SettlementCostInput(BaseModel):
    logistics_cost: Decimal = Field(Decimal("0"), ge=0)


class PayrollCreate(BaseModel):
    user_id: int
    period_start: datetime
    period_end: datetime
    deductions: Decimal = Field(Decimal("0"), ge=0)
