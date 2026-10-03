### Informe de Resumen: Ecosistema Digital CaféTrace IA y Plataforma E-commerce

#### Resumen Ejecutivo

El presente documento sintetiza la estrategia, arquitectura y hoja de ruta para el desarrollo de un ecosistema digital de alto impacto que integra una plataforma B2B de trazabilidad agrícola ( **CaféTrace IA** ) con un canal de venta directa B2C (E-commerce). El objetivo central es eliminar la dependencia de intermediarios y permitir que los productores de la región del Huila accedan a mercados premium mediante la demostración digital de calidad, origen y sostenibilidad.La solución se fundamenta en cuatro pilares tecnológicos: una arquitectura de software escalable (FastAPI y Next.js), un esquema de base de datos híbrido para productos diversos (café y derivados cárnicos), trazabilidad inmutable mediante  **Blockchain**  (Polygon) e  **IoT**  (sensores ESP32/LoRa), y una capa de  **Inteligencia Artificial**  para la predicción de calidad y visión artificial. El proyecto se ejecutará bajo una metodología ágil de seis Sprints, con una fecha de entrega final programada para mediados de octubre.

#### 1\. Alineación Estratégica y Modelos de Negocio

El proyecto representa una evolución desde una plataforma estrictamente orientada a la exportación hacia un modelo híbrido que abarca toda la cadena de valor.

* **CaféTrace IA (B2B):**  Orientada a cooperativas y exportadores para la certificación automatizada, cumplimiento de normativas internacionales (como las de la Unión Europea) y gestión de reportes ESG (Ambientales, Sociales y de Gobernanza).  
* **E-commerce Florida (B2C):**  Aplicativo para la venta directa de café, chorizos y productos derivados. Este modelo busca capturar el valor económico de la "premiumización", donde el café certificado puede alcanzar precios de hasta 180,000 COP por kilogramo, frente a los 40,000 COP del mercado convencional.

##### Diferenciación por Producto

El sistema debe gestionar variables logísticas y técnicas críticas según la naturaleza del producto:| Producto | Características Clave | Requerimientos de Trazabilidad || \------ | \------ | \------ || **Café** | No perecedero a corto plazo. | Altitud, variedad, método de beneficio, humedad y score SCA. || **Chorizos/Cárnicos** | Perecederos, requieren cadena de frío. | Registros sanitarios, origen de la carne, fechas de caducidad y monitoreo térmico constante. |

#### 2\. Arquitectura Técnica y Ecosistema Digital

Para garantizar la escalabilidad y el rendimiento (SEO para la tienda y captura de datos en campo), se ha definido una estructura modular:

* **Frontend:**  Uso de  **Next.js**  para la plataforma web (E-commerce y panel administrativo) y  **React Native**  para la aplicación móvil con capacidades  *offline-first* .  
* **Backend:**  Desarrollo en  **Python con FastAPI** , permitiendo una integración nativa con librerías de Machine Learning y una gestión eficiente de peticiones concurrentes.  
* **Base de Datos Híbrida (PostgreSQL \+ JSONB):**  Se utiliza PostgreSQL para el núcleo relacional (usuarios, pedidos) y columnas JSONB para atributos dinámicos, permitiendo que un producto de café tenga esquemas técnicos diferentes a un producto cárnico sin alterar la estructura base.  
* **Infraestructura Cloud:**  Despliegue en contenedores gestionados con pipelines de CI/CD para automatizar actualizaciones.

#### 3\. Trazabilidad de Alto Impacto: IoT y Blockchain

El factor innovador del proyecto radica en convertir cada lote en un activo digital verificable e inmutable.

##### Componentes de Hardware (IoT)

La recolección de datos físicos se automatiza mediante nodos de sensores adaptados al entorno rural:

* **Microcontroladores:**  ESP32 (familia Heltec o TTGO) con conectividad  **LoRa**  para transmisión a larga distancia en zonas sin cobertura celular.  
* **Sensores:**  Sondas térmicas DS18B20 para fermentación y cadena de frío, sensores BME280 para microclima y pluviómetros de balancín.  
* **Energía:**  Sistemas autónomos con paneles solares y controladores MPPT para nodos de cultivo.

##### Registro Inmutable (Blockchain)

Para generar confianza absoluta en el consumidor, los datos críticos (origen, variables IoT y certificados) se registran en un  **Smart Contract**  en la red  **Polygon PoS** . El consumidor final, al escanear un  **QR Dinámico**  en el empaque, accede a un perfil público de trazabilidad cuya integridad está garantizada criptográficamente.

#### 4\. Capa de Inteligencia Artificial y Analítica

La plataforma utiliza IA no solo como registro, sino como herramienta predictiva:

1. **Predicción de Calidad:**  Modelos supervisados (XGBoost/Scikit-learn) que estiman el score de taza basándose en variables de altitud, humedad y fermentación.  
2. **Visión Artificial:**  Redes neuronales convolucionales (CNN) para detectar defectos en los granos de café o estandarización en productos cárnicos mediante fotografías.  
3. **NLP Conversacional:**  Asistente inteligente para brindar soporte técnico y recomendaciones operativas a los productores.

#### 5\. Plan de Ejecución (Cronograma de Sprints)

El desarrollo se estructura en un ciclo intensivo para alcanzar el MVP (Producto Mínimo Viable) en octubre:| Sprint | Enfoque | Entregables Clave || \------ | \------ | \------ || **1** | Documentación y Arquitectura | Diagramas C4, Modelo Entidad-Relación, Especificación OpenAPI. || **2** | Backend Core y Base de Datos | API REST funcional, esquemas JSONB, autenticación. || **3** | IoT y Blockchain | Firmware ESP32, despliegue de Smart Contract en red de pruebas. || **4** | Frontend E-commerce y App | Tienda Next.js, catálogo dinámico, generador de QR. || **5** | Integración de IA y Analítica | Modelos predictivos operativos, dashboard de métricas. || **6** | QA, Testing y Despliegue | Pruebas de carga, auditoría de seguridad, paso a producción. |

#### 6\. Diagnóstico de Riesgos y Mitigación

* **Conectividad Rural:**  Mitigado mediante arquitectura  *offline-first*  y uso de tecnología LoRa para telemetría.  
* **Adopción Tecnológica:**  Mitigado a través de interfaces simplificadas (tipo WhatsApp) y capacitación constante.  
* **Integridad de Datos:**  Mitigado mediante georreferenciación obligatoria, marcas de tiempo y el registro inmutable en Blockchain.

#### 7\. Conclusión del Proyecto

CaféTrace IA y su extensión e-commerce representan la transformación de la producción tradicional en una ventaja competitiva digital. Al integrar hardware, blockchain e inteligencia artificial, la plataforma no solo facilita la venta, sino que construye un ecosistema de confianza y sostenibilidad que responde a las exigencias de transparencia de los mercados internacionales más exigentes.  
