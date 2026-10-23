"""Atributos de trazabilidad tipados por clase de producto.

Cada esquema exige un núcleo obligatorio y admite solo los extras opcionales
declarados aquí. Las claves desconocidas se rechazan para que el hash que se
notariza en blockchain sea predecible y no dependa de datos arbitrarios.
"""

from datetime import date
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, field_validator, model_validator

from app.modules.traceability.models import ProductType


class StrictAttributes(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Coordinates(StrictAttributes):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class OriginAttributes(StrictAttributes):
    farm: str = Field(min_length=2, max_length=120)
    municipality: str = Field("Icononzo", min_length=2, max_length=80)
    department: str = Field("Tolima", min_length=2, max_length=80)
    vereda: Optional[str] = Field(None, max_length=80)
    coordinates: Optional[Coordinates] = None
    certifications: list[str] = Field(default_factory=list, max_length=10)
    notes: Optional[str] = Field(None, max_length=1000)


def _not_in_future(value: Optional[date], field: str) -> None:
    if value and value > date.today():
        raise ValueError(f"{field} no puede estar en el futuro")


class CoffeeProcess(str, Enum):
    WASHED = "washed"
    NATURAL = "natural"
    HONEY = "honey"
    ANAEROBIC = "anaerobic"


class DryingMethod(str, Enum):
    SUN_PATIO = "sun_patio"
    RAISED_BEDS = "raised_beds"
    PARABOLIC_DRYER = "parabolic_dryer"
    MECHANICAL = "mechanical"


class RoastLevel(str, Enum):
    GREEN = "green"
    LIGHT = "light"
    MEDIUM = "medium"
    MEDIUM_DARK = "medium_dark"
    DARK = "dark"


class CoffeeAttributes(OriginAttributes):
    altitude_masl: int = Field(ge=500, le=3000)
    variety: str = Field(min_length=2, max_length=80)
    harvest_started_on: date
    harvest_ended_on: date
    process: CoffeeProcess
    drying_method: DryingMethod
    drying_days: int = Field(ge=1, le=60)
    roast_level: RoastLevel

    fermentation_hours: Optional[float] = Field(None, ge=0, le=240)
    moisture_pct: Optional[float] = Field(None, ge=8, le=14)
    roast_date: Optional[date] = None
    sca_score: Optional[float] = Field(None, ge=0, le=100)
    cup_notes: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("sca_score")
    @classmethod
    def sca_one_decimal(cls, value: Optional[float]) -> Optional[float]:
        # El contrato almacena el puntaje ×10 en uint16: más precisión se perdería on-chain.
        if value is not None and abs(round(value * 10) - value * 10) > 1e-9:
            raise ValueError("sca_score admite como máximo un decimal")
        return value

    @model_validator(mode="after")
    def check_dates(self):
        if self.harvest_ended_on < self.harvest_started_on:
            raise ValueError("harvest_ended_on no puede ser anterior a harvest_started_on")
        _not_in_future(self.harvest_ended_on, "harvest_ended_on")
        if self.roast_level == RoastLevel.GREEN and self.roast_date:
            raise ValueError("Un café verde no puede tener roast_date")
        if self.roast_date:
            _not_in_future(self.roast_date, "roast_date")
            if self.roast_date < self.harvest_ended_on:
                raise ValueError("roast_date no puede ser anterior al fin de la cosecha")
        return self


class Species(str, Enum):
    BOVINE = "bovine"
    PORCINE = "porcine"
    POULTRY = "poultry"


class FeedingType(str, Enum):
    GRASS_FED = "grass_fed"
    GRAIN_FED = "grain_fed"
    MIXED = "mixed"
    FREE_RANGE = "free_range"


class RefrigerationType(str, Enum):
    CHILLED = "chilled"
    VACUUM_CHILLED = "vacuum_chilled"
    FROZEN = "frozen"


# Rangos de conservación aceptados por tipo de refrigeración (°C).
CHILLED_RANGE = (-2.0, 4.0)
FROZEN_MAX = -18.0


class MeatAttributes(OriginAttributes):
    species: Species
    animal_age_months: float = Field(gt=0, le=240)
    feeding_type: FeedingType
    refrigeration_type: RefrigerationType
    storage_temp_min_c: float = Field(ge=-40, le=10)
    storage_temp_max_c: float = Field(ge=-40, le=10)
    slaughter_date: date

    breed: Optional[str] = Field(None, max_length=80)
    live_weight_kg: Optional[float] = Field(None, gt=0, le=2000)
    carcass_weight_kg: Optional[float] = Field(None, gt=0, le=1500)
    slaughterhouse: Optional[str] = Field(None, max_length=120)
    sanitary_registry: Optional[str] = Field(None, max_length=60)
    ica_farm_registry: Optional[str] = Field(None, max_length=60)
    feed_details: Optional[str] = Field(None, max_length=300)
    withdrawal_period_respected: Optional[bool] = None
    cut: Optional[str] = Field(None, max_length=80)

    @model_validator(mode="after")
    def check_cold_chain(self):
        _not_in_future(self.slaughter_date, "slaughter_date")
        if self.storage_temp_min_c > self.storage_temp_max_c:
            raise ValueError("storage_temp_min_c no puede superar storage_temp_max_c")
        if self.refrigeration_type == RefrigerationType.FROZEN:
            if self.storage_temp_max_c > FROZEN_MAX:
                raise ValueError(f"La congelación exige una temperatura máxima ≤ {FROZEN_MAX} °C")
        elif self.storage_temp_min_c < CHILLED_RANGE[0] or self.storage_temp_max_c > CHILLED_RANGE[1]:
            raise ValueError(f"La refrigeración exige un rango entre {CHILLED_RANGE[0]} y {CHILLED_RANGE[1]} °C")
        if self.carcass_weight_kg and self.live_weight_kg and self.carcass_weight_kg > self.live_weight_kg:
            raise ValueError("carcass_weight_kg no puede superar live_weight_kg")
        return self


ATTRIBUTE_SCHEMAS: dict[ProductType, type[OriginAttributes]] = {
    ProductType.COFFEE: CoffeeAttributes,
    ProductType.MEAT: MeatAttributes,
}


def normalize_attributes(attributes: OriginAttributes) -> dict[str, Any]:
    """Forma canónica persistida y notarizada: JSON plano, sin opcionales vacíos."""
    return attributes.model_dump(mode="json", exclude_none=True)


def validate_attributes(product_type: ProductType | str, data: dict[str, Any]) -> dict[str, Any]:
    schema = ATTRIBUTE_SCHEMAS[ProductType(product_type)]
    return normalize_attributes(TypeAdapter(schema).validate_python(data))
