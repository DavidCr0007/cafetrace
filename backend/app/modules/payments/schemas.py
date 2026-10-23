from pydantic import BaseModel, Field


class PaymentIntent(BaseModel):
    provider: str = Field("manual", pattern="^(manual|wompi|stripe)$")
