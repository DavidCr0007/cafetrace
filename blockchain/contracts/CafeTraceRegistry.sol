// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CafeTraceRegistry
 * @dev Registro inmutable de trazabilidad agrícola y certificación de calidad en Polygon PoS.
 * Permite a cooperativas y productores notarizar lotes de café especial y cárnicos.
 */
contract CafeTraceRegistry {
    address public owner;

    struct BatchRecord {
        uint256 batchId;
        address producer;
        string origin;
        string variety;
        uint16 scaScore; // Multiplicado por 10 (ej: 885 para 88.5 SCA)
        bytes32 dataHash; // Hash SHA-256 de los datos y telemetría IoT del lote
        uint256 timestamp;
        bool isNotarized;
    }

    // Mapeo de Batch ID a Registro Notarizado
    mapping(uint256 => BatchRecord) public batches;
    
    // Lista de IDs registrados
    uint256[] public batchIds;

    // Control de acceso para productores autorizados
    mapping(address => bool) public authorizedProducers;

    event BatchNotarized(
        uint256 indexed batchId,
        address indexed producer,
        bytes32 dataHash,
        uint16 scaScore,
        uint256 timestamp
    );

    event ProducerAuthorized(address indexed producer);
    event ProducerRevoked(address indexed producer);

    modifier onlyOwner() {
        require(msg.sender == owner, "CafeTraceRegistry: Solo el propietario puede ejecutar esto");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedProducers[msg.sender],
            "CafeTraceRegistry: Productor no autorizado para notarizar"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedProducers[msg.sender] = true;
    }

    /**
     * @dev Autoriza a una cooperativa o productor para registrar lotes.
     */
    function setProducerAuthorization(address producer, bool status) external onlyOwner {
        authorizedProducers[producer] = status;
        if (status) {
            emit ProducerAuthorized(producer);
        } else {
            emit ProducerRevoked(producer);
        }
    }

    /**
     * @dev Notariza un lote de producción de manera inmutable.
     */
    function notarizeBatch(
        uint256 batchId,
        string calldata origin,
        string calldata variety,
        uint16 scaScore,
        bytes32 dataHash
    ) external onlyAuthorized {
        require(!batches[batchId].isNotarized, "CafeTraceRegistry: El lote ya fue notarizado previamente");
        require(dataHash != bytes32(0), "CafeTraceRegistry: El hash de datos no puede ser vacio");

        batches[batchId] = BatchRecord({
            batchId: batchId,
            producer: msg.sender,
            origin: origin,
            variety: variety,
            scaScore: scaScore,
            dataHash: dataHash,
            timestamp: block.timestamp,
            isNotarized: true
        });

        batchIds.push(batchId);

        emit BatchNotarized(batchId, msg.sender, dataHash, scaScore, block.timestamp);
    }

    /**
     * @dev Verifica la integridad criptográfica de un lote contra un hash esperado.
     */
    function verifyBatchIntegrity(uint256 batchId, bytes32 expectedHash) external view returns (bool isValid, uint256 notarizedAt) {
        require(batches[batchId].isNotarized, "CafeTraceRegistry: Lote no registrado");
        BatchRecord memory record = batches[batchId];
        return (record.dataHash == expectedHash, record.timestamp);
    }

    /**
     * @dev Obtiene el registro completo de un lote.
     */
    function getBatch(uint256 batchId) external view returns (BatchRecord memory) {
        require(batches[batchId].isNotarized, "CafeTraceRegistry: Lote no encontrado");
        return batches[batchId];
    }

    /**
     * @dev Retorna la cantidad total de lotes notarizados.
     */
    function getTotalBatches() external view returns (uint256) {
        return batchIds.length;
    }
}
