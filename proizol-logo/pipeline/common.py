"""Spolecne cesty a konstanty pipeline."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "source" / "proizol-dodavka.jpg"
BUILD = ROOT / "build"
DIST = ROOT / "logo"
BUILD.mkdir(exist_ok=True)
DIST.mkdir(exist_ok=True)

# Firemni barvy.
# Modra zmerena primo z polepu (#04206C v prislunenem miste) - odpovida
# temer presne Pantone 280 C, ktera je zde pouzita jako tiskovy standard.
# Cervena je barva laku dodavky, ne barva loga; slouzi jako akcent a je
# potreba ji potvrdit s klientem.
NAVY = "#012169"         # Pantone 280 C
WHITE = "#FFFFFF"
RED = "#DA291C"          # Pantone 485 C - akcent, k potvrzeni


def log(msg):
    print(f"  {msg}", file=sys.stderr)
