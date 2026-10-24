#!/bin/sh
# Compileert alle scripts tegen de stub (alleen een controle op compilefouten, niet draaibaar)
cd "$(dirname "$0")/.."
mcs -target:library -nowarn:0169,0414,0649,0219,0108,0168 -langversion:latest -out:/tmp/raatstad_check.dll stub/UnityStub.cs Assets/Scripts/*.cs 2>&1 | grep -v "^$" | grep -v "warning" 
