from typing import Optional
from pydantic import BaseModel


class BlockchainVerification(BaseModel):
    batch_id: int
    configured: bool
    verified: bool
    data_hash: Optional[str] = None
    on_chain_hash: Optional[str] = None
    transaction_hash: Optional[str] = None
    status: str
