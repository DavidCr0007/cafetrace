# CaféTrace IA - Capa Blockchain (Polygon PoS)

Este módulo contiene la lógica de contratos inteligentes en Solidity para la notarización inmutable de lotes agrícolas y de cadena de frío en la red **Polygon PoS (Amoy Testnet)**.

## Contrato Principal: `CafeTraceRegistry.sol`
* **Estándar:** Solidity `^0.8.20`
* **Objetivo:** Registrar criptográficamente el `dataHash` (SHA-256) de cada lote, impidiendo la alteración de datos de origen, variedad, altitud, lecturas de sensores IoT y calificaciones SCA.

## Parámetros de Red Polygon Amoy
* **Network Name:** Polygon Amoy Testnet
* **Chain ID:** 80002
* **Currency Symbol:** POL / MATIC
* **RPC URL:** `https://rpc-amoy.polygon.technology/`
* **Block Explorer:** `https://amoy.polygonscan.com/`

## Interacción con FastAPI

El backend en Python (`app/core/blockchain.py`) genera el digest determinista del lote. La notarización real solo se habilita cuando `BLOCKCHAIN_ENABLED=true` y están configurados un RPC, la dirección del contrato y una clave privada de envío en el entorno del backend.

Con Web3 configurado, el servicio firma y envía la transacción, espera las confirmaciones configuradas, persiste el hash real y verifica el digest contra el contrato. Sin esa configuración, la API no simula una prueba blockchain: la operación responde como no disponible (`503`) y el lote conserva su estado pendiente.

Endpoints relacionados:

- `POST /api/v1/batches/{batch_id}/notarize`: solicita la notarización autenticada.
- `GET /api/v1/batches/{batch_id}/verify`: verifica el digest contra el contrato.
- `GET /api/v1/batches/{batch_id}/timeline`: consulta la trazabilidad del lote.

La compilación, despliegue y verificación formal del contrato siguen siendo un requisito antes de usar una red productiva. Hasta declarar una dirección de contrato válida y verificar el artefacto desplegado, el entorno debe permanecer con `BLOCKCHAIN_ENABLED=false`.
