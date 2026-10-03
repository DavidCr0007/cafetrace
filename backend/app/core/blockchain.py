import hashlib
import json
import time
from typing import Dict, Any, Optional
from fastapi import HTTPException
from web3 import Web3
from app.core.config import settings

EXPLORER_URL_BASE = "https://amoy.polygonscan.com/tx"

CONTRACT_ABI = [
    {"inputs":[{"internalType":"uint256","name":"batchId","type":"uint256"},{"internalType":"string","name":"origin","type":"string"},{"internalType":"string","name":"variety","type":"string"},{"internalType":"uint16","name":"scaScore","type":"uint16"},{"internalType":"bytes32","name":"dataHash","type":"bytes32"}],"name":"notarizeBatch","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"batchId","type":"uint256"}],"name":"getBatch","outputs":[{"internalType":"uint256","name":"batchId","type":"uint256"},{"internalType":"address","name":"producer","type":"address"},{"internalType":"string","name":"origin","type":"string"},{"internalType":"string","name":"variety","type":"string"},{"internalType":"uint16","name":"scaScore","type":"uint16"},{"internalType":"bytes32","name":"dataHash","type":"bytes32"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bool","name":"isNotarized","type":"bool"}],"stateMutability":"view","type":"function"},
]

def compute_batch_data_hash(batch_id: int, details: Dict[str, Any], sca_score: Optional[float] = None) -> str:
    """
    Genera un hash criptográfico determinista (SHA-256) de los datos del lote.
    Este hash es el que se graba en el Smart Contract de Polygon.
    """
    payload = {
        "batch_id": batch_id,
        "details": details or {},
        "sca_score": sca_score,
    }
    # Ordenar las claves para consistencia
    serialized = json.dumps(payload, sort_keys=True, default=str)
    digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    return f"0x{digest}"

def _client():
    if not settings.BLOCKCHAIN_ENABLED or not settings.BLOCKCHAIN_RPC_URL or not settings.BLOCKCHAIN_CONTRACT_ADDRESS:
        raise HTTPException(status_code=503, detail="Blockchain no configurado: RPC, contrato y firma son obligatorios")
    if not settings.BLOCKCHAIN_PRIVATE_KEY:
        raise HTTPException(status_code=503, detail="Blockchain no configurado: falta la clave de firma del backend")
    w3 = Web3(Web3.HTTPProvider(settings.BLOCKCHAIN_RPC_URL, request_kwargs={"timeout": 15}))
    if not w3.is_connected():
        raise HTTPException(status_code=503, detail="No se pudo conectar al proveedor Web3")
    if w3.eth.chain_id != settings.BLOCKCHAIN_CHAIN_ID:
        raise HTTPException(status_code=503, detail="El chain_id del RPC no coincide con la configuración")
    return w3, w3.eth.contract(address=Web3.to_checksum_address(settings.BLOCKCHAIN_CONTRACT_ADDRESS), abi=CONTRACT_ABI)


def notarize_batch(batch_id: int, details: Dict[str, Any], sca_score: Optional[float] = None) -> Dict[str, Any]:
    """
    Construye la estructura de notarización en Polygon PoS.
    """
    data_hash = compute_batch_data_hash(batch_id, details, sca_score)
    w3, contract = _client()
    account = w3.eth.account.from_key(settings.BLOCKCHAIN_PRIVATE_KEY)
    origin = str(details.get("origin", "Icononzo, Tolima, Colombia"))
    variety = str(details.get("variety", ""))
    sca = int(round(float(sca_score or 0) * 100))
    tx = contract.functions.notarizeBatch(
        batch_id, origin, variety, sca, Web3.to_bytes(hexstr=data_hash)
    ).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address, "pending"),
        "chainId": settings.BLOCKCHAIN_CHAIN_ID,
        "gas": 250000,
        "gasPrice": w3.eth.gas_price,
    })
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=settings.BLOCKCHAIN_TX_TIMEOUT_SECONDS)
    target_block = receipt.blockNumber + max(0, settings.BLOCKCHAIN_CONFIRMATIONS - 1)
    deadline = time.monotonic() + settings.BLOCKCHAIN_TX_TIMEOUT_SECONDS
    while w3.eth.block_number < target_block and time.monotonic() < deadline:
        time.sleep(2)
    if w3.eth.block_number < target_block:
        raise HTTPException(status_code=504, detail="La transacción fue minada, pero no alcanzó las confirmaciones configuradas")
    tx_hex = tx_hash.hex()
    return {
        "network": "Polygon PoS (Amoy Testnet)",
        "chain_id": settings.BLOCKCHAIN_CHAIN_ID,
        "contract_address": settings.BLOCKCHAIN_CONTRACT_ADDRESS,
        "data_hash": data_hash,
        "transaction_hash": tx_hex,
        "explorer_url": f"{EXPLORER_URL_BASE}/{tx_hex}",
        "status": "confirmed" if receipt.status == 1 else "failed",
        "block_number": receipt.blockNumber,
        "is_immutable": receipt.status == 1,
    }


def verify_batch(batch_id: int, data_hash: str) -> Dict[str, Any]:
    w3, contract = _client()
    result = contract.functions.getBatch(batch_id).call()
    on_chain_hash = Web3.to_hex(result[5])
    return {"verified": on_chain_hash.lower() == data_hash.lower(), "on_chain_hash": on_chain_hash}
